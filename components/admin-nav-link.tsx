"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminNavLink({
  href,
  children,
}: Readonly<{
  href: string;
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isActive = href === "/admin" ? pathname === href : pathname.startsWith(href);

  return (
    <Link href={href} className={`admin-nav-link${isActive ? " active" : ""}`}>
      {children}
    </Link>
  );
}
