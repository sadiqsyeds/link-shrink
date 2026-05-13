import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getLinksCollection } from "@/lib/db";
import Link from "next/link";
import DashboardClient from "./DashboardClient";
import SignOutButton from "./SignOutButton";
import ThemeToggle from "@/components/ThemeToggle";
import type { LinkRow } from "@/app/types";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/login");

  const links = await getLinksCollection();
  const rows = await links
    .find({ user_id: session.user.id })
    .sort({ created_at: -1 })
    .limit(50)
    .toArray();

  const linkRows: LinkRow[] = rows.map((r) => ({
    id: r._id.toString(),
    long_url: r.long_url as string,
    short_code: r.short_code as string,
    custom_alias: (r.custom_alias as string | null) ?? null,
    user_id: r.user_id as string | null,
    click_count: (r.click_count as number) ?? 0,
    created_at: (r.created_at as Date).toISOString(),
  }));

  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      {/* Navbar */}
      <header className="nav-glass fixed top-0 inset-x-0 z-50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
              </div>
              <span className="text-[15px] font-semibold tracking-tight text-[var(--text-primary)]">LinkShrink</span>
            </Link>
            <div className="flex items-center gap-3">
              <span className="text-xs text-[var(--text-muted)] hidden sm:block">{session.user.email}</span>
              <ThemeToggle />
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Dashboard</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Manage your links and view analytics.</p>
        </div>
        <DashboardClient links={linkRows} />
      </main>
    </div>
  );
}
