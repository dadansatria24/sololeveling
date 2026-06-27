"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function HomePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        router.replace("/dashboard");
      } else {
        setChecking(false);
      }
    };

    check();
  }, [router]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
        <div className="text-center space-y-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent mx-auto" />
          <p className="text-zinc-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] px-4">
      <div className="text-center space-y-8">
        <div className="space-y-2">
          <h1 className="text-5xl font-black text-white tracking-tight">
            Solo Leveling
          </h1>
          <p className="text-lg text-zinc-400">
            Level up your daily habits, one quest at a time.
          </p>
        </div>

        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="rounded-xl bg-purple-600 px-8 py-3.5 text-sm font-semibold text-white transition-all hover:bg-purple-500 hover:shadow-lg hover:shadow-purple-500/20"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-8 py-3.5 text-sm font-semibold text-zinc-300 transition-all hover:border-zinc-500 hover:text-white hover:bg-zinc-800"
          >
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}
