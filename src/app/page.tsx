"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
    </div>
  );
}
