"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock3, Package, Shield } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { STATUS_CONFIG, TransactionStatus } from "@/app/lib/types";
import UploadDelivery from "@/app/components/UploadDelivery";

interface DeliveryLog {
    id: string;
    file_url: string | null;
    text_proof: string | null;
    screen_record_url: string | null;
    created_at: string;
}

interface TransactionData {
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
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${config.bgClass} ${config.textClass}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${config.dotClass}`} />
            {config.labelId}
        </span>
    );
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("id-ID", {
        style: "currency", currency: "IDR",
        minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(amount);
}

function formatDate(dateString: string): string {
    return new Intl.DateTimeFormat("id-ID", {
        day: "numeric", month: "long", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    }).format(new Date(dateString));
}

function CountdownTimer({ targetDate }: { targetDate: string }) {
    const [timeLeft, setTimeLeft] = useState("");

    useEffect(() => {
        function update() {
            const diff = new Date(targetDate).getTime() - Date.now();
            if (diff <= 0) {
                setTimeLeft("Waktu habis");
                return;
            }
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            setTimeLeft(`${days}h ${hours}j ${minutes}m`);
        }
        update();
        const interval = setInterval(update, 60000);
        return () => clearInterval(interval);
    }, [targetDate]);

    return <span className="font-mono text-sm font-bold text-status-pending">{timeLeft}</span>;
}

const TIMELINE_STEPS: { status: TransactionStatus; label: string; icon: LucideIcon }[] = [
    { status: "PENDING", label: "Menunggu Pembayaran", icon: Clock3 },
    { status: "SECURED", label: "Dana Diamankan", icon: Shield },
    { status: "DELIVERED", label: "Aset Dikirim", icon: Package },
    { status: "COMPLETED", label: "Selesai", icon: CheckCircle2 },
];

const STATUS_ORDER: TransactionStatus[] = ["PENDING", "SECURED", "DELIVERED", "COMPLETED"];

export default function TransactionDetail({ transaction: tx, currentUserId }: TransactionDetailProps) {
    const router = useRouter();
    const isSeller = tx.seller_id === currentUserId;
    const isBuyer = tx.buyer_id === currentUserId;
    const currentStepIndex = STATUS_ORDER.indexOf(tx.status);
    const isDisputed = tx.status === "DISPUTED";
    const isRefunded = tx.status === "REFUNDED";

    const [actionLoading, setActionLoading] = useState<"complete" | "dispute" | "check-payment" | null>(null);
    const [actionError, setActionError] = useState("");
    const [showDisputeForm, setShowDisputeForm] = useState(false);
    const [disputeReason, setDisputeReason] = useState("");
    const [disputeEvidenceUrl, setDisputeEvidenceUrl] = useState("");
    const [paymentCheckMessage, setPaymentCheckMessage] = useState("");

    // Auto-poll payment status when PENDING
    useEffect(() => {
        if (tx.status !== "PENDING") return;

        const checkPayment = async () => {
            try {
                const res = await fetch(`/api/transactions/${tx.id}/check-payment`, {
                    method: "POST",
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.updated) {
                        router.refresh();
                    }
                }
            } catch {
                // Silently ignore polling errors
            }
        };

        // Check immediately on mount
        checkPayment();

        // Then poll every 10 seconds
        const interval = setInterval(checkPayment, 10000);
        return () => clearInterval(interval);
    }, [tx.status, tx.id, router]);

    async function handleCheckPayment() {
        setActionLoading("check-payment");
        setActionError("");
        setPaymentCheckMessage("");
        try {
            const res = await fetch(`/api/transactions/${tx.id}/check-payment`, {
                method: "POST",
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Gagal memeriksa pembayaran");
            }

            if (data.updated) {
                setPaymentCheckMessage("✅ Pembayaran dikonfirmasi! Memuat ulang...");
                setTimeout(() => router.refresh(), 1000);
            } else {
                setPaymentCheckMessage(data.message || "Pembayaran belum terdeteksi");
            }
        } catch (err) {
            setActionError(err instanceof Error ? err.message : "Terjadi kesalahan");
        } finally {
            setActionLoading(null);
        }
    }

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
        if (!disputeReason.trim()) {
            setActionError("Alasan sengketa wajib diisi");
            return;
        }
        setActionLoading("dispute");
        setActionError("");
        try {
            const res = await fetch(`/api/transactions/${tx.id}/dispute`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    reason: disputeReason.trim(),
                    evidence_url: disputeEvidenceUrl.trim() || undefined,
                }),
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
                    <Link href="/dashboard" className="flex h-8 w-8 items-center justify-center rounded-lg border border-card-border bg-card text-muted-foreground transition-colors hover:text-foreground hover:border-primary-blue/30">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                        </svg>
                    </Link>
                    <div className="min-w-0 flex-1">
                        <h1 className="truncate text-sm font-semibold text-foreground">{tx.title}</h1>
                        <p className="text-[10px] text-muted-foreground font-mono">#{tx.id.slice(-8)}</p>
                    </div>
                    <StatusBadge status={tx.status} />
                </div>
            </header>

            <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 space-y-6">
                {/* Timeline */}
                {!isDisputed && !isRefunded && (
                    <div className="glass-card p-5 animate-fade-in-up">
                        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Progress Transaksi</h2>
                        <div className="flex items-start justify-between">
                            {TIMELINE_STEPS.map((step, i) => {
                                const isActive = i <= currentStepIndex;
                                const isCurrent = i === currentStepIndex;
                                const StepIcon = step.icon;
                                return (
                                    <div key={step.status} className="flex flex-1 items-center">
                                        <div className="flex flex-col items-center gap-1.5">
                                            <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-base transition-all ${isCurrent ? "bg-primary-blue text-white shadow-lg shadow-primary-blue/30 scale-110" : isActive ? "bg-primary-blue/20 text-primary-blue" : "bg-slate-200 text-muted-foreground"}`}>
                                                <StepIcon className="h-5 w-5" strokeWidth={2.2} />
                                            </div>
                                            <span className={`text-[10px] font-medium text-center max-w-[70px] ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                                                {step.label}
                                            </span>
                                        </div>
                                        {i < TIMELINE_STEPS.length - 1 && (
                                            <div className={`mx-1 mb-6 h-0.5 flex-1 rounded-full transition-all ${i < currentStepIndex ? "bg-primary-blue" : "bg-slate-200"}`} />
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
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-status-disputed-bg text-lg">⚠️</div>
                            <div>
                                <h3 className="text-sm font-semibold text-status-disputed">Transaksi Dalam Sengketa</h3>
                                <p className="text-xs text-muted-foreground">Dana sedang diproses untuk dikembalikan ke pembeli.</p>
                            </div>
                        </div>
                        {tx.dispute_reason && (
                            <div className="mt-3 rounded-lg bg-white/[0.03] p-3 text-xs text-muted-foreground">
                                <span className="font-semibold text-foreground">Alasan: </span>{tx.dispute_reason}
                            </div>
                        )}
                    </div>
                )}

                {/* Refunded Banner */}
                {isRefunded && (
                    <div className="glass-card border-status-disputed/30 bg-status-disputed-bg/30 p-5 animate-fade-in-up">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-status-disputed-bg text-lg">💸</div>
                            <div>
                                <h3 className="text-sm font-semibold text-status-disputed">Dana Dikembalikan</h3>
                                <p className="text-xs text-muted-foreground">
                                    Dana sebesar {formatCurrency(tx.total_amount)} telah dikembalikan ke wallet pembeli.
                                </p>
                            </div>
                        </div>
                        {tx.dispute_reason && (
                            <div className="mt-3 rounded-lg bg-white/[0.03] p-3 text-xs text-muted-foreground">
                                <span className="font-semibold text-foreground">Alasan sengketa: </span>{tx.dispute_reason}
                            </div>
                        )}
                    </div>
                )}

                {/* Detail Grid */}
                <div className="grid gap-6 lg:grid-cols-5">
                    {/* Left: Transaction Info */}
                    <div className="lg:col-span-3 space-y-4">
                        {/* Financial Summary */}
                        <div className="glass-card p-5 animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
                            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rincian Pembayaran</h2>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Harga</span>
                                    <span className="font-medium text-foreground">{formatCurrency(tx.price)}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Fee Platform (5%)</span>
                                    <span className="font-medium text-status-pending">{formatCurrency(tx.fee)}</span>
                                </div>
                                <div className="border-t border-card-border pt-3 flex items-center justify-between">
                                    <span className="text-sm font-semibold text-foreground">Total Pembayaran</span>
                                    <span className="text-lg font-bold text-primary-blue">{formatCurrency(tx.total_amount)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        {tx.description && (
                            <div className="glass-card p-5 animate-fade-in-up" style={{ animationDelay: "0.07s" }}>
                                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Deskripsi</h2>
                                <p className="text-sm text-muted-foreground leading-relaxed">{tx.description}</p>
                            </div>
                        )}

                        {/* Parties */}
                        <div className="glass-card p-5 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
                            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pihak Transaksi</h2>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="rounded-xl bg-white/[0.03] p-3.5">
                                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                        Penjual {isSeller && <span className="text-primary-blue">(Anda)</span>}
                                    </p>
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-blue/15 text-sm font-bold text-primary-blue">
                                            {tx.seller.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-foreground">{tx.seller.name}</p>
                                            <p className="text-[11px] text-muted-foreground">{tx.seller.email}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="rounded-xl bg-white/[0.03] p-3.5">
                                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                        Pembeli {isBuyer && <span className="text-primary-blue">(Anda)</span>}
                                    </p>
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-status-paid-bg text-sm font-bold text-status-paid">
                                            {tx.buyer.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-foreground">{tx.buyer.name}</p>
                                            <p className="text-[11px] text-muted-foreground">{tx.buyer.email}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Delivery Logs */}
                        {tx.delivery_logs.length > 0 && (
                            <div className="glass-card p-5 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
                                <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Riwayat Bukti</h2>
                                <div className="space-y-3">
                                    {tx.delivery_logs.map((log) => (
                                        <div key={log.id} className="rounded-xl border border-card-border bg-white/[0.02] p-4">
                                            <div className="flex items-start justify-between gap-3 mb-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-status-delivered-bg">
                                                        <svg className="h-3.5 w-3.5 text-status-delivered" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-3.061a4.5 4.5 0 00-1.242-7.244l4.5-4.5a4.5 4.5 0 016.364 6.364l-1.757 1.757" />
                                                        </svg>
                                                    </div>
                                                    {log.file_url && (
                                                        <a href={log.file_url} target="_blank" rel="noopener noreferrer"
                                                            className="truncate text-sm font-medium text-primary-blue hover:text-accent-hover transition-colors">
                                                            {log.file_url}
                                                        </a>
                                                    )}
                                                </div>
                                                <span className="shrink-0 text-[10px] text-muted-foreground">{formatDate(log.created_at)}</span>
                                            </div>
                                            {log.text_proof && (
                                                <p className="ml-8 text-xs text-muted-foreground leading-relaxed">{log.text_proof}</p>
                                            )}
                                            {log.screen_record_url && (
                                                <div className="ml-8 mt-2">
                                                    <a href={log.screen_record_url} target="_blank" rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 rounded-lg bg-status-pending-bg px-2.5 py-1.5 text-xs font-medium text-status-pending hover:bg-status-pending/20 transition-colors">
                                                        🎥 Screen Recording
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Metadata */}
                        <div className="glass-card p-5 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
                            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Info Teknis</h2>
                            <div className="grid gap-2 text-xs sm:grid-cols-2">
                                <div className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2">
                                    <span className="text-muted-foreground">ID Transaksi</span>
                                    <span className="font-mono text-foreground">{tx.id.slice(-12)}</span>
                                </div>
                                <div className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2">
                                    <span className="text-muted-foreground">Dibuat</span>
                                    <span className="text-foreground">{formatDate(tx.created_at)}</span>
                                </div>
                                {tx.mayar_transaction_id && (
                                    <div className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2">
                                        <span className="text-muted-foreground">ID Mayar</span>
                                        <span className="font-mono text-foreground">{tx.mayar_transaction_id.slice(-12)}</span>
                                    </div>
                                )}
                                <div className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2">
                                    <span className="text-muted-foreground">Update Terakhir</span>
                                    <span className="text-foreground">{formatDate(tx.updated_at)}</span>
                                </div>
                                {tx.deadline_time && (
                                    <div className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2">
                                        <span className="text-muted-foreground">Batas Kirim</span>
                                        <span className="text-foreground">{formatDate(tx.deadline_time)}</span>
                                    </div>
                                )}
                                {tx.auto_release_at && (
                                    <div className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2">
                                        <span className="text-muted-foreground">Auto-release</span>
                                        <span className="text-foreground">{formatDate(tx.auto_release_at)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Actions Sidebar */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="lg:sticky lg:top-20 space-y-4">
                            {/* Payment link for buyer (PENDING) */}
                            {tx.status === "PENDING" && tx.mayar_payment_link && (
                                <div className="glass-card p-5 animate-fade-in-up">
                                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Link Pembayaran</h3>
                                    <div className="mb-3 rounded-lg bg-white/[0.05] p-2.5 text-xs text-muted-foreground break-all font-mono">{tx.mayar_payment_link}</div>
                                    <a href={tx.mayar_payment_link} target="_blank" rel="noopener noreferrer"
                                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-blue py-3 text-sm font-semibold text-white transition-all hover:bg-accent-hover hover:shadow-lg hover:shadow-primary-blue/20 mb-2.5">
                                        Bayar Sekarang
                                    </a>
                                    <button onClick={handleCheckPayment} disabled={actionLoading === "check-payment"}
                                        className="w-full rounded-xl border border-card-border bg-white/[0.03] py-3 text-sm font-medium text-muted-foreground transition-all hover:text-foreground hover:border-primary-blue/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
                                        {actionLoading === "check-payment" ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                </svg>
                                                Memeriksa...
                                            </span>
                                        ) : "🔄 Cek Status Pembayaran"}
                                    </button>
                                    {paymentCheckMessage && (
                                        <p className="mt-2.5 text-center text-xs text-muted-foreground">{paymentCheckMessage}</p>
                                    )}
                                    {actionError && (
                                        <div className="mt-2.5 flex items-center gap-2 rounded-lg border border-status-disputed/20 bg-status-disputed-bg px-3 py-2.5 text-xs text-status-disputed">
                                            {actionError}
                                        </div>
                                    )}
                                    <p className="mt-3 text-center text-[10px] text-muted-foreground">
                                        Status akan otomatis diperbarui setelah pembayaran selesai.
                                    </p>
                                </div>
                            )}

                            {/* SECURED state — buyer sees "Dana Diamankan" */}
                            {tx.status === "SECURED" && isBuyer && (
                                <div className="glass-card p-5 animate-fade-in-up">
                                    <div className="flex flex-col items-center text-center py-2">
                                        <div className="mb-3 text-3xl">🔒</div>
                                        <h3 className="mb-1 text-sm font-semibold text-foreground">Dana Diamankan</h3>
                                        <p className="text-xs text-muted-foreground">
                                            Pembayaran Anda telah diterima dan dana diamankan di escrow. Menunggu penjual mengirim link bukti video atau foto atau file.
                                        </p>
                                        {tx.deadline_time && (
                                            <div className="mt-3 rounded-lg bg-white/[0.03] px-3 py-2 w-full">
                                                <p className="text-[10px] text-muted-foreground mb-1">Batas waktu pengiriman:</p>
                                                <CountdownTimer targetDate={tx.deadline_time} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* SECURED state — seller uploads delivery */}
                            {tx.status === "SECURED" && isSeller && (
                                <div className="space-y-4">
                                    <div className="glass-card p-5 animate-fade-in-up">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div>
                                                <h3 className="text-sm font-semibold text-foreground">Pembeli Sudah Bayar!</h3>
                                                <p className="text-xs text-muted-foreground">Dana diamankan. Silakan kirim link bukti video atau foto atau file.</p>
                                            </div>
                                        </div>
                                        {tx.deadline_time && (
                                            <div className="rounded-lg bg-status-pending-bg/50 px-3 py-2">
                                                <p className="text-[10px] text-muted-foreground mb-1">Batas waktu pengiriman:</p>
                                                <CountdownTimer targetDate={tx.deadline_time} />
                                            </div>
                                        )}
                                    </div>
                                    <UploadDelivery transactionId={tx.id} onSuccess={() => router.refresh()} />
                                </div>
                            )}

                            {/* DELIVERED state — buyer actions */}
                            {tx.status === "DELIVERED" && isBuyer && (
                                <div className="space-y-4">
                                    {/* Auto-release countdown */}
                                    {tx.auto_release_at && (
                                        <div className="glass-card p-4 animate-fade-in-up border-status-pending/30">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-sm">⏰</span>
                                                <p className="text-xs font-semibold text-foreground">Auto-release dalam:</p>
                                            </div>
                                            <CountdownTimer targetDate={tx.auto_release_at} />
                                            <p className="mt-1.5 text-[10px] text-muted-foreground">
                                                Jika tidak ada konfirmasi atau sengketa, dana otomatis diteruskan ke penjual.
                                            </p>
                                        </div>
                                    )}

                                    {/* Files from seller */}
                                    {tx.delivery_logs.length > 0 && (
                                        <div className="glass-card p-5 animate-fade-in-up">
                                            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">File dari Penjual</h3>
                                            {tx.delivery_logs.map((log) => (
                                                <div key={log.id} className="rounded-xl bg-white/[0.03] p-3.5 mb-2 last:mb-0">
                                                    {log.file_url && (
                                                        <a href={log.file_url} target="_blank" rel="noopener noreferrer"
                                                            className="flex items-center gap-2 rounded-lg bg-primary-blue/10 px-3 py-2.5 text-sm font-medium text-primary-blue hover:bg-primary-blue/20 transition-colors mb-2">
                                                            <span className="truncate">{log.file_url}</span>
                                                        </a>
                                                    )}
                                                    {log.text_proof && <p className="text-xs text-muted-foreground leading-relaxed">{log.text_proof}</p>}
                                                    <p className="mt-1.5 text-[10px] text-black/60">{formatDate(log.created_at)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Action buttons */}
                                    <div className="glass-card p-5 animate-fade-in-up">
                                        <p className="mb-4 text-sm text-muted-foreground">
                                            Periksa aset yang diterima. Jika sudah sesuai, konfirmasi selesai. Jika ada masalah, ajukan sengketa.
                                        </p>
                                        <button onClick={handleComplete} disabled={actionLoading !== null}
                                            className="w-full rounded-xl bg-status-completed py-3 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mb-2.5">
                                            {actionLoading === "complete" ? "Memproses..." : "✓ Konfirmasi Selesai"}
                                        </button>
                                        {!showDisputeForm ? (
                                            <button onClick={() => setShowDisputeForm(true)} disabled={actionLoading !== null}
                                                className="w-full rounded-xl border border-status-disputed/30 bg-status-disputed-bg py-3 text-sm font-semibold text-status-disputed transition-all hover:bg-status-disputed/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
                                                ⚠ Ajukan Sengketa
                                            </button>
                                        ) : (
                                            <div className="rounded-xl border border-status-disputed/20 bg-status-disputed-bg/50 p-3.5 space-y-3">
                                                <textarea value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)}
                                                    placeholder="Jelaskan alasan sengketa Anda (wajib)..." rows={3}
                                                    className="w-full resize-none rounded-lg border border-input-border bg-input-bg px-3 py-2.5 text-sm text-foreground placeholder:text-black/50 outline-none focus:border-input-focus" />
                                                <input type="url" value={disputeEvidenceUrl} onChange={(e) => setDisputeEvidenceUrl(e.target.value)}
                                                    placeholder="Link bukti (screenshot/video) — opsional"
                                                    className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2.5 text-sm text-foreground placeholder:text-black/50 outline-none focus:border-input-focus" />
                                                <p className="text-[10px] text-muted-foreground">
                                                    ⚠ Dana akan dikembalikan ke wallet Anda setelah sengketa diajukan.
                                                </p>
                                                <div className="flex gap-2">
                                                    <button onClick={handleDispute} disabled={actionLoading !== null || !disputeReason.trim()}
                                                        className="flex-1 rounded-lg bg-status-disputed py-2.5 text-xs font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50">
                                                        {actionLoading === "dispute" ? "Mengirim..." : "Kirim Sengketa"}
                                                    </button>
                                                    <button onClick={() => { setShowDisputeForm(false); setDisputeReason(""); setDisputeEvidenceUrl(""); }}
                                                        className="rounded-lg border border-card-border px-3 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                                                        Batal
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        {actionError && (
                                            <div className="mt-3 flex items-center gap-2 rounded-lg border border-status-disputed/20 bg-status-disputed-bg px-3 py-2.5 text-xs text-status-disputed">
                                                {actionError}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* DELIVERED state — seller waiting with auto-release info */}
                            {tx.status === "DELIVERED" && isSeller && (
                                <div className="glass-card p-5 animate-fade-in-up">
                                    <div className="flex flex-col items-center text-center py-2">
                                        <div className="mb-3 text-3xl">📬</div>
                                        <h3 className="mb-1 text-sm font-semibold text-foreground">Bukti Telah Dikirim</h3>
                                        <p className="text-xs text-muted-foreground">
                                            Menunggu pembeli mengkonfirmasi bukti yang telah dikirim.
                                        </p>
                                        {tx.auto_release_at && (
                                            <div className="mt-3 rounded-lg bg-status-completed-bg/50 px-3 py-2 w-full">
                                                <p className="text-[10px] text-muted-foreground mb-1">Dana otomatis masuk dalam:</p>
                                                <CountdownTimer targetDate={tx.auto_release_at} />
                                                <p className="mt-1 text-[10px] text-muted-foreground">
                                                    Jika pembeli tidak merespons dalam 3 hari.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Completed state */}
                            {tx.status === "COMPLETED" && (
                                <div className="glass-card p-5 animate-fade-in-up">
                                    <div className="flex flex-col items-center text-center py-2">
                                        <div className="mb-3 text-3xl">🎉</div>
                                        <h3 className="mb-1 text-sm font-semibold text-status-completed">Transaksi Selesai</h3>
                                        <p className="text-xs text-muted-foreground">
                                            {isSeller
                                                ? `Dana sebesar ${formatCurrency(tx.price)} telah ditambahkan ke wallet Anda.`
                                                : "Dana telah diteruskan ke wallet penjual. Terima kasih telah menggunakan Middleman!"}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Refunded state */}
                            {isRefunded && (
                                <div className="glass-card p-5 animate-fade-in-up">
                                    <div className="flex flex-col items-center text-center py-2">
                                        <div className="mb-3 text-3xl">💸</div>
                                        <h3 className="mb-1 text-sm font-semibold text-status-disputed">Dana Dikembalikan</h3>
                                        <p className="text-xs text-muted-foreground">
                                            {isBuyer
                                                ? `Dana sebesar ${formatCurrency(tx.total_amount)} telah dikembalikan ke wallet Anda.`
                                                : "Dana telah dikembalikan ke pembeli karena sengketa."}
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
