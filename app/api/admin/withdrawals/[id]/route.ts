import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/app/lib/supabase-server";
import { supabase } from "@/app/lib/supabase";
import { WithdrawalStatus } from "@/app/lib/types";

const ALLOWED_STATUS: WithdrawalStatus[] = [
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "REJECTED",
];

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authorized = await authorizeAdmin();
    if (authorized.error) {
      return authorized.error;
    }

    const { id } = await params;
    const body = await req.json();
    const status = body?.status as WithdrawalStatus;
    const adminNote = typeof body?.admin_note === "string" ? body.admin_note.trim() : null;

    if (!status || !ALLOWED_STATUS.includes(status)) {
      return NextResponse.json({ error: "Status withdrawal tidak valid" }, { status: 400 });
    }

    const { data: updated, error } = await supabase
      .from("withdrawals")
      .update({
        status,
        admin_note: adminNote || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(
        "id, user_id, amount, bank_name, account_number, account_holder, status, admin_note, created_at, updated_at, user:users!user_id(id, name, email, wallet_balance, reputation_score)"
      )
      .single();

    if (error || !updated) {
      return NextResponse.json(
        { error: "Gagal memperbarui status withdrawal", details: error?.message },
        { status: 500 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Gagal memperbarui status withdrawal",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
