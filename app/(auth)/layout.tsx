import { Boxes, FileText, Share2, Sparkles } from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "AI Architecture Generation",
    description: "Describe your system, AI maps it to nodes and edges on a live canvas.",
  },
  {
    icon: Share2,
    title: "Real-time Collaboration",
    description: "Live cursors, presence indicators, and shared node editing across your team.",
  },
  {
    icon: FileText,
    title: "Instant Spec Generation",
    description: "Export a complete Markdown technical spec directly from the canvas graph.",
  },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen flex-1 bg-base lg:grid-cols-2">
      <section className="hidden flex-col justify-between border-r border-surface-border bg-surface p-16 lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-brand text-primary-foreground">
            <Boxes className="size-5" />
          </div>
          <span className="text-lg font-semibold text-copy-primary">Building Blocks</span>
        </div>

        <div className="max-w-xl space-y-10">
          <div className="space-y-4">
            <h1 className="max-w-md text-4xl font-semibold tracking-tight text-copy-primary">
              Design systems at the speed of thought.
            </h1>
            <p className="text-lg text-copy-muted">
              Describe your architecture in plain English. Building Blocks maps it to a shared
              canvas your whole team can refine in real time.
            </p>
          </div>
          <ul className="space-y-6">
            {features.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex gap-4">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-surface-border bg-accent-dim text-brand">
                  <Icon className="size-4" />
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-copy-primary">{title}</p>
                  <p className="text-sm text-copy-muted">{description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-sm text-copy-faint">© {new Date().getFullYear()} Building Blocks. All rights reserved.</p>
      </section>
      <main className="flex items-center justify-center p-6">{children}</main>
    </div>
  );
}
