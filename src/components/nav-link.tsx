"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink(props: { href: string; label: string }) {
  const pathname = usePathname();
  const isActive = pathname === props.href;

  return (
    <Link className={`nav-link${isActive ? " nav-link-active" : ""}`} href={props.href}>
      {props.label}
    </Link>
  );
}
