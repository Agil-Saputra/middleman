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
                reputation_score INTEGER DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT now(),
                updated_at TIMESTAMPTZ DEFAULT now()
            );
            ALTER TABLE users ADD COLUMN IF NOT EXISTS reputation_score INTEGER DEFAULT 0;
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
    reputation_score INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1b. Add new columns if table already exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS reputation_score INTEGER DEFAULT 0;

-- 2. Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL,
    fee NUMERIC NOT NULL DEFAULT 0,
    total_amount NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    buyer_id UUID NOT NULL REFERENCES users(id),
    seller_id UUID NOT NULL REFERENCES users(id),
    mayar_payment_link TEXT,
    mayar_transaction_id TEXT,
    deadline_time TIMESTAMPTZ,
    auto_release_at TIMESTAMPTZ,
    dispute_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2b. Add new columns if table already exists
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS deadline_time TIMESTAMPTZ;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS auto_release_at TIMESTAMPTZ;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS dispute_reason TEXT;

-- 3. Delivery logs table
CREATE TABLE IF NOT EXISTS delivery_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id),
    file_url TEXT NOT NULL,
    text_proof TEXT,
    screen_record_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3b. Add new column if table already exists
ALTER TABLE delivery_logs ADD COLUMN IF NOT EXISTS screen_record_url TEXT;

-- 4. Dispute evidence table
CREATE TABLE IF NOT EXISTS dispute_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id),
    submitted_by UUID NOT NULL REFERENCES users(id),
    evidence_type TEXT NOT NULL DEFAULT 'buyer',
    file_url TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. RPC function for incrementing wallet balance
CREATE OR REPLACE FUNCTION increment_wallet_balance(user_id UUID, amount NUMERIC)
RETURNS void AS $$
BEGIN
    UPDATE users SET wallet_balance = wallet_balance + amount WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

-- 6. Withdrawals table
CREATE TABLE IF NOT EXISTS withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    amount NUMERIC NOT NULL,
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    account_holder TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    admin_note TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Migrate existing PAID status to SECURED
UPDATE transactions SET status = 'SECURED' WHERE status = 'PAID';

-- 7. Seed dummy users
INSERT INTO users (name, email, role, wallet_balance)
VALUES
    ('Buyer Test', 'bukanagel@gmail.com', 'buyer', 0),
    ('Seller Test', 'seller@test.com', 'seller', 0),
    ('Admin Middleman', 'admin@middleman.id', 'admin', 0)
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
    const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@middleman.id";
    const adminName = process.env.SEED_ADMIN_NAME || "Admin Middleman";

    const users = [
        { name: "Buyer Test", email: "bukanagel@gmail.com", role: "buyer", wallet_balance: 0 },
        { name: "Seller Test", email: "seller@test.com", role: "seller", wallet_balance: 0 },
        { name: adminName, email: adminEmail, role: "admin", wallet_balance: 0 },
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
    console.log(`🔐 Admin seeded: ${adminName} (${adminEmail})`);
}

seed().catch(console.error);
