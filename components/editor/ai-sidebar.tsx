"use client";

import {
  useCreateFeed,
  useCreateFeedMessage,
  useFeedMessages,
  useOthers,
  useRoom,
  useSelf,
} from "@liveblocks/react";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import { Bot, Download, FileText, LoaderCircle, Send, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { EditorDialog } from "@/components/editor/editor-dialog";
import { Button } from "@/components/ui/button";
import { DialogClose } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { designAgent } from "@/trigger/design-agent";
import type { generateSpec } from "@/trigger/generate-spec";
import {
  AI_CHAT_FEED_ID,
  AI_STATUS_FEED_ID,
  aiChatMessageSchema,
  parseAiStatusMessage,
  type AiChatMessage,
} from "@/types/tasks";

const STARTER_PROMPTS = [
  "Design an e-commerce backend",
  "Create a chat app architecture",
  "Build a CI/CD pipeline",
];

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

// Shared AI activity: `thinking` comes from room presence (the AI agent joins as a participant),
// the text from the latest valid message in the status feed. Non-suspense hooks, so the
// sidebar stays usable while the room connects.
function useAiStatus() {
  const isThinking = useOthers((others) => others.some((o) => o.presence.thinking)) ?? false;
  const { messages } = useFeedMessages(AI_STATUS_FEED_ID);
  const latest = messages?.at(-1);
  const status = latest ? parseAiStatusMessage(latest.data) : null;
  return { isThinking, status };
}

// Room chat from the `ai-chat` feed. Feed data is arbitrary room JSON, so invalid entries are dropped.
function useRoomChat() {
  const { messages: feedMessages } = useFeedMessages(AI_CHAT_FEED_ID);
  const messages = (feedMessages ?? []).flatMap((message) => {
    const parsed = aiChatMessageSchema.safeParse(message.data);
    return parsed.success ? [{ id: message.id, ...parsed.data }] : [];
  });

  const createFeed = useCreateFeed();
  const createFeedMessage = useCreateFeedMessage();
  const sender = useSelf((me) => me.info.name) ?? "Anonymous";
  const feedReady = useRef(false);

  async function send(content: string, role: AiChatMessage["role"] = "user") {
    // The feed must exist before messages can be added; an existing one is fine.
    if (!feedReady.current) {
      await createFeed(AI_CHAT_FEED_ID).catch(() => undefined);
      feedReady.current = true;
    }
    const message: AiChatMessage = {
      sender: role === "user" ? sender : "BuildingBlocks AI",
      role,
      content,
      timestamp: Date.now(),
    };
    await createFeedMessage(AI_CHAT_FEED_ID, message);
  }

  return { messages, send };
}

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : `Request failed (${res.status})`);
  return data;
}

function ArchitectTab() {
  const roomId = useRoom().id;
  const { isThinking, status } = useAiStatus();
  const { messages, send } = useRoomChat();
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState(false);
  const [activeRun, setActiveRun] = useState<{ runId: string; publicToken: string } | null>(null);
  const finishedRunId = useRef<string | null>(null);

  // Posts the AI's closing message once per run, then frees the input.
  function finishRun(content: string) {
    if (!activeRun || finishedRunId.current === activeRun.runId) return;
    finishedRunId.current = activeRun.runId;
    send(content, "assistant")
      .catch(() => setSendError(true))
      .finally(() => setActiveRun(null));
  }

  const { error: runError } = useRealtimeRun<typeof designAgent>(activeRun?.runId, {
    accessToken: activeRun?.publicToken,
    enabled: !!activeRun,
    onComplete: (run, error) => {
      // The task posts its summary to the status feed before finishing; fall back if it hasn't arrived.
      const summary = status?.runId === run.id ? status.text : undefined;
      finishRun(
        run.isSuccess
          ? (summary ?? `Design updated (${run.output?.applied ?? 0} changes).`)
          : `The design run failed${error ? `: ${error.message}` : "."} Try again.`
      );
    },
  });
  // The local run covers the submitter; `thinking` presence covers everyone else in the room.
  const isRunning = !!activeRun || isThinking;
  const isBusy = isRunning || isSending;
  const endRef = useRef<HTMLDivElement>(null);

  // A broken subscription never completes, so end the run instead of locking the input.
  useEffect(() => {
    if (runError) finishRun(`Lost track of the design run: ${runError.message}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- react to the error only
  }, [runError]);

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    const content = input.trim();
    if (!content || isBusy) return;
    setIsSending(true);
    setSendError(false);
    try {
      await send(content);
      setInput("");
    } catch {
      setSendError(true);
      setIsSending(false);
      return;
    }
    try {
      // Room ID == project ID, so the room doubles as the project the run is checked against.
      const { runId } = await postJson("/api/ai/design", { prompt: content, roomId, projectId: roomId });
      if (typeof runId !== "string") throw new Error("No run ID returned");
      const { token } = await postJson("/api/ai/design/token", { runId });
      if (typeof token !== "string") throw new Error("No run token returned");
      setActiveRun({ runId, publicToken: token });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown error";
      await send(`Couldn't start the design: ${reason}`, "assistant").catch(() => setSendError(true));
    } finally {
      setIsSending(false);
    }
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
                  "flex max-w-[85%] flex-col gap-1",
                  message.role === "user" ? "self-end items-end" : "self-start items-start"
                )}
              >
                <div className="flex items-baseline gap-2 px-1 text-xs">
                  <span className="max-w-40 truncate font-medium text-copy-secondary">
                    {message.sender}
                  </span>
                  <time
                    dateTime={new Date(message.timestamp).toISOString()}
                    className="text-copy-faint"
                  >
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </div>
                <div
                  className={cn(
                    "rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words",
                    message.role === "user"
                      ? "bg-[#62C073] text-[#0F2E18]"
                      : "border border-surface-border bg-elevated text-copy-primary"
                  )}
                >
                  {message.content}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
        )}
      </ScrollArea>

      {isRunning && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 border-t border-l-2 border-t-surface-border border-l-[#62C073] bg-elevated px-4 py-2 text-xs text-copy-secondary"
        >
          <LoaderCircle className="size-3.5 shrink-0 animate-spin text-[#62C073]" />
          <span className="truncate" title={status?.text}>
            {status?.text ?? "AI is working…"}
          </span>
        </div>
      )}

      <form onSubmit={submit} className="relative border-t border-surface-border p-3">
        {sendError && (
          <p role="alert" className="mb-2 px-1 text-xs text-error">
            Message failed to send. Try again.
          </p>
        )}
        {/* The send button gets its own row below the text, so typing and the scrollbar never run under it. */}
        {/* pt/pr inset the textarea (and its scrollbar arrows) from the rounded top-right corner;
            overflow-hidden clips anything left to the rounded border. */}
        <div className="overflow-hidden rounded-xl border pt-1.5 pr-1.5 border-surface-border bg-elevated transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
          <Textarea
            disabled={isBusy}
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              setSendError(false);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask BuildingBlocks to design something…"
            aria-label="Message BuildingBlocks"
            // 3 lines (20px each + 16px padding), growing up to 3 more; past that it scrolls and the
            // scrollbar takes width inside the textarea, so text wraps before it.
            // Thin scrollbar, transparent track.
            className="max-h-34 min-h-19 resize-none overflow-y-auto rounded-none border-0 bg-transparent text-sm leading-5 text-copy-primary shadow-none [scrollbar-color:var(--border-subtle)_transparent] scrollbar-thin placeholder:text-copy-faint focus-visible:ring-0 md:text-sm dark:bg-transparent"
          />
          <div className="flex justify-end px-2 pt-2 pb-2">
            <Button
              type="submit"
              size="xs"
              disabled={!input.trim() || isBusy}
              className="bg-[#62C073] text-[#0F2E18] hover:bg-[#62C073]/90 disabled:opacity-40"
            >
              {isBusy ? <LoaderCircle className="animate-spin" /> : <Send />}
              {isBusy ? "Working…" : "Send Message"}
            </Button>
          </div>
        </div>
      </form>
    </>
  );
}

interface SpecMeta {
  id: string;
  createdAt: string;
}

async function readError(res: Response) {
  const body = await res.json().catch(() => null);
  return body?.error ?? `Request failed (${res.status})`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

// Specs remount (and refetch) each time the tab opens, since inactive tab content unmounts.
function SpecsTab() {
  const projectId = useRoom().id; // room ID == project ID
  const filename = `${projectId}-spec.md`; // matches the download route's Content-Disposition
  const [specs, setSpecs] = useState<SpecMeta[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<SpecMeta | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const { messages } = useRoomChat();
  const [isStarting, setIsStarting] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [activeRun, setActiveRun] = useState<{ runId: string; publicToken: string } | null>(null);

  const { error: runError } = useRealtimeRun<typeof generateSpec>(activeRun?.runId, {
    accessToken: activeRun?.publicToken,
    enabled: !!activeRun,
    onComplete: (run, error) => {
      setActiveRun(null);
      if (run.isSuccess) setReloadKey((key) => key + 1);
      else setGenError(`Spec generation failed${error ? `: ${error.message}` : "."}`);
    },
  });
  // A broken subscription never completes, so stop waiting instead of spinning forever.
  const lostRun = activeRun && runError ? `Lost track of the spec run: ${runError.message}` : null;
  const isGenerating = isStarting || (!!activeRun && !runError);
  const shownError = lostRun ?? genError;

  async function generate() {
    if (isGenerating) return;
    setIsStarting(true);
    setGenError(null);
    try {
      // Nodes/edges come from the autosaved canvas (the sidebar sits outside ReactFlowProvider).
      // shortcut: edits from the last ~1.5s autosave debounce may be missing; read room storage if that matters.
      const res = await fetch(`/api/projects/${projectId}/canvas`);
      if (!res.ok) throw new Error(await readError(res));
      const { canvas } = (await res.json()) as { canvas: { nodes?: unknown[]; edges?: unknown[] } | null };
      const chatHistory = messages.map(({ sender, role, content, timestamp }) => ({ sender, role, content, timestamp }));
      const { runId } = await postJson("/api/ai/spec", {
        roomId: projectId,
        chatHistory,
        nodes: canvas?.nodes ?? [],
        edges: canvas?.edges ?? [],
      });
      if (typeof runId !== "string") throw new Error("No run ID returned");
      const { token } = await postJson("/api/ai/spec/token", { runId });
      if (typeof token !== "string") throw new Error("No run token returned");
      setActiveRun({ runId, publicToken: token });
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Could not start spec generation");
    } finally {
      setIsStarting(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/projects/${projectId}/specs`)
      .then(async (res) => {
        if (!res.ok) throw new Error(await readError(res));
        const body: { specs: SpecMeta[] } = await res.json();
        if (!cancelled) setSpecs(body.specs);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load specs");
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, reloadKey]);

  const downloadUrl = (specId: string) => `/api/projects/${projectId}/specs/${specId}/download`;

  return (
    <div className="flex flex-col gap-3 p-4">
      <Button
        onClick={generate}
        disabled={isGenerating}
        className="w-full rounded-xl bg-ai text-white hover:bg-ai/90"
      >
        {isGenerating ? <LoaderCircle className="animate-spin" /> : <Sparkles />}
        {isGenerating ? "Generating spec…" : "Generate Spec"}
      </Button>
      {shownError && (
        <p role="alert" className="px-1 text-xs text-error">
          {shownError}
        </p>
      )}

      {error ? (
        <p role="alert" className="px-1 text-xs text-error">
          {error}
        </p>
      ) : specs === null ? (
        <p className="flex items-center gap-2 px-1 text-xs text-copy-muted">
          <LoaderCircle className="size-3.5 animate-spin" />
          Loading specs…
        </p>
      ) : specs.length === 0 ? (
        <p className="px-1 text-xs text-copy-muted">No specs generated yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {specs.map((spec) => (
            <li
              key={spec.id}
              className="flex items-center gap-1 rounded-xl border border-surface-border bg-elevated pr-1 transition-colors hover:bg-subtle"
            >
              <button
                type="button"
                onClick={() => setSelected(spec)}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-2.5 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-ai/15">
                  <FileText className="size-4 text-ai-text" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-copy-primary">{filename}</p>
                  <time dateTime={spec.createdAt} className="text-xs text-copy-muted">
                    {formatDate(spec.createdAt)}
                  </time>
                </div>
              </button>
              <Button asChild variant="ghost" size="icon-sm">
                <a href={downloadUrl(spec.id)} download={filename} aria-label={`Download ${filename}`}>
                  <Download />
                </a>
              </Button>
            </li>
          ))}
        </ul>
      )}

      <SpecPreviewDialog
        spec={selected}
        filename={filename}
        downloadUrl={selected ? downloadUrl(selected.id) : ""}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

interface SpecPreviewDialogProps {
  spec: SpecMeta | null;
  filename: string;
  downloadUrl: string;
  onClose: () => void;
}

// Content is fetched through the download route on open and dropped on close (no Blob URL on the client).
function SpecPreviewDialog({ spec, filename, downloadUrl, onClose }: SpecPreviewDialogProps) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!spec) return;
    let cancelled = false;
    fetch(downloadUrl)
      .then(async (res) => {
        if (!res.ok) throw new Error(await readError(res));
        const text = await res.text();
        if (!cancelled) setContent(text);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load spec");
      });
    return () => {
      cancelled = true;
    };
  }, [spec, downloadUrl]);

  return (
    <EditorDialog
      open={!!spec}
      onOpenChange={(open) => {
        if (open) return;
        onClose();
        setContent(null);
        setError(null);
      }}
      title={filename}
      description={spec ? formatDate(spec.createdAt) : undefined}
      className="sm:max-w-2xl"
      footer={
        <>
          <DialogClose asChild>
            <Button variant="ghost">Close</Button>
          </DialogClose>
          <Button asChild className="bg-ai text-white hover:bg-ai/90">
            <a href={downloadUrl} download={filename}>
              <Download />
              Download
            </a>
          </Button>
        </>
      }
    >
      <ScrollArea className="h-[60vh] rounded-xl border border-surface-border bg-base">
        {error ? (
          <p role="alert" className="p-4 text-sm text-error">
            {error}
          </p>
        ) : content === null ? (
          <p className="flex items-center gap-2 p-4 text-sm text-copy-muted">
            <LoaderCircle className="size-4 animate-spin" />
            Loading spec…
          </p>
        ) : (
          <div className="p-4 text-sm leading-6 break-words text-copy-secondary [&_a]:text-ai-text [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-surface-border [&_blockquote]:pl-3 [&_code]:rounded [&_code]:bg-subtle [&_code]:px-1 [&_code]:text-xs [&_h1]:mt-4 [&_h1]:mb-2 [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:text-copy-primary [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-copy-primary [&_h3]:mt-3 [&_h3]:mb-1 [&_h3]:font-semibold [&_h3]:text-copy-primary [&_hr]:my-4 [&_hr]:border-surface-border [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-subtle [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_table]:my-2 [&_table]:w-full [&_table]:text-xs [&_td]:border [&_td]:border-surface-border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-surface-border [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:text-copy-primary [&_ul]:list-disc [&_ul]:pl-5 [&>*:first-child]:mt-0">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        )}
      </ScrollArea>
    </EditorDialog>
  );
}
