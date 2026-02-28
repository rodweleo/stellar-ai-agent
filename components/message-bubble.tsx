import { cn } from "@/lib/utils";
import Markdown from "react-markdown";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export function MessageBubble({
  role,
  content,
  isStreaming = false,
}: MessageBubbleProps) {
  const isUser = role === "user";
  return (
    <div
      className={cn(
        "flex gap-2 mb-4",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "max-w-xs lg:max-w-md px-4 py-2 rounded-lg",
          isUser
            ? "bg-blue-600 text-white rounded-br-none"
            : "bg-gray-200 text-gray-900 rounded-bl-none",
        )}
      >
        {isStreaming && !isUser ? (
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-current rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-current rounded-full animate-bounce delay-100" />
            <div className="w-2 h-2 bg-current rounded-full animate-bounce delay-200" />
          </div>
        ) : (
          <Markdown className="text-sm prose prose-sm max-w-none dark:prose-invert wrap-break-word">
            {content}
          </Markdown>
        )}
      </div>
    </div>
  );
}
