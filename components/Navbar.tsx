import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/auth/actions";
import { NotificationBell } from "@/components/NotificationBell";

export async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const displayName: string =
    user?.user_metadata?.display_name ??
    user?.email?.split("@")[0] ??
    "Account";

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link
          href="/"
          className="text-sm font-bold tracking-tight hover:opacity-80"
        >
          💸 Splitwiz
        </Link>

        <nav className="flex items-center gap-1">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="rounded-lg px-3 py-1.5 text-sm text-muted transition hover:bg-background hover:text-foreground"
              >
                Dashboard
              </Link>

              <NotificationBell />

              <span className="mx-1 text-border">|</span>

              <span className="text-sm text-muted">{displayName}</span>

              <form action={signOut}>
                <button
                  type="submit"
                  className="ml-2 rounded-lg px-3 py-1.5 text-sm text-muted transition hover:bg-background hover:text-foreground"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-3 py-1.5 text-sm text-muted transition hover:bg-background hover:text-foreground"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground transition hover:opacity-90"
              >
                Get started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
