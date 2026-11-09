import Link from "next/link";
import { Lock } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

export function AccessDenied() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-base px-6 text-center">
      <Lock className="h-8 w-8 text-copy-muted" />
      <h1 className="text-2xl font-semibold text-copy-primary">Access denied</h1>
      <p className="text-copy-muted">
        This project doesn&apos;t exist or you don&apos;t have access to it.
      </p>
      <Link href="/editor" className={buttonVariants()}>
        Back to projects
      </Link>
    </main>
  );
}
