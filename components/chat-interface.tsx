"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { MessageBubble } from "./message-bubble";
import { Send } from "lucide-react";
import { useChat } from "@/hooks/use-chat";

export function ChatInterface() {
  const {
    messages,
    setMessages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
  } = useChat();

  // console.log(messages);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!mounted) return null;

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto">
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 && (
          <div className="h-full flex items-center justify-center text-center">
            <Card className="p-8 max-w-sm">
              <h2 className="text-2xl font-bold mb-2">Stellar Wallet Chat</h2>
              <p className="text-gray-600">
                Start by asking me to create a wallet, check balances, or send
                payments on the Stellar network.
              </p>
            </Card>
          </div>
        )}

        {/* {messages.map((message, idx) => {
          console.log(message);
          return (
            <MessageBubble
              key={idx}
              role={message.role}
              content={message.content}
              isStreaming={
                isLoading &&
                idx === messages.length - 1 &&
                message.role === "assistant"
              }
            />
          );
        })} */}

        {messages.map((message, idx) => {
          // const toolPart = message.parts?.find(
          //   (p) => p.type === "tool-invocation"
          // );
          // if (toolPart) {
          //   if (toolPart.state === "running") {
          //     return (
          //       <MessageBubble
          //         key={idx}
          //         role="assistant"
          //         content={toolPart.stream}
          //         isStreaming={true}
          //       />
          //     );
          //   }

          //   if (toolPart.state === "result") {
          //     return (
          //       <MessageBubble
          //         key={idx}
          //         role="assistant"
          //         content={`${toolPart.result.message}`}
          //         isStreaming={
          //           isLoading &&
          //           idx === messages.length - 1 &&
          //           message.role === "assistant"
          //         }
          //       />
          //     );
          //   }
          // }

          return (
            <MessageBubble
              key={idx}
              role={message.role}
              content={message.content}
              isStreaming={
                isLoading &&
                idx === messages.length - 1 &&
                message.role === "assistant"
              }
            />
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t p-4 bg-white">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask me to create a wallet or check your balance..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
