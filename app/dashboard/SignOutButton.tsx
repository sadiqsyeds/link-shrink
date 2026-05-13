"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--bg-raised)] text-[var(--text-primary)] hover:bg-red-500 hover:text-white transition-all duration-200"
    >
      Sign Out
    </button>
  );
}
