export default function DashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-8 flex items-end justify-between">
        <div className="flex flex-col gap-2">
          <div className="h-8 w-52 animate-pulse rounded-xl bg-border" />
          <div className="h-4 w-36 animate-pulse rounded-lg bg-border" />
        </div>
        <div className="h-10 w-28 animate-pulse rounded-xl bg-border" />
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-border" />
        ))}
      </div>

      {/* Search bar */}
      <div className="mb-6 h-10 animate-pulse rounded-xl bg-border" />

      {/* Insights placeholder */}
      <div className="mb-8 h-36 animate-pulse rounded-2xl bg-border" />

      {/* Trips heading */}
      <div className="mb-4 h-5 w-24 animate-pulse rounded-lg bg-border" />

      {/* Trip cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-border" />
        ))}
      </div>
    </div>
  );
}
