import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/app/lib/supabase-server";
import { supabase } from "@/app/lib/supabase";

export async function GET() {
  try {
    const supabaseAuth = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: dbUser } = await supabase
      .from("users")
      .select("role")
      .eq("email", user.email)
      .single();

    const role = dbUser?.role ?? "buyer";
    const redirectTo = role === "admin" ? "/admin" : "/dashboard";

    return NextResponse.json({ role, redirectTo });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Gagal menentukan redirect login",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
