import "@/app/globals.css";
import { assertServerRuntimeEnv } from "@/lib/env";

export const metadata = {
  title: "Attestly V2",
  description: "Vendor Security and AI-Risk Copilot"
};

export default function RootLayout(props: { children: React.ReactNode }) {
  assertServerRuntimeEnv();

  return (
    <html lang="en">
      <body>{props.children}</body>
    </html>
  );
}
