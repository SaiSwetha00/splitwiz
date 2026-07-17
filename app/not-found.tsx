import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-6xl font-bold tracking-tight text-accent">404</p>
      <p className="text-lg font-semibold">Page not found</p>
      <p className="text-sm text-muted">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground"
      >
        ← Back home
      </Link>
    </main>
  );
}
