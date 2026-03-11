"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { STATUS_CONFIG, TransactionStatus } from "@/app/lib/types";
import UploadDelivery from "@/app/components/UploadDelivery";

interface DeliveryLog {
    id: string;
    file_url: string | null;
    text_proof: string | null;
    created_at: string;
}

interface TransactionData {
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
    buyer: { id: string; name: string; email: string };
    seller: { id: string; name: string; email: string };
    delivery_logs: DeliveryLog[];
}

interface TransactionDetailProps {
    transaction: TransactionData;
    currentUserId: string;
}

function StatusBadge({ status }: { status: TransactionStatus }) {
    const config = STATUS_CONFIG[status];
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${config.bgClass} ${config.textClass}`}
        >
            <span className={`h-1.5 w-1.5 rounded-full ${config.dotClass}`} />
            {config.label}
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
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(dateString));
}

// Status timeline steps
const TIMELINE_STEPS: { status: TransactionStatus; label: string; icon: string }[] = [
    { status: "PENDING", label: "Menunggu Pembayaran", icon: "⏳" },
    { status: "PAID", label: "Pembayaran Diterima", icon: "💳" },
    { status: "DELIVERED", label: "Aset Dikirim", icon: "📦" },
    { status: "COMPLETED", label: "Selesai", icon: "✅" },
];

const STATUS_ORDER: TransactionStatus[] = [
    "PENDING",
    "PAID",
    "DELIVERED",
    "COMPLETED",
];

export default function TransactionDetail({
    transaction: tx,
    currentUserId,
}: TransactionDetailProps) {
    const router = useRouter();
    const isSeller = tx.seller_id === currentUserId;
    const isBuyer = tx.buyer_id === currentUserId;
    const currentStepIndex = STATUS_ORDER.indexOf(tx.status);
    const isDisputed = tx.status === "DISPUTED";

    const [actionLoading, setActionLoading] = useState<"complete" | "dispute" | null>(null);
    const [actionError, setActionError] = useState("");
    const [showDisputeForm, setShowDisputeForm] = useState(false);
    const [disputeReason, setDisputeReason] = useState("");

    async function handleComplete() {
        setActionLoading("complete");
        setActionError("");
        try {
            const res = await fetch(`/api/transactions/${tx.id}/complete`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Gagal menyelesaikan transaksi");
            }
            router.refresh();
        } catch (err) {
            setActionError(err instanceof Error ? err.message : "Terjadi kesalahan");
            setActionLoading(null);
        }
    }

    async function handleDispute() {
        setActionLoading("dispute");
        setActionError("");
        try {
            const res = await fetch(`/api/transactions/${tx.id}/dispute`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reason: disputeReason.trim() }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Gagal mengajukan dispute");
            }
            router.refresh();
        } catch (err) {
            setActionError(err instanceof Error ? err.message : "Terjadi kesalahan");
            setActionLoading(null);
        }
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-50 border-b border-card-border bg-background/80 backdrop-blur-xl">
                <div className="mx-auto flex h-14 max-w-4xl items-center gap-3 px-4 sm:px-6">
                    <Link
                        href="/"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-card-border bg-card text-muted transition-colors hover:text-foreground hover:border-accent/30"
                    >
                        <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15.75 19.5L8.25 12l7.5-7.5"
                            />
                        </svg>
                    </Link>
                    <div className="min-w-0 flex-1">
                        <h1 className="truncate text-sm font-semibold text-foreground">
                            {tx.title}
                        </h1>
                        <p className="text-[10px] text-muted font-mono">
                            #{tx.id.slice(-8)}
                        </p>
                    </div>
                    <StatusBadge status={tx.status} />
                </div>
            </header>

            <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 space-y-6">
                {/* Timeline (not shown if disputed) */}
                {!isDisputed && (
                    <div className="glass-card p-5 animate-fade-in-up">
                        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted">
                            Progress Transaksi
                        </h2>
                        <div className="flex items-center justify-between">
                            {TIMELINE_STEPS.map((step, i) => {
                                const isActive = i <= currentStepIndex;
                                const isCurrent = i === currentStepIndex;
                                return (
                                    <div key={step.status} className="flex flex-1 items-center">
                                        <div className="flex flex-col items-center gap-1.5">
                                            <div
                                                className={`flex h-10 w-10 items-center justify-center rounded-xl text-base transition-all ${isCurrent
                                                    ? "bg-accent text-white shadow-lg shadow-accent/30 scale-110"
                                                    : isActive
                                                        ? "bg-accent/20 text-accent"
                                                        : "bg-white/[0.04] text-muted"
                                                    }`}
                                            >
                                                {step.icon}
                                            </div>
                                            <span
                                                className={`text-[10px] font-medium text-center max-w-[70px] ${isActive ? "text-foreground" : "text-muted"
                                                    }`}
                                            >
                                                {step.label}
                                            </span>
                                        </div>
                                        {i < TIMELINE_STEPS.length - 1 && (
                                            <div
                                                className={`mx-1 h-0.5 flex-1 rounded-full transition-all ${i < currentStepIndex ? "bg-accent" : "bg-white/[0.06]"
                                                    }`}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Disputed Banner */}
                {isDisputed && (
                    <div className="glass-card border-status-disputed/30 bg-status-disputed-bg/30 p-5 animate-fade-in-up">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-status-disputed-bg text-lg">
                                ⚠️
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-status-disputed">
                                    Transaksi Dalam Sengketa
                                </h3>
                                <p className="text-xs text-muted">
                                    Tim Middleman sedang meninjau kasus ini.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Detail Grid */}
                <div className="grid gap-6 lg:grid-cols-5">
                    {/* Left: Transaction Info */}
                    <div className="lg:col-span-3 space-y-4">
                        {/* Financial Summary */}
                        <div className="glass-card p-5 animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
                            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted">
                                Rincian Pembayaran
                            </h2>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted">Harga</span>
                                    <span className="font-medium text-foreground">
                                        {formatCurrency(tx.price)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted">Fee Platform (5%)</span>
                                    <span className="font-medium text-status-pending">
                                        {formatCurrency(tx.fee)}
                                    </span>
                                </div>
                                <div className="border-t border-card-border pt-3 flex items-center justify-between">
                                    <span className="text-sm font-semibold text-foreground">
                                        Total Pembayaran
                                    </span>
                                    <span className="text-lg font-bold text-accent">
                                        {formatCurrency(tx.total_amount)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Parties */}
                        <div className="glass-card p-5 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
                            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted">
                                Pihak Transaksi
                            </h2>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {/* Seller */}
                                <div className="rounded-xl bg-white/[0.03] p-3.5">
                                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
                                        Penjual {isSeller && <span className="text-accent">(Anda)</span>}
                                    </p>
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-sm font-bold text-accent">
                                            {tx.seller.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-foreground">
                                                {tx.seller.name}
                                            </p>
                                            <p className="text-[11px] text-muted">{tx.seller.email}</p>
                                        </div>
                                    </div>
                                </div>
                                {/* Buyer */}
                                <div className="rounded-xl bg-white/[0.03] p-3.5">
                                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
                                        Pembeli {isBuyer && <span className="text-accent">(Anda)</span>}
                                    </p>
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-status-paid-bg text-sm font-bold text-status-paid">
                                            {tx.buyer.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-foreground">
                                                {tx.buyer.name}
                                            </p>
                                            <p className="text-[11px] text-muted">{tx.buyer.email}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Delivery Logs */}
                        {tx.delivery_logs.length > 0 && (
                            <div className="glass-card p-5 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
                                <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted">
                                    Riwayat Pengiriman
                                </h2>
                                <div className="space-y-3">
                                    {tx.delivery_logs.map((log) => (
                                        <div
                                            key={log.id}
                                            className="rounded-xl border border-card-border bg-white/[0.02] p-4"
                                        >
                                            <div className="flex items-start justify-between gap-3 mb-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-status-delivered-bg">
                                                        <svg
                                                            className="h-3.5 w-3.5 text-status-delivered"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            strokeWidth={2}
                                                            stroke="currentColor"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-3.061a4.5 4.5 0 00-1.242-7.244l4.5-4.5a4.5 4.5 0 016.364 6.364l-1.757 1.757"
                                                            />
                                                        </svg>
                                                    </div>
                                                    {log.file_url && (
                                                        <a
                                                            href={log.file_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="truncate text-sm font-medium text-accent hover:text-accent-hover transition-colors"
                                                        >
                                                            {log.file_url}
                                                        </a>
                                                    )}
                                                </div>
                                                <span className="shrink-0 text-[10px] text-muted">
                                                    {formatDate(log.created_at)}
                                                </span>
                                            </div>
                                            {log.text_proof && (
                                                <p className="ml-8 text-xs text-muted leading-relaxed">
                                                    {log.text_proof}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Metadata */}
                        <div className="glass-card p-5 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
                            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
                                Info Teknis
                            </h2>
                            <div className="grid gap-2 text-xs sm:grid-cols-2">
                                <div className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2">
                                    <span className="text-muted">ID Transaksi</span>
                                    <span className="font-mono text-foreground">{tx.id.slice(-12)}</span>
                                </div>
                                <div className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2">
                                    <span className="text-muted">Dibuat</span>
                                    <span className="text-foreground">{formatDate(tx.created_at)}</span>
                                </div>
                                {tx.mayar_transaction_id && (
                                    <div className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2">
                                        <span className="text-muted">ID Mayar</span>
                                        <span className="font-mono text-foreground">{tx.mayar_transaction_id.slice(-12)}</span>
                                    </div>
                                )}
                                <div className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2">
                                    <span className="text-muted">Update Terakhir</span>
                                    <span className="text-foreground">{formatDate(tx.updated_at)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Actions Sidebar */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="lg:sticky lg:top-20">
                            {/* Payment link for buyer (PENDING) */}
                            {tx.status === "PENDING" && tx.mayar_payment_link && (
                                <div className="glass-card p-5 animate-fade-in-up">
                                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
                                        Link Pembayaran
                                    </h3>
                                    <div className="mb-3 rounded-lg bg-white/[0.05] p-2.5 text-xs text-muted break-all font-mono">
                                        {tx.mayar_payment_link}
                                    </div>
                                    <a
                                        href={tx.mayar_payment_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-semibold text-white transition-all hover:bg-accent-hover hover:shadow-lg hover:shadow-accent/20"
                                    >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                                        </svg>
                                        Bayar Sekarang
                                    </a>
                                </div>
                            )}

                            {/* Upload delivery (PAID + seller) */}
                            {tx.status === "PAID" && isSeller && (
                                <UploadDelivery
                                    transactionId={tx.id}
                                    onSuccess={() => router.refresh()}
                                />
                            )}

                            {/* Waiting for delivery (PAID + buyer) */}
                            {tx.status === "PAID" && isBuyer && (
                                <div className="glass-card p-5 animate-fade-in-up">
                                    <div className="flex flex-col items-center text-center py-2">
                                        <div className="mb-3 text-3xl">📦</div>
                                        <h3 className="mb-1 text-sm font-semibold text-foreground">
                                            Menunggu Pengiriman
                                        </h3>
                                        <p className="text-xs text-muted">
                                            Pembayaran Anda telah diterima. Penjual sedang
                                            menyiapkan aset digital Anda.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Delivered state — buyer actions */}
                            {tx.status === "DELIVERED" && isBuyer && (
                                <div className="space-y-4">
                                    {/* Delivery data card */}
                                    {tx.delivery_logs.length > 0 && (
                                        <div className="glass-card p-5 animate-fade-in-up">
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-status-delivered-bg">
                                                    <svg className="h-3.5 w-3.5 text-status-delivered" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                                    </svg>
                                                </div>
                                                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                                                    File dari Penjual
                                                </h3>
                                            </div>
                                            {tx.delivery_logs.map((log) => (
                                                <div key={log.id} className="rounded-xl bg-white/[0.03] p-3.5 mb-2 last:mb-0">
                                                    {log.file_url && (
                                                        <a
                                                            href={log.file_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-2 rounded-lg bg-accent/10 px-3 py-2.5 text-sm font-medium text-accent hover:bg-accent/20 transition-colors mb-2"
                                                        >
                                                            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                                            </svg>
                                                            <span className="truncate">{log.file_url}</span>
                                                        </a>
                                                    )}
                                                    {log.text_proof && (
                                                        <p className="text-xs text-muted leading-relaxed">
                                                            {log.text_proof}
                                                        </p>
                                                    )}
                                                    <p className="mt-1.5 text-[10px] text-muted/60">
                                                        {formatDate(log.created_at)}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Action buttons */}
                                    <div className="glass-card p-5 animate-fade-in-up">
                                        <p className="mb-4 text-sm text-muted">
                                            Periksa file yang diterima. Jika sudah sesuai, terima pesanan. Jika ada masalah, ajukan revisi.
                                        </p>

                                        {/* Terima Pesanan */}
                                        <button
                                            onClick={handleComplete}
                                            disabled={actionLoading !== null}
                                            className="w-full rounded-xl bg-status-completed py-3 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mb-2.5"
                                        >
                                            {actionLoading === "complete" ? (
                                                <span className="flex items-center justify-center gap-2">
                                                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                    </svg>
                                                    Memproses...
                                                </span>
                                            ) : (
                                                "✓ Terima Pesanan"
                                            )}
                                        </button>

                                        {/* Ajukan Dispute */}
                                        {!showDisputeForm ? (
                                            <button
                                                onClick={() => setShowDisputeForm(true)}
                                                disabled={actionLoading !== null}
                                                className="w-full rounded-xl border border-status-disputed/30 bg-status-disputed-bg py-3 text-sm font-semibold text-status-disputed transition-all hover:bg-status-disputed/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                ⚠ Ajukan Revisi / Dispute
                                            </button>
                                        ) : (
                                            <div className="rounded-xl border border-status-disputed/20 bg-status-disputed-bg/50 p-3.5 space-y-3">
                                                <textarea
                                                    value={disputeReason}
                                                    onChange={(e) => setDisputeReason(e.target.value)}
                                                    placeholder="Jelaskan alasan dispute Anda..."
                                                    rows={3}
                                                    className="w-full resize-none rounded-lg border border-input-border bg-input-bg px-3 py-2.5 text-sm text-foreground placeholder:text-muted/50 outline-none focus:border-input-focus"
                                                />
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={handleDispute}
                                                        disabled={actionLoading !== null}
                                                        className="flex-1 rounded-lg bg-status-disputed py-2.5 text-xs font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50"
                                                    >
                                                        {actionLoading === "dispute" ? "Mengirim..." : "Kirim Dispute"}
                                                    </button>
                                                    <button
                                                        onClick={() => { setShowDisputeForm(false); setDisputeReason(""); }}
                                                        className="rounded-lg border border-card-border px-3 py-2.5 text-xs font-medium text-muted hover:text-foreground transition-colors"
                                                    >
                                                        Batal
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Error message */}
                                        {actionError && (
                                            <div className="mt-3 flex items-center gap-2 rounded-lg border border-status-disputed/20 bg-status-disputed-bg px-3 py-2.5 text-xs text-status-disputed">
                                                <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                                                </svg>
                                                {actionError}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Delivered state — seller waiting */}
                            {tx.status === "DELIVERED" && isSeller && (
                                <div className="glass-card p-5 animate-fade-in-up">
                                    <div className="flex flex-col items-center text-center py-2">
                                        <div className="mb-3 text-3xl">📬</div>
                                        <h3 className="mb-1 text-sm font-semibold text-foreground">
                                            Aset Telah Dikirim
                                        </h3>
                                        <p className="text-xs text-muted">
                                            Menunggu pembeli mengkonfirmasi penerimaan aset.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Completed state */}
                            {tx.status === "COMPLETED" && (
                                <div className="glass-card p-5 animate-fade-in-up">
                                    <div className="flex flex-col items-center text-center py-2">
                                        <div className="mb-3 text-3xl">🎉</div>
                                        <h3 className="mb-1 text-sm font-semibold text-status-completed">
                                            Transaksi Selesai
                                        </h3>
                                        <p className="text-xs text-muted">
                                            Dana telah diteruskan ke wallet penjual. Terima kasih
                                            telah menggunakan Middleman!
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
