import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the AI orchestrator
vi.mock("@/lib/ai-orchestrator", () => ({
  runTurn: vi.fn().mockResolvedValue({
    reply: "Test response",
    sessionId: "test-session-123",
  }),
}));

// Mock Twilio verification
vi.mock("@/lib/twilio", () => ({
  verifyTwilioSignature: vi.fn().mockReturnValue(true),
  getTwilioClient: vi.fn(),
}));

describe("API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/quote-assistant", () => {
    it("should require message in body", async () => {
      const { POST } = await import("@/app/api/quote-assistant/route");

      const req = new Request("http://localhost/api/quote-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error).toBe("message is required");
    });

    it("should return AI response with sessionId", async () => {
      const { POST } = await import("@/app/api/quote-assistant/route");

      const req = new Request("http://localhost/api/quote-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "I need a quote" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.reply).toBe("Test response");
      expect(json.sessionId).toBe("test-session-123");
    });

    it("should pass existing sessionId to orchestrator", async () => {
      const { runTurn } = await import("@/lib/ai-orchestrator");
      const { POST } = await import("@/app/api/quote-assistant/route");

      const req = new Request("http://localhost/api/quote-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Follow up",
          sessionId: "existing-session",
        }),
      });

      await POST(req);
      expect(runTurn).toHaveBeenCalledWith({
        message: "Follow up",
        sessionId: "existing-session",
      });
    });
  });

  describe("GET /api/health", () => {
    it("should return ok status", async () => {
      const { GET } = await import("@/app/api/health/route");
      const res = GET();
      const json = await res.json();
      expect(json.status).toBe("ok");
    });
  });

  describe("POST /api/twilio/message", () => {
    it("should reject invalid signature", async () => {
      const { verifyTwilioSignature } = await import("@/lib/twilio");
      vi.mocked(verifyTwilioSignature).mockReturnValue(false);

      const { POST } = await import("@/app/api/twilio/message/route");

      const req = new Request("http://localhost/api/twilio/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "x-twilio-signature": "invalid",
        },
        body: "Body=Hello&From=%2B1234567890",
      });

      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("should return TwiML response for valid request", async () => {
      const { verifyTwilioSignature } = await import("@/lib/twilio");
      vi.mocked(verifyTwilioSignature).mockReturnValue(true);

      const { POST } = await import("@/app/api/twilio/message/route");

      const req = new Request("http://localhost/api/twilio/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "x-twilio-signature": "valid",
        },
        body: "Body=Hello&From=%2B1234567890",
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("text/xml");

      const xml = await res.text();
      expect(xml).toContain("<Response>");
      expect(xml).toContain("<Message>");
    });
  });

  describe("POST /api/twilio/voice", () => {
    it("should reject invalid signature", async () => {
      const { verifyTwilioSignature } = await import("@/lib/twilio");
      vi.mocked(verifyTwilioSignature).mockReturnValue(false);

      const { POST } = await import("@/app/api/twilio/voice/route");

      const req = new Request("http://localhost/api/twilio/voice", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "x-twilio-signature": "invalid",
        },
        body: "CallSid=CA123",
      });

      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("should return initial greeting when no speech input", async () => {
      const { verifyTwilioSignature } = await import("@/lib/twilio");
      vi.mocked(verifyTwilioSignature).mockReturnValue(true);

      const { POST } = await import("@/app/api/twilio/voice/route");

      const req = new Request("http://localhost/api/twilio/voice", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "x-twilio-signature": "valid",
        },
        body: "CallSid=CA123",
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const xml = await res.text();
      expect(xml).toContain("<Say>");
      expect(xml).toContain("<Gather");
      expect(xml).toContain("M2M Moving");
    });

    it("should process speech input through AI", async () => {
      const { verifyTwilioSignature } = await import("@/lib/twilio");
      vi.mocked(verifyTwilioSignature).mockReturnValue(true);

      const { POST } = await import("@/app/api/twilio/voice/route");

      const req = new Request("http://localhost/api/twilio/voice", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "x-twilio-signature": "valid",
        },
        body: "CallSid=CA123&SpeechResult=I%20need%20to%20move%20next%20week",
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const xml = await res.text();
      expect(xml).toContain("Test response");
    });
  });
});
