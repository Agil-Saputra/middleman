// Shared types for Middleman

export type TransactionStatus =
    | "PENDING"
    | "SECURED"
    | "DELIVERED"
    | "COMPLETED"
    | "DISPUTED"
    | "REFUNDED";

export interface UserInfo {
    id: string;
    name: string;
    email: string;
    wallet_balance?: number;
    reputation_score?: number;
}

export interface DeliveryLog {
    id: string;
    transaction_id: string;
    file_url: string | null;
    text_proof: string | null;
    screen_record_url: string | null;
    created_at: string;
}

export interface DisputeEvidence {
    id: string;
    transaction_id: string;
    submitted_by: string;
    evidence_type: "buyer" | "seller";
    file_url: string | null;
    description: string | null;
    created_at: string;
}

export interface TransactionWithUsers {
    id: string;
    title: string;
    description: string | null;
    price: number;
    fee: number;
    total_amount: number;
    status: TransactionStatus;
    buyer_id: string;
    seller_id: string;
    mayar_payment_link: string | null;
    mayar_transaction_id: string | null;
    deadline_time: string | null;
    auto_release_at: string | null;
    dispute_reason: string | null;
    created_at: string;
    updated_at: string;
    buyer: UserInfo;
    seller: UserInfo;
    delivery_logs?: DeliveryLog[];
    dispute_evidence?: DisputeEvidence[];
}

export interface CreateTransactionPayload {
    title: string;
    description: string;
    price: number;
    buyer_email: string;
    seller_id: string;
}

// Status badge styling configuration
export const STATUS_CONFIG: Record<
    TransactionStatus,
    { label: string; labelId: string; dotClass: string; textClass: string; bgClass: string }
> = {
    PENDING: {
        label: "Pending",
        labelId: "Menunggu Pembayaran",
        dotClass: "bg-status-pending",
        textClass: "text-status-pending",
        bgClass: "bg-status-pending-bg",
    },
    SECURED: {
        label: "Secured",
        labelId: "Dana Diamankan",
        dotClass: "bg-status-paid",
        textClass: "text-status-paid",
        bgClass: "bg-status-paid-bg",
    },
    DELIVERED: {
        label: "Delivered",
        labelId: "Aset Dikirim",
        dotClass: "bg-status-delivered",
        textClass: "text-status-delivered",
        bgClass: "bg-status-delivered-bg",
    },
    COMPLETED: {
        label: "Completed",
        labelId: "Selesai",
        dotClass: "bg-status-completed",
        textClass: "text-status-completed",
        bgClass: "bg-status-completed-bg",
    },
    DISPUTED: {
        label: "Disputed",
        labelId: "Sengketa",
        dotClass: "bg-status-disputed",
        textClass: "text-status-disputed",
        bgClass: "bg-status-disputed-bg",
    },
    REFUNDED: {
        label: "Refunded",
        labelId: "Dana Dikembalikan",
        dotClass: "bg-status-disputed",
        textClass: "text-status-disputed",
        bgClass: "bg-status-disputed-bg",
    },
};

// Fee percentage
export const FEE_PERCENTAGE = 0.05;

// ─── Withdrawal Types ────────────────────────────────────────────────────────
export type WithdrawalStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "REJECTED";

export interface Withdrawal {
    id: string;
    user_id: string;
    amount: number;
    bank_name: string;
    account_number: string;
    account_holder: string;
    status: WithdrawalStatus;
    admin_note: string | null;
    created_at: string;
    updated_at: string;
}

export const WITHDRAWAL_STATUS_CONFIG: Record<
    WithdrawalStatus,
    { labelId: string; dotClass: string; textClass: string; bgClass: string }
> = {
    PENDING: {
        labelId: "Menunggu",
        dotClass: "bg-status-pending",
        textClass: "text-status-pending",
        bgClass: "bg-status-pending-bg",
    },
    PROCESSING: {
        labelId: "Diproses",
        dotClass: "bg-status-paid",
        textClass: "text-status-paid",
        bgClass: "bg-status-paid-bg",
    },
    COMPLETED: {
        labelId: "Selesai",
        dotClass: "bg-status-completed",
        textClass: "text-status-completed",
        bgClass: "bg-status-completed-bg",
    },
    REJECTED: {
        labelId: "Ditolak",
        dotClass: "bg-status-disputed",
        textClass: "text-status-disputed",
        bgClass: "bg-status-disputed-bg",
    },
};

// Auto-release period: 3 days in milliseconds
export const AUTO_RELEASE_DAYS = 3;
export const AUTO_RELEASE_MS = AUTO_RELEASE_DAYS * 24 * 60 * 60 * 1000;

// Default deadline for seller to deliver: 7 days
export const SELLER_DEADLINE_DAYS = 7;
export const SELLER_DEADLINE_MS = SELLER_DEADLINE_DAYS * 24 * 60 * 60 * 1000;
