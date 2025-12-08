import { z } from "zod";

// Sanitize text to prevent XSS
export function sanitizeText(input: string): string {
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

// Remove any script tags or event handlers
export function sanitizeHtml(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .replace(/javascript:/gi, "");
}

// Validate and constrain message length
export const messageSchema = z
  .string()
  .min(1, "message is required")
  .max(2000, "Message too long (max 2000 chars)")
  .transform((s) => s.trim());

// Validate session ID format (UUID)
export const sessionIdSchema = z
  .string()
  .uuid("Invalid session ID format")
  .optional();

// Phone number validation (E.164 format)
export const phoneSchema = z
  .string()
  .regex(/^\+[1-9]\d{1,14}$/, "Invalid phone number format");

// ZIP code validation
export const zipSchema = z
  .string()
  .regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP code format");

// Quote assistant request schema
export const quoteAssistantRequestSchema = z.object({
  message: messageSchema,
  sessionId: sessionIdSchema,
});

// Rate limit error response
export function rateLimitResponse(resetAt: number) {
  return new Response(
    JSON.stringify({
      error: "Too many requests",
      retryAfter: Math.ceil((resetAt - Date.now()) / 1000),
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)),
      },
    }
  );
}
