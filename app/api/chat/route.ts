import { clientPromise, configs, stellarAgent } from "@/lib/agent";
import { ChatMessage } from "@langchain/core/messages";

export async function POST(req: Request) {
  try {
    const { messages, threadId } = (await req.json()) as {
      messages: { role: string; content: string }[];
      threadId?: string;
    };

    if (!messages || !Array.isArray(messages)) {
      return new Response("Invalid messages format", { status: 400 });
    }

    const config = {
      configurable: {
        thread_id: threadId ?? configs.configurable.thread_id,
      },
      streamMode: "values" as const,
    };

    // Only send the latest user message — checkpointer handles history
    const latestUserMessage = messages.at(-1);
    if (!latestUserMessage) {
      return new Response("No messages provided", { status: 400 });
    }

    await clientPromise;
    const stream = await stellarAgent.stream(
      { messages: [latestUserMessage] },
      config,
    );

    const readableStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let lastEmittedId: string | undefined;

        try {
          for await (const chunk of stream) {
            if (chunk.__interrupt__) {
              const interruptData = chunk.__interrupt__[0].value;
              controller.enqueue(
                encoder.encode(
                  JSON.stringify({
                    type: "interrupt",
                    threadId: config.configurable.thread_id,
                    ...(interruptData as any),
                  }) + "\n",
                ),
              );
              continue;
            }

            if (!chunk.messages?.length) continue;

            const latestMessage = chunk.messages.at(-1);
            if (latestMessage?._getType?.() !== "ai") continue;

            // Skip if we already emitted this exact message
            if (latestMessage.id && latestMessage.id === lastEmittedId)
              continue;
            lastEmittedId = latestMessage.id;

            if (latestMessage?.content) {
              controller.enqueue(
                encoder.encode(
                  JSON.stringify({
                    type: "message",
                    content: latestMessage.content,
                  }) + "\n",
                ),
              );
            } else if (latestMessage?.tool_calls?.length) {
              const toolCallNames = latestMessage.tool_calls.map(
                (tc) => tc.name,
              );
              controller.enqueue(
                encoder.encode(
                  JSON.stringify({ type: "tool_call", tools: toolCallNames }) +
                    "\n",
                ),
              );
            }
          }
        } catch (err) {
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                type: "error",
                message: err instanceof Error ? err.message : "Unknown error",
              }) + "\n",
            ),
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({
        type: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
