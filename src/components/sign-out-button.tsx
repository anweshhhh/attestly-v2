"use client";

import { useTransition } from "react";
import { signOut } from "next-auth/react";

export function SignOutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      className="button-secondary"
      disabled={isPending}
      onClick={() => {
        startTransition(() => {
          void signOut({
            callbackUrl: "/login"
          });
        });
      }}
      type="button"
    >
      {isPending ? "Signing out..." : "Sign out"}
    </button>
  );
}
