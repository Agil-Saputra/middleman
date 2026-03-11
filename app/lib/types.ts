// Shared types for Middleman

export type TransactionStatus =
    | "PENDING"
    | "PAID"
    | "DELIVERED"
    | "COMPLETED"
    | "DISPUTED";

export interface UserInfo {
    id: string;
    name: string;
    email: string;
}

export interface TransactionWithUsers {
    id: string;
    title: string;
    price: number;
    fee: number;
    total_amount: number;
    status: TransactionStatus;
    buyer_id: string;
    seller_id: string;
    mayar_payment_link: string | null;
    mayar_transaction_id: string | null;
    created_at: string;
    updated_at: string;
    buyer: UserInfo;
    seller: UserInfo;
}

export interface CreateTransactionPayload {
    title: string;
    price: number;
    buyer_email: string;
    seller_id: string;
}

// Status badge styling configuration
export const STATUS_CONFIG: Record<
    TransactionStatus,
    { label: string; dotClass: string; textClass: string; bgClass: string }
> = {
    PENDING: {
        label: "Pending",
        dotClass: "bg-status-pending",
        textClass: "text-status-pending",
        bgClass: "bg-status-pending-bg",
    },
    PAID: {
        label: "Paid",
        dotClass: "bg-status-paid",
        textClass: "text-status-paid",
        bgClass: "bg-status-paid-bg",
    },
    DELIVERED: {
        label: "Delivered",
        dotClass: "bg-status-delivered",
        textClass: "text-status-delivered",
        bgClass: "bg-status-delivered-bg",
    },
    COMPLETED: {
        label: "Completed",
        dotClass: "bg-status-completed",
        textClass: "text-status-completed",
        bgClass: "bg-status-completed-bg",
    },
    DISPUTED: {
        label: "Disputed",
        dotClass: "bg-status-disputed",
        textClass: "text-status-disputed",
        bgClass: "bg-status-disputed-bg",
    },
};

// Fee percentage
export const FEE_PERCENTAGE = 0.05;
