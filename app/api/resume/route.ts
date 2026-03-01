import { stellarAgent } from "@/lib/agent";
import { Command } from "@langchain/langgraph";

export async function POST(req: Request) {
  try {
    const { threadId, decision } = (await req.json()) as {
      threadId: string;
      decision: "approve" | "reject";
    };

    if (!threadId || !decision) {
      return new Response("Missing threadId or decision", { status: 400 });
    }

    const config = {
      configurable: { thread_id: threadId },
      streamMode: "values" as const,
    };

    // Resume the interrupted graph by passing the decision as the interrupt value
    const stream = await stellarAgent.stream(
      new Command({ resume: decision }),
      config,
    );

    const readableStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of stream) {
            const latestMessage = chunk.messages.at(-1);
            if (latestMessage?._getType?.() !== "ai") continue;

            if (latestMessage?.content) {
              controller.enqueue(
                encoder.encode(
                  JSON.stringify({
                    type: "message",
                    content: latestMessage.content,
                  }) + "\n",
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
    console.error("Resume API error:", error);
    return new Response(
      JSON.stringify({
        type: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
