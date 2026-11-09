import { UserButton } from "@clerk/nextjs";
import { PanelLeftClose, PanelLeftOpen, Share2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

interface EditorNavbarProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  // Workspace-only: project name and actions are hidden on the editor home.
  projectName?: string;
  isAiSidebarOpen?: boolean;
  onToggleAiSidebar?: () => void;
  onShare?: () => void;
}

export function EditorNavbar({
  isSidebarOpen,
  onToggleSidebar,
  projectName,
  isAiSidebarOpen,
  onToggleAiSidebar,
  onShare,
}: EditorNavbarProps) {
  const Icon = isSidebarOpen ? PanelLeftClose : PanelLeftOpen;

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
        <UserButton />
      </div>
    </header>
  );
}
