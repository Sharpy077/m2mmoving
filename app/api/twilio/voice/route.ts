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
  if (configured) return `${configured.replace(/\/$/, "")}/api/twilio/voice`;
  const url = new URL(reqUrl);
  return `${url.origin}${url.pathname}`;
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-twilio-signature");
  const webhookUrl = resolveWebhookUrl(req.url);

  // Verify Twilio signature
  const verified = verifyTwilioSignature({
    signature,
    url: webhookUrl,
    body: rawBody,
  });

  if (!verified) {
    return new Response("invalid signature", { status: 401 });
  }

  const params = Object.fromEntries(new URLSearchParams(rawBody));
  const callSid = (params["CallSid"] as string | undefined) ?? undefined;
  const from = (params["From"] as string | undefined)?.trim();

  // Rate limit by caller phone number
  if (from) {
    const { allowed } = checkRateLimit(`twilio:voice:${from}`, {
      windowMs: 60_000,
      maxRequests: 30, // Higher limit for voice (multiple turns per call)
    });
    if (!allowed) {
      const response = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>We're receiving too many calls from this number. Please try again later.</Say>
  <Hangup />
</Response>`;
      return twiml(response);
    }
  }

  const speech = (params["SpeechResult"] as string | undefined)?.trim();
  const digits = (params["Digits"] as string | undefined)?.trim();
  const userInput = speech || digits;

  // Initial greeting if no input
  if (!userInput) {
    const response = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Thanks for calling M2M Moving. Please tell me your move date and pickup zip code after the tone.</Say>
  <Gather input="speech" speechTimeout="auto" action="/api/twilio/voice" method="POST" />
</Response>`;
    return twiml(response);
  }

  try {
    // Sanitize input
    const sanitized = sanitizeText(userInput);
    const ai = await runTurn({ message: sanitized, sessionId: callSid });
    const reply = escapeXml(ai.reply || "Thanks, we will follow up shortly.");

    const response = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>${reply}</Say>
  <Gather input="speech" speechTimeout="auto" action="/api/twilio/voice" method="POST" />
</Response>`;
    return twiml(response);
  } catch (error) {
    console.error("voice handler failed", error);
    const response = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Sorry, we hit a snag. A human will follow up shortly.</Say>
  <Hangup />
</Response>`;
    return twiml(response);
  }
}
