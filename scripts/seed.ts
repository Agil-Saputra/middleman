import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupTables() {
    console.log("🔧 Creating tables...\n");

    // Create users table
    const { error: usersErr } = await supabase.rpc("exec_sql", {
        query: `
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                role TEXT DEFAULT 'buyer',
                wallet_balance NUMERIC DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT now(),
                updated_at TIMESTAMPTZ DEFAULT now()
            );
        `,
    });

    if (usersErr) {
        console.log(
            "⚠️  Could not create users table via RPC (this is expected if the RPC doesn't exist)."
        );
        console.log(
            "   Please run the SQL below in Supabase Dashboard > SQL Editor:\n"
        );
        console.log(`
-- ═══════════════════════════════════════════════════════════════
-- Run this in Supabase Dashboard > SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'buyer',
    wallet_balance NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    price NUMERIC NOT NULL,
    fee NUMERIC NOT NULL DEFAULT 0,
    total_amount NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    buyer_id UUID NOT NULL REFERENCES users(id),
    seller_id UUID NOT NULL REFERENCES users(id),
    mayar_payment_link TEXT,
    mayar_transaction_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Delivery logs table
CREATE TABLE IF NOT EXISTS delivery_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id),
    file_url TEXT NOT NULL,
    text_proof TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. RPC function for incrementing wallet balance
CREATE OR REPLACE FUNCTION increment_wallet_balance(user_id UUID, amount NUMERIC)
RETURNS void AS $$
BEGIN
    UPDATE users SET wallet_balance = wallet_balance + amount WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

-- 5. Seed dummy users
INSERT INTO users (name, email, role, wallet_balance)
VALUES
    ('Buyer Test', 'bukanagel@gmail.com', 'buyer', 0),
    ('Seller Test', 'seller@test.com', 'seller', 0)
ON CONFLICT (email) DO NOTHING;
        `);
        return false;
    }

    return true;
}

async function seed() {
    const tablesReady = await setupTables();

    if (!tablesReady) {
        console.log(
            "\n📋 After running the SQL above, your dummy users will be ready."
        );
        console.log(
            '   Buyer email:  bukanagel@gmail.com'
        );
        console.log(
            '   Seller email: seller@test.com'
        );
        return;
    }

    // If tables were created via RPC, seed the data
    const users = [
        { name: "Buyer Test", email: "bukanagel@gmail.com", role: "buyer", wallet_balance: 0 },
        { name: "Seller Test", email: "seller@test.com", role: "seller", wallet_balance: 0 },
    ];

    for (const user of users) {
        const { data, error } = await supabase
            .from("users")
            .upsert(user, { onConflict: "email" })
            .select()
            .single();

        if (error) {
            console.error(`❌ Failed to seed user ${user.email}:`, error.message);
        } else {
            console.log(`✅ User seeded: ${data.name} (${data.email}) — ID: ${data.id}`);
        }
    }

    console.log("\n🎉 Seeding complete!");
}

seed().catch(console.error);
