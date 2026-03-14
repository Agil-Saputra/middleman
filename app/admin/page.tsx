import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import SignOutButton from "@/app/components/SignOutButton";
import AdminWithdrawalDashboard from "@/app/components/AdminWithdrawalDashboard";
import { createSupabaseServerClient } from "@/app/lib/supabase-server";
import { supabase } from "@/app/lib/supabase";
import { AdminWithdrawal } from "@/app/lib/types";

export default async function AdminPage() {
  const supabaseAuth = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user?.email) {
    redirect("/auth/signin");
  }

  const { data: dbUser } = await supabase
    .from("users")
    .select("id, name, email, role")
    .eq("email", user.email)
    .single();

  if (!dbUser || dbUser.role !== "admin") {
    redirect("/dashboard");
  }

  const { data: withdrawals } = await supabase
    .from("withdrawals")
    .select(
      "id, user_id, amount, bank_name, account_number, account_holder, status, admin_note, created_at, updated_at, user:users!user_id(id, name, email, wallet_balance, reputation_score)"
    )
    .order("created_at", { ascending: false });

  const displayName = dbUser.name || user.user_metadata?.name || user.email;
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-card-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/blue-logo.svg" alt="Logo" width={36} height={36} />
            <div>
              <h1 className="text-base font-bold tracking-tight text-foreground">
                Middleman Admin
              </h1>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-full border border-card-border bg-card px-3 py-1.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-blue/15 text-[10px] font-bold text-primary-blue">
                {initials}
              </div>
              <span className="hidden text-xs font-medium text-foreground sm:inline">
                {displayName}
              </span>
              <span className="rounded-full bg-primary-blue/10 px-2 py-0.5 text-[10px] font-semibold text-primary-blue">
                ADMIN
              </span>
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Dashboard Admin Withdrawal</h2>
            <p className="text-sm text-muted-foreground">
              Monitor seluruh withdrawal user, update status, dan export data.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="rounded-xl border border-card-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-white/3"
          >
            Kembali ke Dashboard User
          </Link>
        </div>

        <AdminWithdrawalDashboard
          initialWithdrawals={(withdrawals ?? []) as AdminWithdrawal[]}
        />
      </main>
    </div>
  );
}
