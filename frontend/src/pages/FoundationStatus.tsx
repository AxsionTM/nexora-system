import { useHealthCheck } from "@/hooks/useHealthCheck";

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-3">
      <span
        className={`h-2 w-2 rounded-full ${ok ? "bg-emerald-500" : "bg-red-500"}`}
      />
      <span className="text-sm text-muted">{label}</span>
    </div>
  );
}

export default function FoundationStatus() {
  const { data, isError, isLoading } = useHealthCheck();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight">NEXORA</h1>
        <p className="mt-1 text-sm text-muted">
          Business Management &amp; Analytics — project foundation
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <StatusBadge ok label="Frontend running" />
        <StatusBadge
          ok={Boolean(data) && !isError}
          label={
            isLoading
              ? "Checking API connection..."
              : isError
                ? "API not reachable"
                : `API connected (${data?.service})`
          }
        />
      </div>
    </div>
  );
}
