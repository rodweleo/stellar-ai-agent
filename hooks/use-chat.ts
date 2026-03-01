"use client";

import { useState, useCallback, useRef } from "react";
import { PendingTransaction } from "@/components/transaction-approval-dialog";

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [pendingTx, setPendingTx] = useState<PendingTransaction | null>(null);
  const threadId = useRef<string>(crypto.randomUUID());

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value),
    [],
  );

  const readStream = useCallback(
    async (response: Response, assistantId: string) => {
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line);

          if (event.type === "interrupt") {
            // Graph paused — show approval dialog
            console.log(event);
            setPendingTx({
              xdr: event.xdr,
              threadId: event.threadId,
              details: event.actionRequests[0].args,
            });
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: "⏳ Waiting for your approval..." }
                  : m,
              ),
            );
          } else if (event.type === "message") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: event.content } : m,
              ),
            );
          } else if (event.type === "tool_call") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      content: `🔧 Calling: ${event.tools.join(", ")}...`,
                    }
                  : m,
              ),
            );
          } else if (event.type === "error") {
            throw new Error(event.message);
          }
        }
      }
    },
    [],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || isLoading) return;

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: input,
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsLoading(true);
      setError(null);

      const assistantId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "" },
      ]);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            threadId: threadId.current,
            messages: [...messages, userMessage].map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });

        if (!response.ok) throw new Error(`Request failed: ${response.status}`);
        await readStream(response, assistantId);
      } catch (err) {
        const e = err instanceof Error ? err : new Error("Unknown error");
        setError(e);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `**Something went wrong**: ${e.message}` }
              : m,
          ),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, messages, readStream],
  );

  const handleDecision = useCallback(
    async (decision: "approve" | "reject") => {
      if (!pendingTx) return;

      setPendingTx(null);
      setIsLoading(true);

      const assistantId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "" },
      ]);

      try {
        const response = await fetch("/api/resume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            threadId: pendingTx.threadId,
            decision,
          }),
        });

        if (!response.ok) throw new Error(`Resume failed: ${response.status}`);
        await readStream(response, assistantId);
      } catch (err) {
        const e = err instanceof Error ? err : new Error("Unknown error");
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `**Something went wrong**: ${e.message}` }
              : m,
          ),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [pendingTx, readStream],
  );

  return {
    messages,
    setMessages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    pendingTx,
    setPendingTx,
    handleDecision,
  };
}
