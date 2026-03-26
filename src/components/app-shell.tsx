import { NavLink } from "@/components/nav-link";
import { SignOutButton } from "@/components/sign-out-button";

type AppShellProps = {
  workspaceName: string;
  workspaceSlug: string;
  role: string;
  userEmail: string;
  children: React.ReactNode;
};

export function AppShell(props: AppShellProps) {
  const basePath = `/w/${props.workspaceSlug}`;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <div className="brand">
            <span className="eyebrow">Attestly V2</span>
            <strong>{props.workspaceName}</strong>
            <span className="muted">{props.userEmail}</span>
          </div>

          <nav className="nav" aria-label="Primary">
            <NavLink href={basePath} label="Home" />
            <NavLink href={`${basePath}/evidence`} label="Evidence" />
            <NavLink href={`${basePath}/trust-packs`} label="Trust Packs" />
            <NavLink href={`${basePath}/settings/team`} label="Settings / Team" />
          </nav>

          <div className="toolbar">
            <span className="pill">Role: {props.role}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="page-shell">{props.children}</main>
    </div>
  );
}
