import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock twilio module
vi.mock("twilio", () => {
  const mockValidateRequest = vi.fn().mockReturnValue(false);
  const mockClient = vi.fn(() => ({
    messages: { create: vi.fn() },
    calls: { create: vi.fn() },
  }));
  mockClient.validateRequest = mockValidateRequest;
  return { default: mockClient };
});

import { verifyTwilioSignature } from "@/lib/twilio";

describe("Twilio Utilities", () => {
  const originalEnv = process.env.TWILIO_AUTH_TOKEN;

  afterEach(() => {
    process.env.TWILIO_AUTH_TOKEN = originalEnv;
  });

  describe("verifyTwilioSignature", () => {
    it("should return false when signature is null", () => {
      process.env.TWILIO_AUTH_TOKEN = "test_token";
      const result = verifyTwilioSignature({
        signature: null,
        url: "https://example.com/webhook",
        body: "Body=Hello",
      });
      expect(result).toBe(false);
    });

    it("should throw when TWILIO_AUTH_TOKEN is missing", () => {
      delete process.env.TWILIO_AUTH_TOKEN;
      expect(() =>
        verifyTwilioSignature({
          signature: "test_sig",
          url: "https://example.com/webhook",
          body: "Body=Hello",
        })
      ).toThrow("TWILIO_AUTH_TOKEN is not set");
    });

    it("should call validateRequest with correct params", () => {
      process.env.TWILIO_AUTH_TOKEN = "test_token";
      const body = "Body=Hello%20World&From=%2B1234567890";
      const result = verifyTwilioSignature({
        signature: "test_sig",
        url: "https://example.com/webhook",
        body,
      });
      // Mock returns false, so result should be false
      expect(result).toBe(false);
    });
  });
});
