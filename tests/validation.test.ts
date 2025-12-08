import { describe, it, expect } from "vitest";
import {
  sanitizeText,
  sanitizeHtml,
  messageSchema,
  sessionIdSchema,
  phoneSchema,
  zipSchema,
  quoteAssistantRequestSchema,
} from "@/lib/validation";

describe("Validation Utilities", () => {
  describe("sanitizeText", () => {
    it("should escape HTML entities", () => {
      expect(sanitizeText("<script>alert('xss')</script>")).toBe(
        "&lt;script&gt;alert(&#x27;xss&#x27;)&lt;&#x2F;script&gt;"
      );
    });

    it("should escape quotes", () => {
      expect(sanitizeText('Hello "world"')).toBe("Hello &quot;world&quot;");
    });

    it("should handle normal text", () => {
      expect(sanitizeText("Hello world")).toBe("Hello world");
    });
  });

  describe("sanitizeHtml", () => {
    it("should remove script tags", () => {
      expect(sanitizeHtml("<script>evil()</script>safe")).toBe("safe");
    });

    it("should remove event handlers", () => {
      expect(sanitizeHtml('<div onclick="evil()">text</div>')).toBe(
        '<div "evil()">text</div>'
      );
    });

    it("should remove javascript: URLs", () => {
      expect(sanitizeHtml('href="javascript:alert(1)"')).toBe(
        'href="alert(1)"'
      );
    });
  });

  describe("messageSchema", () => {
    it("should accept valid message", () => {
      const result = messageSchema.safeParse("Hello, I need a quote");
      expect(result.success).toBe(true);
    });

    it("should reject empty message", () => {
      const result = messageSchema.safeParse("");
      expect(result.success).toBe(false);
    });

    it("should reject too long message", () => {
      const result = messageSchema.safeParse("x".repeat(2001));
      expect(result.success).toBe(false);
    });

    it("should trim whitespace", () => {
      const result = messageSchema.safeParse("  hello  ");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("hello");
      }
    });
  });

  describe("sessionIdSchema", () => {
    it("should accept valid UUID", () => {
      const result = sessionIdSchema.safeParse(
        "123e4567-e89b-12d3-a456-426614174000"
      );
      expect(result.success).toBe(true);
    });

    it("should accept undefined", () => {
      const result = sessionIdSchema.safeParse(undefined);
      expect(result.success).toBe(true);
    });

    it("should reject invalid UUID", () => {
      const result = sessionIdSchema.safeParse("not-a-uuid");
      expect(result.success).toBe(false);
    });
  });

  describe("phoneSchema", () => {
    it("should accept E.164 format", () => {
      expect(phoneSchema.safeParse("+14155551234").success).toBe(true);
      expect(phoneSchema.safeParse("+61412345678").success).toBe(true);
    });

    it("should reject non-E.164 format", () => {
      expect(phoneSchema.safeParse("4155551234").success).toBe(false);
      expect(phoneSchema.safeParse("(415) 555-1234").success).toBe(false);
    });
  });

  describe("zipSchema", () => {
    it("should accept 5-digit ZIP", () => {
      expect(zipSchema.safeParse("94105").success).toBe(true);
    });

    it("should accept ZIP+4", () => {
      expect(zipSchema.safeParse("94105-1234").success).toBe(true);
    });

    it("should reject invalid ZIP", () => {
      expect(zipSchema.safeParse("9410").success).toBe(false);
      expect(zipSchema.safeParse("ABCDE").success).toBe(false);
    });
  });

  describe("quoteAssistantRequestSchema", () => {
    it("should accept valid request", () => {
      const result = quoteAssistantRequestSchema.safeParse({
        message: "I need a quote",
        sessionId: "123e4567-e89b-12d3-a456-426614174000",
      });
      expect(result.success).toBe(true);
    });

    it("should accept request without sessionId", () => {
      const result = quoteAssistantRequestSchema.safeParse({
        message: "I need a quote",
      });
      expect(result.success).toBe(true);
    });

    it("should reject missing message", () => {
      const result = quoteAssistantRequestSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });
});
