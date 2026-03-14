import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import SignOutButton from "@/app/components/SignOutButton";
import WithdrawalSection from "@/app/components/WithdrawalSection";
import { createSupabaseServerClient } from "@/app/lib/supabase-server";
import { supabase } from "@/app/lib/supabase";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function WithdrawalsPage() {
  const supabaseAuth = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) {
    redirect("/auth/signin");
  }

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
    .select("id, name, email, wallet_balance")
    .single();

  const userId = dbUser?.id ?? user.id;
  const walletBalance = dbUser?.wallet_balance || 0;

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
      <header className="sticky top-0 z-50 border-b border-card-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/blue-logo.svg" alt="Logo" width={36} height={36} />
            <div>
              <h1 className="text-base font-bold text-foreground tracking-tight">
                Middleman
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
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Penarikan Dana</h2>
            <p className="text-sm text-muted-foreground">Kelola permintaan penarikan dari saldo wallet Anda</p>
          </div>
          <Link
            href="/dashboard"
            className="rounded-xl border border-card-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-white/3"
          >
            Kembali ke Dashboard
          </Link>
        </div>

        <div className="mb-4 rounded-2xl border border-card-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Saldo tersedia</p>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(walletBalance)}</p>
        </div>

        <WithdrawalSection userId={userId} walletBalance={walletBalance} />
      </main>
    </div>
  );
}
