import { UserButton } from "@clerk/nextjs";
import {
  Check,
  CircleAlert,
  LayoutTemplate,
  LoaderCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Save,
  Share2,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

const SAVE_LABELS = {
  idle: { Icon: Save, text: "Save", className: undefined },
  saving: { Icon: LoaderCircle, text: "Saving...", className: "[&_svg]:animate-spin" },
  saved: { Icon: Check, text: "Saved", className: undefined },
  error: { Icon: CircleAlert, text: "Error", className: "text-error" },
};
const FLASH_MS = 2000;

// Tracks manual saves only; autosave runs in the background without touching the button.
// "Saved" / "Error" show briefly, then the button returns to "Save".
function useManualSave(onSave: (() => Promise<boolean>) | undefined) {
  const [state, setState] = useState<keyof typeof SAVE_LABELS>("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function save() {
    if (!onSave) return;
    clearTimeout(timer.current);
    setState("saving");
    const ok = await onSave();
    setState(ok ? "saved" : "error");
    timer.current = setTimeout(() => setState("idle"), FLASH_MS);
  }
  return { label: SAVE_LABELS[state], save };
}

interface EditorNavbarProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  // Workspace-only: project name and actions are hidden on the editor home.
  projectName?: string;
  isAiSidebarOpen?: boolean;
  onToggleAiSidebar?: () => void;
  onShare?: () => void;
  onOpenTemplates?: () => void;
  onSave?: () => Promise<boolean>;
}

export function EditorNavbar({
  isSidebarOpen,
  onToggleSidebar,
  projectName,
  isAiSidebarOpen,
  onToggleAiSidebar,
  onShare,
  onOpenTemplates,
  onSave,
}: EditorNavbarProps) {
  const Icon = isSidebarOpen ? PanelLeftClose : PanelLeftOpen;
  const { label: save, save: saveNow } = useManualSave(onSave);

  return (
    <header className="flex h-14 shrink-0 items-center border-b border-surface-border bg-surface px-3">
      <div className="flex flex-1 items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
          aria-expanded={isSidebarOpen}
        >
          <Icon className="size-5" />
        </Button>
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-center">
        {projectName && (
          <h1 className="truncate text-sm font-semibold text-copy-primary">{projectName}</h1>
        )}
      </div>
      <div className="flex flex-1 items-center justify-end gap-2">
        {onToggleAiSidebar && (
          <>
            {onSave && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void saveNow()}
                aria-live="polite"
                className={save.className}
              >
                <save.Icon />
                {save.text}
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onOpenTemplates}>
              <LayoutTemplate />
              Templates
            </Button>
            <Button variant="outline" size="sm" onClick={onShare}>
              <Share2 />
              Share
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleAiSidebar}
              aria-label={isAiSidebarOpen ? "Close AI sidebar" : "Open AI sidebar"}
              aria-expanded={isAiSidebarOpen}
              className={isAiSidebarOpen ? "text-ai-text" : undefined}
            >
              <Sparkles className="size-5" />
            </Button>
          </>
        )}
        {/* Editor home only; workspace actions (onToggleAiSidebar) mark the workspace navbar. */}
        {!onToggleAiSidebar && <UserButton />}
      </div>
    </header>
  );
}
