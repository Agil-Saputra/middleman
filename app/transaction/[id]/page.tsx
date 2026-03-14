import { supabase } from "@/app/lib/supabase";
import { createSupabaseServerClient } from "@/app/lib/supabase-server";
import { notFound, redirect } from "next/navigation";
import TransactionDetail from "./TransactionDetail";

interface TransactionPageProps {
    params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: TransactionPageProps) {
    const { id } = await params;
    const { data: transaction } = await supabase
        .from("transactions")
        .select("title")
        .eq("id", id)
        .single();

    return {
        title: transaction
            ? `${transaction.title} — Middleman`
            : "Transaksi Tidak Ditemukan",
    };
}

export default async function TransactionPage({ params }: TransactionPageProps) {
    const { id } = await params;

    // Get authenticated user
    const supabaseAuth = await createSupabaseServerClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) redirect("/auth/signin");

    // Look up user's DB id
    const { data: dbUser } = await supabase
        .from("users")
        .select("id")
        .eq("email", user.email!)
        .single();

    const currentUserId = dbUser?.id || user.id;

    const { data: transaction, error } = await supabase
        .from("transactions")
        .select(
            "*, buyer:users!buyer_id(id, name, email), seller:users!seller_id(id, name, email), delivery_logs(*)"
        )
        .eq("id", id)
        .single();

    if (error || !transaction) {
        notFound();
    }

    if (transaction.delivery_logs) {
        transaction.delivery_logs.sort(
            (a: { created_at: string }, b: { created_at: string }) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }

    return <TransactionDetail transaction={transaction} currentUserId={currentUserId} />;
}
