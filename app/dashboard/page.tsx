import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { supabase } from "@/lib/db";
import Link from "next/link";
import DashboardClient from "./DashboardClient";
import SignOutButton from "./SignOutButton";
import type { LinkRow } from "@/app/types";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  // ── Auth guard ──
  const cookieStore = await cookies();
  const authClient = createClient(cookieStore);
  const { data: { user } } = await authClient.auth.getUser();

  if (!user) redirect("/auth/login");

  // ── Fetch user's links ──
  const { data: links } = await supabase
    .from("links")
    .select("id, short_code, custom_alias, long_url, click_count, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

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
              <span className="text-xs text-[var(--text-muted)] hidden sm:block">{user.email}</span>
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

        <DashboardClient links={(links ?? []) as LinkRow[]} />
      </main>
    </div>
  );
}
