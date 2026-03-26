"use client";

import { useTransition } from "react";
import { signIn } from "next-auth/react";

type GoogleSignInButtonProps = {
  callbackUrl: string;
};

export function GoogleSignInButton(props: GoogleSignInButtonProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      className="button"
      disabled={isPending}
      onClick={() => {
        startTransition(() => {
          void signIn("google", {
            callbackUrl: props.callbackUrl
          });
        });
      }}
      type="button"
    >
      {isPending ? "Redirecting..." : "Continue with Google"}
    </button>
  );
}
