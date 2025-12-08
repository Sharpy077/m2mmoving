import { runTurn } from "@/lib/ai-orchestrator";
import { verifyTwilioSignature } from "@/lib/twilio";

function twiml(body: string) {
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
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

  const verified = verifyTwilioSignature({ signature, url: webhookUrl, body: rawBody });
  if (!verified) {
    return new Response("invalid signature", { status: 401 });
  }

  const params = Object.fromEntries(new URLSearchParams(rawBody));
  const body = (params["Body"] as string | undefined)?.trim();
  const from = (params["From"] as string | undefined)?.trim();

  if (!body) {
    return twiml(`<?xml version="1.0" encoding="UTF-8"?>\n<Response><Message>Send a message with your move date and zip codes to start.</Message></Response>`);
  }

  try {
    const ai = await runTurn({ message: body, sessionId: from });
    const reply = ai.reply || "Thanks! We'll follow up shortly.";
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response><Message>${reply}</Message></Response>`;
    return twiml(xml);
  } catch (error) {
    console.error("message handler failed", error);
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response><Message>Sorry, something went wrong. A human will follow up.</Message></Response>`;
    return twiml(xml);
  }
}
