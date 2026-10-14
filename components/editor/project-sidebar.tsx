import { FolderOpen, Plus, Users, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface ProjectSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProjectSidebar({ isOpen, onClose }: ProjectSidebarProps) {
  return (
    <aside
      aria-label="Projects"
      inert={!isOpen}
      className={cn(
        "fixed top-14 bottom-0 left-0 z-40 flex w-72 flex-col border-r border-surface-border bg-surface/90 backdrop-blur-md transition-transform duration-200",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-sm font-semibold text-copy-primary">Projects</h2>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close sidebar">
          <X />
        </Button>
      </div>

      <Tabs defaultValue="mine" className="flex-1 px-4">
        <TabsList className="w-full">
          <TabsTrigger value="mine">My Projects</TabsTrigger>
          <TabsTrigger value="shared">Shared</TabsTrigger>
        </TabsList>
        <TabsContent value="mine">
          <EmptyState icon={FolderOpen} message="No projects yet" />
        </TabsContent>
        <TabsContent value="shared">
          <EmptyState icon={Users} message="No shared projects" />
        </TabsContent>
      </Tabs>

      <div className="p-4">
        <Button className="w-full">
          <Plus className="size-5" />
          New Project
        </Button>
      </div>
    </aside>
  );
}

function EmptyState({ icon: Icon, message }: { icon: typeof FolderOpen; message: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-copy-muted">
      <Icon className="h-8 w-8" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
