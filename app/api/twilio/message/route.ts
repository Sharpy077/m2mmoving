import { runTurn } from "@/lib/ai-orchestrator";
import { verifyTwilioSignature } from "@/lib/twilio";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanitizeText } from "@/lib/validation";

function twiml(body: string) {
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

function escapeXml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function resolveWebhookUrl(reqUrl: string) {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return `${configured.replace(/\/$/, "")}/api/twilio/message`;
  const url = new URL(reqUrl);
  return `${url.origin}${url.pathname}`;
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-twilio-signature");
  const webhookUrl = resolveWebhookUrl(req.url);

  // Verify Twilio signature
  const verified = verifyTwilioSignature({ signature, url: webhookUrl, body: rawBody });
  if (!verified) {
    return new Response("invalid signature", { status: 401 });
  }

  const params = Object.fromEntries(new URLSearchParams(rawBody));
  const from = (params["From"] as string | undefined)?.trim();

  // Rate limit by phone number
  if (from) {
    const { allowed } = checkRateLimit(`twilio:sms:${from}`, {
      windowMs: 60_000,
      maxRequests: 10,
    });
    if (!allowed) {
      return twiml(
        `<?xml version="1.0" encoding="UTF-8"?>\n<Response><Message>Too many messages. Please wait a moment and try again.</Message></Response>`
      );
    }
  }

  const body = (params["Body"] as string | undefined)?.trim();

  if (!body) {
    return twiml(
      `<?xml version="1.0" encoding="UTF-8"?>\n<Response><Message>Send a message with your move date and zip codes to start.</Message></Response>`
    );
  }

  try {
    // Sanitize input
    const sanitized = sanitizeText(body);
    const ai = await runTurn({ message: sanitized, sessionId: from });
    const reply = escapeXml(ai.reply || "Thanks! We'll follow up shortly.");
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response><Message>${reply}</Message></Response>`;
    return twiml(xml);
  } catch (error) {
    console.error("message handler failed", error);
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response><Message>Sorry, something went wrong. A human will follow up.</Message></Response>`;
    return twiml(xml);
  }
}
