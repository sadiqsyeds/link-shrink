"use server";

import { redirect } from "next/navigation";
import { hash } from "bcryptjs";
import { getUsersCollection } from "@/lib/db";

export async function signUp(formData: FormData) {
  const email = ((formData.get("email") as string) ?? "").toLowerCase().trim();
  const password = (formData.get("password") as string) ?? "";

  if (!email || !password) {
    redirect(`/auth/signup?error=${encodeURIComponent("Email and password are required.")}`);
  }

  if (password.length < 8) {
    redirect(`/auth/signup?error=${encodeURIComponent("Password must be at least 8 characters.")}`);
  }

  try {
    const users = await getUsersCollection();
    const existing = await users.findOne({ email });

    if (existing) {
      redirect(`/auth/signup?error=${encodeURIComponent("An account with this email already exists.")}`);
    }

    const hashedPassword = await hash(password, 10);
    await users.insertOne({ email, password: hashedPassword, created_at: new Date() });
  } catch (err) {
    if ((err as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw err;
    console.error("[signUp] error:", err);
    redirect(`/auth/signup?error=${encodeURIComponent("Failed to create account. Please try again.")}`);
  }

  redirect("/auth/login?message=Account created! You can now sign in.");
}
