import { useEffect, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { ArrowUpRight, LogOut, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { startLogin } from "@/const";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";

const navItems = [
  { href: "/app/discover", label: "Discover" },
  { href: "/app/member", label: "My space" },
  { href: "/app/business", label: "Business" },
  { href: "/app/business/members", label: "Members" },
  { href: "/app/business/attendance", label: "Attendance" },
  { href: "/app/business/challenges", label: "Challenges" },
];

function isActive(href: string, location: string) {
  if (href === "/app/business") return location === href;
  if (href === "/app/discover" && location.startsWith("/app/facilities/")) return true;
  return location === href || location.startsWith(`${href}/`);
}

export default function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const auth = trpc.auth.me.useQuery(undefined, { staleTime: 30_000 });
  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => window.location.assign("/app"),
    onError: () => toast.error("Could not sign out. Please try again."),
  });

  useEffect(() => {
    document.title = "TasseiGō App — Fitness, in one place";
  }, []);

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <Link href="/" className="app-brand" aria-label="TasseiGō home">
          <span className="app-brand-mark" aria-hidden="true">T</span>
          <span className="app-brand-word">Tassei<span>Gō</span></span>
          <span className="app-brand-divider" />
          <span className="app-brand-caption">FITNESS, IN ONE PLACE</span>
        </Link>
        <div className="app-top-actions">
          <button
            type="button"
            className="app-icon-button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {auth.data ? (
            <>
              <span className="app-user-name" title={auth.data.name ?? "Signed in"}>
                {auth.data.name?.trim() || "Signed in"}
              </span>
              <button
                type="button"
                className="app-signin-button app-signout-button"
                onClick={() => logout.mutate()}
                disabled={logout.isPending}
                aria-label="Sign out"
              >
                <LogOut size={15} />
                <span>{logout.isPending ? "Signing out…" : "Sign out"}</span>
              </button>
            </>
          ) : (
            <button type="button" className="app-signin-button" onClick={() => startLogin()}>
              Sign in <ArrowUpRight size={15} />
            </button>
          )}
        </div>
      </header>

      <div className="app-layout">
        <aside className="app-sidebar" aria-label="Application navigation">
          <p className="app-sidebar-label">YOUR TASSEIGŌ</p>
          <nav className="app-nav">
            {navItems.map(item => {
              const active = isActive(item.href, location);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`app-nav-link${active ? " is-active" : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="app-nav-dot" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="app-sidebar-note">
            <span className="app-sidebar-note-mark" aria-hidden="true">T</span>
            <p>Find a place that fits your routine. Keep showing up.</p>
            <Link href="/" className="app-back-link">Back to TasseiGō <ArrowUpRight size={13} /></Link>
          </div>
        </aside>
        <main className="app-content" id="app-main" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
