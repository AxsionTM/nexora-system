interface PlaceholderPageProps {
  title: string;
  description?: string;
}

export default function PlaceholderPage({
  title,
  description = "Этот раздел будет реализован в следующих этапах.",
}: PlaceholderPageProps) {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-muted">{description}</p>
      <div className="mt-8 rounded-xl border border-dashed border-border bg-surface/50 px-6 py-16 text-center">
        <p className="text-sm text-muted">Раздел в разработке</p>
      </div>
    </div>
  );
}
