"use client";

import Link from "next/link";
import { TransactionWithUsers, STATUS_CONFIG, TransactionStatus } from "@/app/lib/types";

interface DashboardViewProps {
    transactions: TransactionWithUsers[];
    currentUserId?: string;
}

function StatusBadge({ status }: { status: TransactionStatus }) {
    const config = STATUS_CONFIG[status];
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${config.bgClass} ${config.textClass}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${config.dotClass}`} />
            {config.labelId}
        </span>
    );
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

function formatDate(dateString: string): string {
    return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(dateString));
}

export default function DashboardView({
    transactions,
    currentUserId,
}: DashboardViewProps) {
    if (transactions.length === 0) {
        return (
            <div className="glass-card flex flex-col items-center justify-center p-12 text-center animate-fade-in-up">
                {/* Empty state icon */}
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-blue/10">
                    <svg
                        className="h-10 w-10 text-primary-blue"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
                        />
                    </svg>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">
                    Belum Ada Transaksi
                </h3>
                <p className="max-w-sm text-sm text-muted-foreground">
                    Transaksi yang kamu buat atau terima akan muncul di sini. Mulai dengan
                    membuat transaksi baru.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3 stagger-children">
            {transactions.map((tx) => {
                const isBuyer = tx.buyer_id === currentUserId;
                const roleLabel = isBuyer ? "Pembeli" : "Penjual";
                const counterparty = isBuyer ? tx.seller : tx.buyer;

                return (
                    <Link
                        key={tx.id}
                        href={`/transaction/${tx.id}`}
                        className="glass-card group block cursor-pointer p-5 transition-all duration-300 hover:translate-y-[-2px]"
                    >
                        {/* Header row: title + status */}
                        <div className="mb-3 flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                                <h3 className="truncate text-[15px] font-semibold text-foreground group-hover:text-primary-blue transition-colors">
                                    {tx.title}
                                </h3>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    {formatDate(tx.created_at)}
                                </p>
                            </div>
                            <StatusBadge status={tx.status} />
                        </div>

                        {/* Info grid */}
                        <div className="grid grid-cols-2 gap-3">
                            {/* Price */}
                            <div className="rounded-xl bg-white/[0.03] px-3 py-2.5">
                                <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                    Harga
                                </p>
                                <p className="text-sm font-bold text-foreground">
                                    {formatCurrency(tx.price)}
                                </p>
                            </div>
                            {/* Total */}
                            <div className="rounded-xl bg-white/[0.03] px-3 py-2.5">
                                <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                    Total
                                </p>
                                <p className="text-sm font-bold text-primary-blue">
                                    {formatCurrency(tx.total_amount)}
                                </p>
                            </div>
                        </div>

                        {/* Footer: role + counterparty */}
                        <div className="mt-3 flex items-center justify-between border-t border-card-border pt-3">
                            <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-blue/15 text-xs font-bold text-primary-blue">
                                    {counterparty.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-foreground">
                                        {counterparty.name}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                        {counterparty.email}
                                    </p>
                                </div>
                            </div>
                            <span className="rounded-md bg-white/[0.04] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                {roleLabel}
                            </span>
                        </div>
                    </Link>
                );
            })}
        </div>
    );
}
