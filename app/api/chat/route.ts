import { configs, stellarAgent } from "@/lib/agent";
import { ChatMessage } from "@langchain/core/messages";

export async function POST(req: Request) {
  try {
    const { messages } = (await req.json()) as { messages: ChatMessage[] };

    if (!messages || !Array.isArray(messages)) {
      return new Response("Invalid messages format", { status: 400 });
    }

    const stream = await stellarAgent.stream(
      { messages },
      { ...configs, streamMode: "values" }
    );

    const readableStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of stream) {
            const latestMessage = chunk.messages.at(-1);
            if (latestMessage?.content) {
              controller.enqueue(
                encoder.encode(
                  JSON.stringify({
                    type: "message",
                    content: latestMessage.content,
                  }) + "\n"
                )
              );
            } else if (latestMessage?.tool_calls?.length) {
              const toolCallNames = latestMessage.tool_calls.map(
                (tc) => tc.name
              );
              controller.enqueue(
                encoder.encode(
                  JSON.stringify({ type: "tool_call", tools: toolCallNames }) +
                    "\n"
                )
              );
            }
          }
        } catch (err) {
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                type: "error",
                message: err instanceof Error ? err.message : "Unknown error",
              }) + "\n"
            )
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
    console.log(error?.errorResponse);
    return new Response(
      JSON.stringify({
        type: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
