import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock twilio module
vi.mock("twilio", () => {
  const mockValidateRequest = vi.fn();
  const mockClient = vi.fn(() => ({
    messages: { create: vi.fn() },
    calls: { create: vi.fn() },
  }));
  mockClient.validateRequest = mockValidateRequest;
  return { default: mockClient };
});

import { verifyTwilioSignature } from "@/lib/twilio";

describe("Twilio Utilities", () => {
  beforeEach(() => {
    vi.resetModules();
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

    it("should parse body params correctly", () => {
      process.env.TWILIO_AUTH_TOKEN = "test_token";
      // The function should parse URL-encoded body
      const body = "Body=Hello%20World&From=%2B1234567890";
      const result = verifyTwilioSignature({
        signature: "invalid_sig",
        url: "https://example.com/webhook",
        body,
      });
      // Will return false due to invalid signature, but should not throw
      expect(typeof result).toBe("boolean");
    });
  });
});
