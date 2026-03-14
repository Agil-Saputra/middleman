import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/app/lib/supabase-server";
import { supabase } from "@/app/lib/supabase";

async function authorizeAdmin() {
  const supabaseAuth = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user?.email) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: dbUser, error } = await supabase
    .from("users")
    .select("id, role")
    .eq("email", user.email)
    .single();

  if (error || !dbUser || dbUser.role !== "admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { adminId: dbUser.id };
}

export async function GET(req: NextRequest) {
  try {
    const authorized = await authorizeAdmin();
    if (authorized.error) {
      return authorized.error;
    }

    const status = req.nextUrl.searchParams.get("status");
    const search = req.nextUrl.searchParams.get("q")?.trim();

    let query = supabase
      .from("withdrawals")
      .select(
        "id, user_id, amount, bank_name, account_number, account_holder, status, admin_note, created_at, updated_at, user:users!user_id(id, name, email, wallet_balance, reputation_score)"
      )
      .order("created_at", { ascending: false });

    if (status && status !== "ALL") {
      query = query.eq("status", status);
    }

    if (search) {
      query = query.or(
        `bank_name.ilike.%${search}%,account_number.ilike.%${search}%,account_holder.ilike.%${search}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: "Gagal mengambil data withdrawal", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data ?? []);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Gagal mengambil data withdrawal",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
