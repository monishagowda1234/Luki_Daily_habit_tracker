import { createFileRoute, redirect } from "@tanstack/react-router";

// The old welcome page now lives at the password sign-in page.
export const Route = createFileRoute("/login")({
  beforeLoad: () => { throw redirect({ to: "/auth", replace: true }); },
});
