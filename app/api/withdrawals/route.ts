import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

// ─── GET /api/withdrawals?user_id=xxx ────────────────────────────────────────
export async function GET(req: NextRequest) {
    try {
        const userId = req.nextUrl.searchParams.get("user_id");
        if (!userId) {
            return NextResponse.json(
                { error: "user_id wajib diisi" },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from("withdrawals")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false });

        if (error) {
            return NextResponse.json(
                { error: "Gagal mengambil data penarikan", details: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json(
            { error: "Gagal mengambil data penarikan", details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}

// ─── POST /api/withdrawals ───────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { user_id, amount, bank_name, account_number, account_holder } = body;

        // Validation
        if (!user_id || typeof user_id !== "string") {
            return NextResponse.json({ error: "User ID wajib diisi" }, { status: 400 });
        }
        if (!amount || typeof amount !== "number" || amount <= 0) {
            return NextResponse.json({ error: "Jumlah penarikan harus lebih dari 0" }, { status: 400 });
        }
        if (!bank_name || typeof bank_name !== "string" || !bank_name.trim()) {
            return NextResponse.json({ error: "Nama bank wajib diisi" }, { status: 400 });
        }
        if (!account_number || typeof account_number !== "string" || !account_number.trim()) {
            return NextResponse.json({ error: "Nomor rekening wajib diisi" }, { status: 400 });
        }
        if (!account_holder || typeof account_holder !== "string" || !account_holder.trim()) {
            return NextResponse.json({ error: "Nama pemilik rekening wajib diisi" }, { status: 400 });
        }

        // Check wallet balance
        const { data: user, error: userError } = await supabase
            .from("users")
            .select("wallet_balance")
            .eq("id", user_id)
            .single();

        if (userError || !user) {
            return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
        }

        if (Number(user.wallet_balance) < amount) {
            return NextResponse.json(
                { error: `Saldo tidak mencukupi. Saldo Anda: Rp${Number(user.wallet_balance).toLocaleString("id-ID")}` },
                { status: 400 }
            );
        }

        // Check for pending withdrawals
        const { data: pendingWithdrawals } = await supabase
            .from("withdrawals")
            .select("id")
            .eq("user_id", user_id)
            .in("status", ["PENDING", "PROCESSING"]);

        if (pendingWithdrawals && pendingWithdrawals.length > 0) {
            return NextResponse.json(
                { error: "Anda masih memiliki penarikan yang sedang diproses. Harap tunggu hingga selesai." },
                { status: 400 }
            );
        }

        // Deduct from wallet
        const { error: deductError } = await supabase.rpc("increment_wallet_balance", {
            user_id,
            amount: -amount,
        });

        if (deductError) {
            console.error("Deduct wallet error:", deductError);
            return NextResponse.json(
                { error: "Gagal mengurangi saldo wallet" },
                { status: 500 }
            );
        }

        // Create withdrawal record
        const { data: withdrawal, error: createError } = await supabase
            .from("withdrawals")
            .insert({
                user_id,
                amount,
                bank_name: bank_name.trim(),
                account_number: account_number.trim(),
                account_holder: account_holder.trim(),
                status: "PENDING",
            })
            .select("*")
            .single();

        if (createError) {
            // Refund the deducted amount if insertion fails
            await supabase.rpc("increment_wallet_balance", {
                user_id,
                amount,
            });
            console.error("Create withdrawal error:", createError);
            return NextResponse.json(
                { error: "Gagal membuat permintaan penarikan", details: createError.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ withdrawal }, { status: 201 });
    } catch (error) {
        console.error("POST /api/withdrawals error:", error);
        return NextResponse.json(
            { error: "Gagal membuat permintaan penarikan", details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
