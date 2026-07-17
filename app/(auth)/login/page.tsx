import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

// Server Component wrapper — awaits searchParams and passes them as plain
// props to the Client Component form, which uses useSearchParams internally.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const params = await searchParams;
  return (
    <Suspense>
      <LoginForm urlMessage={params.message} urlError={params.error} />
    </Suspense>
  );
}
