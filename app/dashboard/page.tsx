import DashboardView from "@/app/components/DashboardView";
import CreateTransactionForm from "@/app/components/CreateTransactionForm";
import SignOutButton from "@/app/components/SignOutButton";
import { createSupabaseServerClient } from "@/app/lib/supabase-server";
import { supabase } from "@/app/lib/supabase";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { TransactionWithUsers } from "@/app/lib/types";

// Format currency for stats display
function formatVolume(amount: number): string {
  if (amount >= 1_000_000_000) return `Rp${(amount / 1_000_000_000).toFixed(1)}M`;
  if (amount >= 1_000_000) return `Rp${(amount / 1_000_000).toFixed(1)}jt`;
  if (amount >= 1_000) return `Rp${(amount / 1_000).toFixed(1)}rb`;
  return `Rp${amount}`;
}

export default async function Home() {
  const supabaseAuth = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) {
    redirect("/auth/signin");
  }

  // Ensure the user has a record in the `users` table.
  // On first login after sign-up, auto-create the row.
  const displayNameRaw =
    user.user_metadata?.name || user.email?.split("@")[0] || "User";

  const { data: dbUser } = await supabase
    .from("users")
    .upsert(
      {
        email: user.email!,
        name: displayNameRaw,
      },
      { onConflict: "email" }
    )
    .select("id, name, email, wallet_balance, reputation_score")
    .single();

  const userId = dbUser?.id;

  // Fetch transactions where the user is either buyer or seller
  let transactions: TransactionWithUsers[] = [];
  if (userId) {
    const { data, error } = await supabase
      .from("transactions")
      .select(
        "*, buyer:users!buyer_id(id, name, email), seller:users!seller_id(id, name, email)"
      )
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .order("created_at", { ascending: false });

    if (!error && data) {
      transactions = data as TransactionWithUsers[];
    }
  }

  // Compute stats from real data
  const totalTransactions = transactions.length;
  const securedCount = transactions.filter((t) => t.status === "SECURED").length;
  const walletBalance = dbUser?.wallet_balance || 0;

  // Get the display name from user metadata, or fall back to email
  const displayName =
    dbUser?.name || user.user_metadata?.name || user.email?.split("@")[0] || "User";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-card-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/blue-logo.svg" alt="Logo" width={36} height={36} />
            <div>
              <h1 className="text-base font-bold text-foreground tracking-tight">
                Middleman
              </h1>
            </div>
          </Link>

          {/* User pill + Sign Out */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-full border border-card-border bg-card px-3 py-1.5">
              <div className="h-6 w-6 rounded-full bg-primary-blue/15 flex items-center justify-center text-[10px] font-bold text-primary-blue">
                {initials}
              </div>
              <span className="text-xs font-medium text-foreground hidden sm:inline">
                {displayName}
              </span>
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Wallet + Stats Row */}
        <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-4">
          {/* Wallet Card with Withdraw */}
          <div className="glass-card p-4 animate-fade-in-up sm:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] text-muted-foreground">Saldo Wallet</p>
                <p className="text-2xl font-bold text-foreground">{formatVolume(walletBalance)}</p>
              </div>
              <Link
                href="/withdrawals"
                className="rounded-xl bg-primary-blue px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-accent-hover hover:shadow-lg hover:shadow-primary-blue/20 active:scale-[0.98]"
              >
                Tarik Dana
              </Link>
            </div>
          </div>
          {/* Other Stats */}
          {[
            { label: "Total Transaksi", value: String(totalTransactions) },
            { label: "Dana Diamankan", value: String(securedCount) },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className="glass-card p-4 animate-fade-in-up"
              style={{ animationDelay: `${(i + 1) * 0.08}s` }}
            >
              <p className="text-xl font-bold text-foreground">{stat.value}</p>
              <p className="text-[11px] text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Two-column layout */}
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Transactions list — wider */}
          <div className="lg:col-span-3">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">
                Transaksi Aktif
              </h2>
              <span className="rounded-full bg-primary-blue/10 px-2.5 py-0.5 text-xs font-semibold text-primary-blue">
                {transactions.length}
              </span>
            </div>
            <DashboardView
              transactions={transactions}
              currentUserId={userId ?? user.id}
            />
          </div>

          {/* Create form — sidebar */}
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-24">
              <CreateTransactionForm sellerId={userId ?? user.id} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
