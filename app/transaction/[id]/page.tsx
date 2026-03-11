import { supabase } from "@/app/lib/supabase";
import { notFound } from "next/navigation";
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

    // Sort delivery_logs descending by created_at (client-side since Supabase
    // doesn't support ordering embedded relations in the select shorthand)
    if (transaction.delivery_logs) {
        transaction.delivery_logs.sort(
            (a: { created_at: string }, b: { created_at: string }) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }

    // Supabase returns ISO strings by default — no need for manual serialization.
    // The `transaction` object is already JSON-serializable.

    // TODO: Replace with actual authenticated user ID
    const currentUserId = transaction.seller.id;

    return <TransactionDetail transaction={transaction} currentUserId={currentUserId} />;
}
