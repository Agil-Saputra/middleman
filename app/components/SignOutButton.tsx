"use client";

import { createSupabaseBrowserClient } from "@/app/lib/supabase-browser";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignOutButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/auth/signin");
    router.refresh();
  };

  return (
    <button
      onClick={handleSignOut}
      disabled={loading}
      className="flex items-center gap-1.5 rounded-lg border border-card-border bg-card px-3 py-1.5 text-xs font-medium text-muted transition-all duration-200 hover:border-danger/30 hover:bg-danger/10 hover:text-danger disabled:opacity-50"
      title="Keluar"
    >
      {loading ? (
        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-muted/30 border-t-muted" />
      ) : (
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
        </svg>
      )}
      <span className="hidden sm:inline">Keluar</span>
    </button>
  );
}
