"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Withdrawal,
    WithdrawalStatus,
    WITHDRAWAL_STATUS_CONFIG,
} from "@/app/lib/types";

interface WithdrawalSectionProps {
    userId: string;
    walletBalance: number;
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

function WithdrawalStatusBadge({ status }: { status: WithdrawalStatus }) {
    const config = WITHDRAWAL_STATUS_CONFIG[status];
    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${config.bgClass} ${config.textClass}`}
        >
            <span className={`h-1.5 w-1.5 rounded-full ${config.dotClass}`} />
            {config.labelId}
        </span>
    );
}

const BANK_OPTIONS = [
    "BCA",
    "BNI",
    "BRI",
    "Mandiri",
    "BSI",
    "CIMB Niaga",
    "Danamon",
    "Permata",
    "BTPN",
    "OCBC NISP",
    "Maybank",
    "Jago",
    "Blu (BCA Digital)",
    "SeaBank",
    "Bank Neo",
    "GoPay",
    "OVO",
    "DANA",
    "ShopeePay",
    "Lainnya",
];

export default function WithdrawalSection({
    userId,
    walletBalance,
}: WithdrawalSectionProps) {
    const [showForm, setShowForm] = useState(false);
    const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // Form state
    const [amount, setAmount] = useState("");
    const [bankName, setBankName] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [accountHolder, setAccountHolder] = useState("");

    const fetchWithdrawals = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/withdrawals?user_id=${userId}`);
            if (res.ok) {
                const data = await res.json();
                setWithdrawals(data);
            }
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchWithdrawals();
    }, [fetchWithdrawals]);

    function resetForm() {
        setAmount("");
        setBankName("");
        setAccountNumber("");
        setAccountHolder("");
        setError("");
        setSuccess("");
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setSuccess("");

        const numAmount = Number(amount);
        if (!numAmount || numAmount <= 0) {
            setError("Jumlah penarikan harus lebih dari 0");
            return;
        }
        if (numAmount > walletBalance) {
            setError("Saldo tidak mencukupi");
            return;
        }
        if (!bankName) {
            setError("Pilih bank tujuan");
            return;
        }
        if (!accountNumber.trim()) {
            setError("Nomor rekening wajib diisi");
            return;
        }
        if (!accountHolder.trim()) {
            setError("Nama pemilik rekening wajib diisi");
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch("/api/withdrawals", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: userId,
                    amount: numAmount,
                    bank_name: bankName,
                    account_number: accountNumber.trim(),
                    account_holder: accountHolder.trim(),
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Gagal membuat permintaan penarikan");
            }

            setSuccess("Permintaan penarikan berhasil diajukan!");
            resetForm();
            setShowForm(false);
            fetchWithdrawals();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Terjadi kesalahan");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="space-y-3">
            {/* Withdraw Button */}
            {!showForm && (
                <button
                    onClick={() => {
                        setShowForm(true);
                        setError("");
                        setSuccess("");
                    }}
                    disabled={walletBalance <= 0}
                    className="w-full rounded-xl bg-primary-blue py-2.5 text-sm font-semibold text-white transition-all hover:bg-accent-hover hover:shadow-lg hover:shadow-primary-blue/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed px-6"
                >
                     Tarik Dana
                </button>
            )}

            {success && (
                <div className="rounded-lg border border-status-completed/20 bg-status-completed-bg px-3 py-2.5 text-xs text-status-completed">
                    {success}
                </div>
            )}

            {/* Withdrawal Form */}
            {showForm && (
                <div className="glass-card p-4 animate-fade-in-up space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Penarikan Dana
                        </h3>
                        <button
                            onClick={() => {
                                setShowForm(false);
                                resetForm();
                            }}
                            className="text-muted-foreground hover:text-foreground transition-colors"
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
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    </div>

                    <div className="rounded-lg bg-white/[0.03] px-3 py-2 text-xs">
                        <span className="text-muted-foreground">Saldo tersedia: </span>
                        <span className="font-semibold text-primary-blue">
                            {formatCurrency(walletBalance)}
                        </span>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-3">
                        {/* Amount */}
                        <div>
                            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                                Jumlah Penarikan
                            </label>
                            <div className="relative">
                                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                    Rp
                                </span>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0"
                                    min="1"
                                    max={walletBalance}
                                    className="w-full rounded-lg border border-input-border bg-input-bg pl-8 pr-3 py-2.5 text-sm text-foreground placeholder:text-black/50 outline-none focus:border-input-focus"
                                />
                            </div>
                            {walletBalance > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setAmount(String(walletBalance))}
                                    className="mt-1 text-[10px] font-medium text-primary-blue hover:text-accent-hover transition-colors"
                                >
                                    Tarik semua
                                </button>
                            )}
                        </div>

                        {/* Bank Name */}
                        <div>
                            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                                Bank / E-Wallet Tujuan
                            </label>
                            <select
                                value={bankName}
                                onChange={(e) => setBankName(e.target.value)}
                                className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2.5 text-sm text-foreground outline-none focus:border-input-focus appearance-none"
                            >
                                <option value="">Pilih bank...</option>
                                {BANK_OPTIONS.map((bank) => (
                                    <option key={bank} value={bank}>
                                        {bank}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Account Number */}
                        <div>
                            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                                Nomor Rekening
                            </label>
                            <input
                                type="text"
                                value={accountNumber}
                                onChange={(e) =>
                                    setAccountNumber(e.target.value.replace(/[^0-9]/g, ""))
                                }
                                placeholder="Masukkan nomor rekening"
                                className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2.5 text-sm text-foreground placeholder:text-black/50 outline-none focus:border-input-focus"
                            />
                        </div>

                        {/* Account Holder */}
                        <div>
                            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                                Nama Pemilik Rekening
                            </label>
                            <input
                                type="text"
                                value={accountHolder}
                                onChange={(e) => setAccountHolder(e.target.value)}
                                placeholder="Sesuai buku rekening"
                                className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2.5 text-sm text-foreground placeholder:text-black/50 outline-none focus:border-input-focus"
                            />
                        </div>

                        {error && (
                            <div className="rounded-lg border border-status-disputed/20 bg-status-disputed-bg px-3 py-2.5 text-xs text-status-disputed">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full rounded-xl bg-primary-blue py-2.5 text-sm font-semibold text-white transition-all hover:bg-accent-hover active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg
                                        className="h-4 w-4 animate-spin"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        />
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                        />
                                    </svg>
                                    Memproses...
                                </span>
                            ) : (
                                "Ajukan Penarikan"
                            )}
                        </button>
                    </form>
                </div>
            )}

            {/* Withdrawal History */}
            {withdrawals.length > 0 && (
                <div className="glass-card p-4 animate-fade-in-up">
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Riwayat Penarikan
                    </h3>
                    <div className="space-y-2">
                        {withdrawals.map((w) => (
                            <div
                                key={w.id}
                                className="rounded-xl bg-white/[0.03] p-3 border border-card-border"
                            >
                                <div className="flex items-start justify-between gap-2 mb-1.5">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-foreground">
                                            {formatCurrency(w.amount)}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">
                                            {w.bank_name} • {w.account_number}
                                        </p>
                                    </div>
                                    <WithdrawalStatusBadge status={w.status} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] text-muted-foreground">
                                        a.n. {w.account_holder}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                        {formatDate(w.created_at)}
                                    </p>
                                </div>
                                {w.admin_note && (
                                    <div className="mt-1.5 rounded-md bg-white/[0.03] px-2 py-1.5 text-[10px] text-muted-foreground">
                                        <span className="font-semibold text-foreground">
                                            Catatan:{" "}
                                        </span>
                                        {w.admin_note}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {loading && withdrawals.length === 0 && (
                <div className="text-center py-4">
                    <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-primary-blue border-t-transparent" />
                </div>
            )}
        </div>
    );
}
