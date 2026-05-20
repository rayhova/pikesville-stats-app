import Link from "next/link";
import { AdminNavLink } from "@/components/admin-nav-link";
import { AuthSignOutButton } from "@/components/auth-sign-out-button";
import { ResponsiveDisclosure } from "@/components/responsive-disclosure";
import { requireAccessRole } from "@/lib/access-control";

const navItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/access", label: "Access" },
  { href: "/admin/seasons", label: "Seasons" },
  { href: "/admin/teams", label: "Teams" },
  { href: "/admin/players", label: "Players" },
  { href: "/admin/coaches", label: "Coaches" },
  { href: "/admin/managers", label: "Managers" },
  { href: "/admin/plays", label: "Plays" },
  { href: "/admin/drills", label: "Drills" },
  { href: "/admin/practices", label: "Practices" },
  { href: "/admin/assignments", label: "Assignments" },
  { href: "/admin/games", label: "Games" },
];

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireAccessRole(["admin"]);

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <ResponsiveDisclosure
          title="Admin Menu"
          className="admin-sidebar-disclosure"
          showDesktopHeading={false}
        >
          <div className="admin-brand">
            <img
              src="/branding/pikesville-panthers-logo.svg"
              alt="Pikesville Panthers logo"
              className="admin-brand-mark"
            />
            <p>Pikesville Basketball</p>
            <h1>Admin</h1>
          </div>

          <nav className="admin-nav" aria-label="Admin navigation">
            {navItems.map((item) => (
              <AdminNavLink key={item.href} href={item.href}>
                {item.label}
              </AdminNavLink>
            ))}
          </nav>

          <div className="action-row">
            <Link href="/" className="button-link ghost">
              Home
            </Link>
            <Link href="/admin" className="button-link ghost">
              Admin Dashboard
            </Link>
            {session.authSource === "supabase" ? <AuthSignOutButton /> : null}
          </div>
        </ResponsiveDisclosure>
      </aside>

      <div className="admin-main">{children}</div>
    </div>
  );
}
