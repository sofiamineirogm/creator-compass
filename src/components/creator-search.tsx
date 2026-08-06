import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, Loader2 } from "lucide-react";
import { normalizeUsername, type Platform, type PlatformSelection } from "@/lib/creator-types";
import { cn } from "@/lib/utils";

const OPTIONS: { value: PlatformSelection; label: string }[] = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "both", label: "Both" },
];

export function CreatorSearch({ autoFocus = false }: { autoFocus?: boolean }) {
  const navigate = useNavigate();
  const [handle, setHandle] = useState("");
  const [selection, setSelection] = useState<PlatformSelection>("instagram");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const username = normalizeUsername(handle);
    if (!username) {
      setError("Enter a handle like @mrbeast — letters, numbers, dots and underscores only.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const platform: Platform = selection === "tiktok" ? "tiktok" : "instagram";
    void navigate({
      to: "/creator/$platform/$username",
      params: { platform, username },
      search: selection === "both" ? { compare: "1" } : {},
    });
  }

  return (
    <form onSubmit={submit} className="w-full">
      <div className="surface flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:rounded-full sm:p-2 sm:pl-5">
        <div className="flex flex-1 items-center gap-3">
          <Search className="hidden h-5 w-5 shrink-0 text-muted-foreground sm:block" aria-hidden />
          <label htmlFor="creator-handle" className="sr-only">
            Creator username
          </label>
          <input
            id="creator-handle"
            autoFocus={autoFocus}
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="@mrbeast"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="h-12 w-full rounded-full bg-transparent px-4 text-base outline-none placeholder:text-muted-foreground sm:px-0"
          />
        </div>

        <div className="flex items-center gap-1 rounded-full bg-muted p-1" role="tablist" aria-label="Platform">
          {OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={selection === option.value}
              onClick={() => setSelection(option.value)}
              className={cn(
                "flex-1 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors sm:flex-none",
                selection === option.value
                  ? "bg-card text-foreground shadow-soft"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ember px-7 text-sm font-semibold text-primary-foreground shadow-glow transition-transform duration-300 hover:scale-[1.02] disabled:opacity-70"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          Analyze
        </button>
      </div>
      {error ? (
        <p role="alert" className="mt-3 pl-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}
