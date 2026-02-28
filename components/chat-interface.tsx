"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { MessageBubble } from "./message-bubble";
import { Send } from "lucide-react";
import { useChat } from "@/hooks/use-chat";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";
import { ConnectButton } from "./connect-button";

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
      <header className="sticky top-0 z-50 shadow-md w-full p-4 bg-gradient-to-b from-blue-50 to-white flex items-center justify-between">
        <h1 className="font-bold">Stellar AI Agent</h1>

        <ConnectButton />
      </header>
      <ScrollArea className="flex-1 p-4 space-y-2 grid">
        {messages.length === 0 && (
          <div className="h-full flex items-center justify-center text-center">
            <Card className="p-8 max-w-sm grid place-items-center">
              <div className="flex items-center">
                <Image
                  src="icon.svg"
                  width={200}
                  height={200}
                  alt="Stellar Logo"
                />
                <h1>AI</h1>
              </div>
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
      </ScrollArea>

      <div className="border-t p-4 sticky bottom-0 bg-white shadow-md">
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
