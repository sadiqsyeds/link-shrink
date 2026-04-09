"use client";

import { signOut } from "@/app/auth/actions";

export default function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--bg-raised)] text-[var(--text-primary)] hover:bg-red-500 hover:text-white transition-all duration-200"
      >
        Sign Out
      </button>
    </form>
  );
}
