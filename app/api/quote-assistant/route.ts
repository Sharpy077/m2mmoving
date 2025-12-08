import { NextResponse } from "next/server";
import { runTurn } from "@/lib/ai-orchestrator";
import { checkRateLimit, getRateLimitKey } from "@/lib/rate-limit";
import {
  quoteAssistantRequestSchema,
  rateLimitResponse,
  sanitizeText,
} from "@/lib/validation";

export async function POST(req: Request) {
  // Rate limiting
  const rateLimitKey = getRateLimitKey(req);
  const { allowed, remaining, resetAt } = checkRateLimit(rateLimitKey, {
    windowMs: 60_000,
    maxRequests: 20,
  });

  if (!allowed) {
    return rateLimitResponse(resetAt);
  }

  try {
    const body = await req.json();

    // Validate input
    const parsed = quoteAssistantRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    const { message, sessionId } = parsed.data;

    // Sanitize message
    const sanitized = sanitizeText(message);

    const result = await runTurn({ message: sanitized, sessionId });

    return NextResponse.json(result, {
      headers: {
        "X-RateLimit-Remaining": String(remaining),
        "X-RateLimit-Reset": String(resetAt),
      },
    });
  } catch (error: unknown) {
    console.error("quote-assistant error", error);
    return NextResponse.json(
      { error: "Failed to generate reply" },
      { status: 500 }
    );
  }
}
