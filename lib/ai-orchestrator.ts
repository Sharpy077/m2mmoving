import OpenAI from "openai";
import { SYSTEM_PROMPT, MODEL } from "./ai-config";
import { tools } from "./ai-tools";
import {
  appendMessage,
  createSessionId,
  getHistory,
  ChatMessage,
} from "./conversation-state";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function mapHistory(history: ChatMessage[]) {
  return history.map((m) => {
    if (m.role === "tool") {
      return {
        role: "tool" as const,
        content: m.content,
        tool_call_id: m.toolCallId,
        name: m.name,
      } satisfies OpenAI.Chat.Completions.ChatCompletionMessageParam;
    }
    return { role: m.role, content: m.content } as OpenAI.Chat.Completions.ChatCompletionMessageParam;
  });
}

function buildToolSchema() {
  return Object.values(tools).map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.schema,
    },
  }));
}

export async function runTurn({
  message,
  sessionId,
}: {
  message: string;
  sessionId?: string;
}): Promise<{ reply: string; sessionId: string }> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const sid = sessionId ?? createSessionId();
  const history = getHistory(sid);

  const baseMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...mapHistory(history),
    { role: "user", content: message },
  ];

  const toolDefs = buildToolSchema();

  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: baseMessages,
    tools: toolDefs,
    tool_choice: "auto",
  });

  const choice = completion.choices[0];
  const msg = choice.message;

  if (msg.tool_calls && msg.tool_calls.length > 0) {
    const call = msg.tool_calls[0];
    const tool = tools[call.function.name as keyof typeof tools];
    if (!tool) {
      throw new Error(`Unknown tool ${call.function.name}`);
    }

    const parsed = tool.validator.parse(
      call.function.arguments ? JSON.parse(call.function.arguments) : {}
    );

    appendMessage(sid, {
      role: "assistant",
      content: msg.content ?? "",
      toolCallId: call.id,
      createdAt: Date.now(),
    });

    const result = await tool.handler(parsed as never);

    const toolMessage: OpenAI.Chat.Completions.ChatCompletionMessageParam = {
      role: "tool",
      tool_call_id: call.id,
      name: tool.name,
      content: JSON.stringify(result),
    };

    appendMessage(sid, {
      role: "tool",
      content: JSON.stringify(result),
      name: tool.name,
      toolCallId: call.id,
      createdAt: Date.now(),
    });

    const completion2 = await client.chat.completions.create({
      model: MODEL,
      messages: [...baseMessages, msg, toolMessage],
    });

    const final = completion2.choices[0].message;

    appendMessage(sid, {
      role: "assistant",
      content: final.content ?? "",
      createdAt: Date.now(),
    });

    return { reply: final.content ?? "", sessionId: sid };
  }

  appendMessage(sid, {
    role: "assistant",
    content: msg.content ?? "",
    createdAt: Date.now(),
  });

  return { reply: msg.content ?? "", sessionId: sid };
}
