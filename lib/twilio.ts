import twilio from "twilio";

export function getTwilioClient() {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    throw new Error("Twilio credentials are missing");
  }
  return twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

export function verifyTwilioSignature({
  signature,
  url,
  body,
}: {
  signature: string | null;
  url: string;
  body: string;
}) {
  const { TWILIO_AUTH_TOKEN } = process.env;
  if (!TWILIO_AUTH_TOKEN) {
    throw new Error("TWILIO_AUTH_TOKEN is not set");
  }
  if (!signature) return false;
  const params = Object.fromEntries(new URLSearchParams(body));
  return twilio.validateRequest(TWILIO_AUTH_TOKEN, signature, url, params);
}
