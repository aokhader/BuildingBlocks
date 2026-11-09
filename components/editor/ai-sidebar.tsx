"use client";

import { Bot, Download, FileText, Send, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const STARTER_PROMPTS = [
  "Design an e-commerce backend",
  "Create a chat app architecture",
  "Build a CI/CD pipeline",
];

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
}

interface AiSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AiSidebar({ isOpen, onClose }: AiSidebarProps) {
  return (
    <aside
      aria-label="AI assistant"
      inert={!isOpen}
      className={cn(
        "fixed top-14 right-0 bottom-0 z-40 flex w-80 flex-col border-l border-surface-border bg-base/95 backdrop-blur-md transition-[translate,visibility,box-shadow] duration-200",
        isOpen ? "translate-x-0 shadow-2xl shadow-black/50" : "invisible translate-x-full"
      )}
    >
      <div className="flex items-center gap-3 border-b border-surface-border px-4 py-3">
        <div className="flex size-8 items-center justify-center rounded-xl bg-ai/15">
          <Bot className="size-4 text-ai-text" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-copy-primary">AI Workspace</h2>
          <p className="text-xs text-copy-muted">Collaborate with BuildingBlocks</p>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close AI sidebar">
          <X />
        </Button>
      </div>

      <Tabs defaultValue="architect" className="min-h-0 flex-1 pt-3">
        <TabsList className="mx-4 w-auto bg-subtle">
          {["architect", "specs"].map((value) => (
            <TabsTrigger
              key={value}
              value={value}
              className="text-copy-muted data-[state=active]:bg-ai/15 data-[state=active]:text-ai-text dark:text-copy-muted dark:data-[state=active]:border-transparent dark:data-[state=active]:bg-ai/15 dark:data-[state=active]:text-ai-text"
            >
              {value === "architect" ? "AI Architect" : "Specs"}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="architect" className="flex min-h-0 flex-col">
          <ArchitectTab />
        </TabsContent>
        <TabsContent value="specs" className="overflow-y-auto">
          <SpecsTab />
        </TabsContent>
      </Tabs>
    </aside>
  );
}

function ArchitectTab() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  function submit(event?: FormEvent) {
    event?.preventDefault();
    const content = input.trim();
    if (!content) return;
    // UI only: AI replies arrive in a later feature.
    setMessages((prev) => [...prev, { id: Date.now(), role: "user", content }]);
    setInput("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <>
      <ScrollArea className="min-h-0 flex-1">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-ai/15">
              <Bot className="size-6 text-ai-text" />
            </div>
            <p className="text-sm text-copy-muted">
              Describe a system and BuildingBlocks will help you design its architecture on the canvas.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setInput(prompt)}
                  className="rounded-full bg-subtle px-3 py-1.5 text-xs text-ai-text transition-colors hover:bg-elevated"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 p-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words",
                  message.role === "user"
                    ? "self-end border-2 border-brand/50 bg-accent-dim text-copy-primary"
                    : "self-start border border-surface-border bg-elevated text-ai-text"
                )}
              >
                {message.content}
              </div>
            ))}
            <div ref={endRef} />
          </div>
        )}
      </ScrollArea>

      <form onSubmit={submit} className="relative border-t border-surface-border p-3">
        <Textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask BuildingBlocks to design something…"
          aria-label="Message BuildingBlocks"
          // Bottom padding keeps text clear of the send button in the corner.
          className="max-h-44 min-h-[104px] resize-none rounded-xl pb-12 border-surface-border bg-elevated text-copy-primary placeholder:text-copy-faint"
        />
        <Button
          type="submit"
          size="icon-sm"
          disabled={!input.trim()}
          aria-label="Send message"
          className="absolute right-5 bottom-5 rounded-lg bg-ai text-white hover:bg-ai/90"
        >
          <Send />
        </Button>
      </form>
    </>
  );
}

function SpecsTab() {
  return (
    <div className="flex flex-col gap-3 p-4">
      <Button className="w-full rounded-xl bg-ai text-white hover:bg-ai/90">
        <Sparkles />
        Generate Spec
      </Button>
      <div className="rounded-2xl border border-surface-border bg-elevated p-4">
        <div className="flex items-start gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-ai/15">
            <FileText className="size-4 text-ai-text" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium text-copy-primary">System Architecture Spec</h3>
            <p className="mt-1 line-clamp-3 text-xs text-copy-muted">
              Services, data stores, and the connections between them, generated from the current
              canvas diagram.
            </p>
          </div>
          <Button variant="ghost" size="icon-sm" disabled aria-label="Download spec">
            <Download />
          </Button>
        </div>
      </div>
    </div>
  );
}
