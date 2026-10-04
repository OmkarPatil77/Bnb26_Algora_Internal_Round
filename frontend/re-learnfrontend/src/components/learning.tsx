import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Code2,
  Leaf,
  Moon,
  RefreshCw,
  Sun,
  WandSparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useSession } from "@/lib/session-context";
import { seedDemoProfile } from "@/services/api";

export function AppFrame({ children, isDemo = false }: { children: ReactNode; isDemo?: boolean }) {
  const { demoMode, setDemoMode, darkMode, setDarkMode } = useSession();
  const path = useLocation({ select: (location) => location.pathname });

  return (
    <div className="min-h-screen text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
          <Link
            to="/"
            className="flex items-center gap-2.5 rounded-lg font-display text-xl font-extrabold text-foreground"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-sage-soft text-sage">
              <Leaf size={20} />
            </span>
            Re:Learn
          </Link>
          <nav aria-label="Main navigation" className="hidden items-center gap-1 sm:flex">
            <Link
              to="/session/question"
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                path.startsWith("/session")
                  ? "bg-sage-soft text-secondary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              My session
            </Link>
            <Link
              to="/dashboard"
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                path === "/dashboard"
                  ? "bg-sage-soft text-secondary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              My learning
            </Link>
            <Link
              to="/evaluation"
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                path === "/evaluation"
                  ? "bg-sage-soft text-secondary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              Evaluation
            </Link>
          </nav>
          <div className="flex items-center gap-2.5">
            <div className="hidden items-center gap-2 sm:flex">
              <Label htmlFor="demo-mode" className="text-xs text-muted-foreground">
                Demo mode
              </Label>
              <Switch
                id="demo-mode"
                aria-label="Demo mode"
                checked={demoMode}
                onCheckedChange={async (val) => {
                  setDemoMode(val);
                  if (val) {
                    try {
                      await seedDemoProfile();
                    } catch {
                      // Ignored
                    }
                  }
                }}
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="min-h-11 min-w-11 rounded-full"
              onClick={() => setDarkMode(!darkMode)}
              aria-label={darkMode ? "Use light appearance" : "Use dark appearance"}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </Button>
          </div>
        </div>
        <div className="flex gap-4 border-t border-border/40 px-5 py-2 sm:hidden">
          <Link className="text-xs text-muted-foreground" to="/session/question">
            Session
          </Link>
          <Link className="text-xs text-muted-foreground" to="/dashboard">
            Learning
          </Link>
          <Link className="text-xs text-muted-foreground" to="/evaluation">
            Evaluation
          </Link>
          <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            Demo <Switch aria-label="Demo mode" checked={demoMode} onCheckedChange={setDemoMode} />
          </label>
        </div>
      </header>
      {(demoMode || isDemo) && (
        <div className="mx-auto mt-3 flex max-w-7xl items-center gap-2 px-5 text-sm text-secondary-foreground sm:px-8">
          <span className="size-2 rounded-full bg-peach" />
          <span className="font-semibold text-xs rounded bg-peach-soft px-2 py-0.5 text-accent-foreground">
            Demo data
          </span>
          <span className="text-xs text-muted-foreground">· Live demonstration state</span>
        </div>
      )}
      <main>{children}</main>
    </div>
  );
}

export function CalmErrorState({
  message = "The tutor engine isn't reachable. Try again.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-border/80 bg-card p-8 text-center soft-shadow my-12">
      <div className="mx-auto grid size-12 place-items-center rounded-full bg-peach-soft text-accent-foreground mb-4">
        <AlertCircle size={24} />
      </div>
      <h3 className="font-display text-lg font-bold text-foreground">Connection Notice</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{message}</p>
      {onRetry && (
        <div className="mt-6 flex justify-center">
          <Button onClick={onRetry} className="h-10 rounded-full px-6 gap-2">
            <RefreshCw size={15} />
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}

export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-primary">
          {eyebrow}
        </div>
        <h1 className="font-display text-3xl font-extrabold leading-tight text-foreground sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          {description}
        </p>
      </div>
      {children}
    </div>
  );
}

export function Surface({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-2xl border border-border/70 bg-card p-5 soft-shadow sm:p-6 ${className}`}
    >
      {children}
    </section>
  );
}

export function CodeEditor({
  value,
  onChange,
  readOnly = true,
  height = "250px",
  highlightedLines = [],
}: {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  height?: string;
  highlightedLines?: number[];
}) {
  const [Editor, setEditor] = useState<typeof import("@monaco-editor/react").default | null>(null);

  useEffect(() => {
    let active = true;
    void import("@monaco-editor/react").then((module) => {
      if (active) setEditor(() => module.default);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div
      className="overflow-hidden rounded-xl border border-border bg-muted/35"
      aria-label={readOnly ? "Python code example" : "Python code editor"}
    >
      <div className="flex items-center justify-between border-b border-border/70 px-4 py-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <Code2 size={14} /> main.py
        </div>
        <div className="flex items-center gap-2">
          {highlightedLines.length > 0 && (
            <span className="rounded-full bg-peach-soft px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">
              Line {highlightedLines.join(", ")}
            </span>
          )}
          <span className="rounded-full bg-sage-soft px-2.5 py-1 text-xs text-secondary-foreground">
            Python
          </span>
        </div>
      </div>
      {Editor ? (
        <Editor
          height={height}
          language="python"
          theme="vs"
          value={value}
          onChange={(next) => onChange?.(next ?? "")}
          options={{
            readOnly,
            minimap: { enabled: false },
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            fontFamily: "JetBrains Mono",
            fontSize: 14,
            lineHeight: 26,
            padding: { top: 12, bottom: 12 },
            automaticLayout: true,
            wordWrap: "on",
            renderLineHighlight: "none",
            overviewRulerLanes: 0,
            scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
          }}
        />
      ) : (
        <pre
          className="min-h-48 overflow-auto p-5 font-mono text-sm leading-7 text-foreground"
          aria-label="Python code loading"
        >
          {value}
        </pre>
      )}
    </div>
  );
}

export function ConfidenceBars({
  items,
  animate = false,
}: {
  items: { id?: string; label: string; confidence: number }[];
  animate?: boolean;
}) {
  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={item.id || item.label + index}>
          <div className="mb-1.5 flex items-center justify-between gap-4 text-sm">
            <span
              className={index === 0 ? "font-semibold text-foreground" : "text-muted-foreground"}
            >
              {item.label}
            </span>
            <span className="font-mono text-xs text-muted-foreground">{item.confidence}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full ${
                index === 0 ? "bg-sage" : index === 1 ? "bg-peach" : "bg-lavender"
              } ${animate ? "transition-[width] duration-400 ease-out motion-reduce:transition-none" : ""}`}
              style={{ width: `${Math.min(Math.max(item.confidence, 0), 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function StepPills({ active }: { active: number }) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2" aria-label={`Step ${active + 1} of 3`}>
      {["Transfer 1", "Transfer 2", "Delayed check"].map((step, index) => (
        <div
          key={step}
          className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold ${
            index < active
              ? "bg-sage-soft text-secondary-foreground"
              : index === active
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
          }`}
        >
          {index < active ? <Check size={13} /> : null}
          {step}
        </div>
      ))}
    </div>
  );
}

export function DemoHelper({ step, to, label }: { step: string; to: string; label: string }) {
  const { demoMode } = useSession();
  if (!demoMode) return null;
  return (
    <div className="fixed bottom-5 right-5 z-20 flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 soft-shadow">
      <div>
        <div className="text-[10px] font-bold uppercase text-primary">Next demo step</div>
        <div className="mt-0.5 max-w-40 text-sm font-semibold">{step}</div>
      </div>
      <Button asChild size="icon" className="min-h-11 min-w-11 rounded-full" aria-label={label}>
        <Link to={to as "/"}>
          <ArrowRight size={18} />
        </Link>
      </Button>
    </div>
  );
}

export function BackLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Button asChild variant="ghost" className="min-h-11 rounded-full px-4 text-muted-foreground">
      <Link to={to as "/"}>
        <ArrowLeft size={16} />
        {children}
      </Link>
    </Button>
  );
}
