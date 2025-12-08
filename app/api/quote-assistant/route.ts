import { NextResponse } from "next/server";
import { runTurn } from "@/lib/ai-orchestrator";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = (body?.message as string | undefined)?.trim();
    const sessionId = body?.sessionId as string | undefined;

    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const result = await runTurn({ message, sessionId });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("quote-assistant error", error);
    return NextResponse.json({ error: "failed to generate reply" }, { status: 500 });
  }
}
