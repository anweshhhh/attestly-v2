import { redirect } from "next/navigation";
import { Banner } from "@/components/banner";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { getCurrentUser } from "@/lib/auth";

type LoginPageProps = {
  searchParams?: {
    error?: string;
    callbackUrl?: string;
  };
};

function getSignInErrorMessage(error: string | undefined) {
  if (!error) {
    return undefined;
  }

  if (error === "AccessDenied") {
    return "Use a verified Google account to sign in.";
  }

  return "Unable to complete sign in right now. Please try again.";
}

export default async function LoginPage(props: LoginPageProps) {
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }

  const callbackUrl = props.searchParams?.callbackUrl || "/";
  const errorMessage = getSignInErrorMessage(props.searchParams?.error);

  return (
    <div className="page-shell" style={{ maxWidth: 560, paddingTop: 64 }}>
      <section className="hero">
        <span className="eyebrow" style={{ color: "rgba(255,255,255,0.8)" }}>
          Phase 1
        </span>
        <h1 style={{ fontSize: "2.6rem" }}>Start with evidence, not templates.</h1>
        <p style={{ color: "rgba(255,255,255,0.82)", lineHeight: 1.7 }}>
          Attestly gives your team an evidence-first workflow for AI Profile completion, Trust Pack generation,
          current-version review, approval, and buyer-safe Markdown export.
        </p>
      </section>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="stack">
          <div>
            <span className="eyebrow">Sign in</span>
            <h2 style={{ marginBottom: 8 }}>Create or open your workspace</h2>
            <p className="muted" style={{ marginTop: 0 }}>
              Sign in with a verified Google work identity. If you are new, Attestly will bootstrap your first
              workspace and make you the owner after sign-in.
            </p>
          </div>

          <Banner error={errorMessage} />

          <div className="stack">
            <GoogleSignInButton callbackUrl={callbackUrl} />
            <p className="muted" style={{ margin: 0 }}>
              Existing workspace roles still resolve from your server-side workspace membership after sign-in.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
