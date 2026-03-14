"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FEE_PERCENTAGE } from "@/app/lib/types";

interface CreateTransactionFormProps {
    sellerId?: string;
    onSuccess?: () => void;
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

type FormStatus = "idle" | "loading" | "success" | "error";

export default function CreateTransactionForm({
    sellerId,
    onSuccess,
}: CreateTransactionFormProps) {
    const router = useRouter();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("");
    const [buyerEmail, setBuyerEmail] = useState("");
    const [status, setStatus] = useState<FormStatus>("idle");
    const [errorMessage, setErrorMessage] = useState("");
    const [paymentLink, setPaymentLink] = useState<string | null>(null);
    const [warningMessage, setWarningMessage] = useState("");
    const [copyState, setCopyState] = useState<"idle" | "success" | "error">("idle");

    const numericPrice = parseFloat(price) || 0;
    const fee = numericPrice * FEE_PERCENTAGE;
    const totalAmount = numericPrice + fee;

    const handleSubmit = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();
            setStatus("loading");
            setErrorMessage("");
            setPaymentLink(null);
            setWarningMessage("");

            try {
                const res = await fetch("/api/transactions", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        title: title.trim(),
                        description: description.trim(),
                        price: numericPrice,
                        buyer_email: buyerEmail.trim(),
                        seller_id: sellerId || "demo-seller",
                    }),
                });

                if (!res.ok) {
                    const errData = await res.json();
                    throw new Error(errData.error || "Gagal membuat transaksi");
                }

                const data = await res.json();

                setStatus("success");
                setTitle("");
                setDescription("");
                setPrice("");
                setBuyerEmail("");

                // Store payment link from Mayar response
                if (data.payment_link) {
                    setPaymentLink(data.payment_link);
                }

                // Show warning if Mayar call failed but transaction was saved
                if (data.warning) {
                    setWarningMessage(data.warning);
                }

                onSuccess?.();
                router.refresh();
            } catch (err) {
                setStatus("error");
                setErrorMessage(
                    err instanceof Error ? err.message : "Terjadi kesalahan"
                );
                setTimeout(() => setStatus("idle"), 4000);
            }
        },
        [title, description, numericPrice, buyerEmail, sellerId, onSuccess, router]
    );

    const isDisabled = status === "loading" || !title.trim() || !numericPrice || !buyerEmail.trim();

    const handleCopyPaymentLink = useCallback(async () => {
        if (!paymentLink) return;

        try {
            await navigator.clipboard.writeText(paymentLink);
            setCopyState("success");
        } catch {
            setCopyState("error");
        }

        setTimeout(() => {
            setCopyState("idle");
        }, 2000);
    }, [paymentLink]);

    return (
        <div className="glass-card p-6 animate-fade-in-up">
            <div className="mb-6">
                <h2 className="text-lg font-semibold text-foreground">
                    Buat Transaksi Baru
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    Isi detail transaksi di bawah. Fee platform sebesar 5% akan
                    ditambahkan otomatis.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Judul Transaksi */}
                <div>
                    <label
                        htmlFor="tx-title"
                        className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                        Judul Transaksi
                    </label>
                    <input
                        id="tx-title"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Contoh: Desain Logo Brand"
                        className="w-full rounded-xl border border-input-border bg-input-bg px-4 py-3 text-sm text-foreground placeholder:text-black/50 outline-none transition-all duration-200 focus:border-input-focus focus:ring-2 focus:ring-input-focus/20"
                        required
                    />
                </div>

                {/* Deskripsi */}
                <div>
                    <label
                        htmlFor="tx-description"
                        className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                        Deskripsi <span className="normal-case text-muted-foreground/60">(opsional)</span>
                    </label>
                    <textarea
                        id="tx-description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Jelaskan detail jasa/aset yang ditawarkan..."
                        rows={3}
                        className="w-full resize-none rounded-xl border border-input-border bg-input-bg px-4 py-3 text-sm text-foreground placeholder:text-black/50 outline-none transition-all duration-200 focus:border-input-focus focus:ring-2 focus:ring-input-focus/20"
                    />
                </div>

                {/* Harga */}
                <div>
                    <label
                        htmlFor="tx-price"
                        className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                        Harga (IDR)
                    </label>
                    <input
                        id="tx-price"
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="150000"
                        min="1000"
                        step="1000"
                        className="w-full rounded-xl border border-input-border bg-input-bg px-4 py-3 text-sm text-foreground placeholder:text-black/50 outline-none transition-all duration-200 focus:border-input-focus focus:ring-2 focus:ring-input-focus/20"
                        required
                    />
                </div>

                {/* Email Pembeli */}
                <div>
                    <label
                        htmlFor="tx-buyer-email"
                        className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                        Email Pembeli
                    </label>
                    <input
                        id="tx-buyer-email"
                        type="email"
                        value={buyerEmail}
                        onChange={(e) => setBuyerEmail(e.target.value)}
                        placeholder="pembeli@email.com"
                        className="w-full rounded-xl border border-input-border bg-input-bg px-4 py-3 text-sm text-foreground placeholder:text-black/50 outline-none transition-all duration-200 focus:border-input-focus focus:ring-2 focus:ring-input-focus/20"
                        required
                    />
                </div>

                {/* Fee Breakdown */}
                {numericPrice > 0 && (
                    <div className="rounded-xl border border-card-border bg-white/2 p-4 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Harga</span>
                            <span className="text-foreground font-medium">
                                {formatCurrency(numericPrice)}
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Fee Platform (5%)</span>
                            <span className="text-status-pending font-medium">
                                {formatCurrency(fee)}
                            </span>
                        </div>
                        <div className="border-t border-card-border pt-2 flex items-center justify-between text-sm">
                            <span className="font-semibold text-foreground">Total</span>
                            <span className="font-bold text-primary-blue text-base">
                                {formatCurrency(totalAmount)}
                            </span>
                        </div>
                    </div>
                )}

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={isDisabled}
                    className={`
            relative w-full rounded-xl py-3.5 text-sm font-semibold transition-all duration-300
            ${status === "loading"
                            ? "cursor-wait bg-primary-blue/50 text-white/70"
                            : status === "success"
                                ? "bg-success text-white"
                                : "bg-primary-blue text-white hover:bg-accent-hover hover:shadow-lg hover:shadow-primary-blue/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                        }
          `}
                >
                    {status === "loading" && (
                        <span className="absolute inset-0 flex items-center justify-center">
                            <svg
                                className="h-5 w-5 animate-spin text-white"
                                fill="none"
                                viewBox="0 0 24 24"
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
                        </span>
                    )}
                    <span className={status === "loading" ? "invisible" : ""}>
                        {status === "success"
                            ? "Transaksi Berhasil Dibuat!"
                            : "Buat Transaksi"}
                    </span>
                </button>

                {/* Error Message */}
                {status === "error" && (
                    <div className="flex items-center gap-2 rounded-xl border border-status-disputed/20 bg-status-disputed-bg px-4 py-3 text-sm text-status-disputed animate-fade-in-up">
                        <svg
                            className="h-4 w-4 shrink-0"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                            />
                        </svg>
                        {errorMessage}
                    </div>
                )}

                {/* Payment Link — shown after success */}
                {paymentLink && status === "success" && (
                    <div className="rounded-xl border border-status-completed/20 bg-status-completed-bg p-4 animate-fade-in-up">
                        <p className="mb-3 text-sm font-medium text-status-completed">
                            Transaksi berhasil! Kirim link berikut ke pembeli:
                        </p>
                        <div className="mb-3 rounded-lg bg-white/5 p-2.5 text-xs text-muted-foreground break-all font-mono">
                            {paymentLink}
                        </div>
                        <button
                            type="button"
                            onClick={handleCopyPaymentLink}
                            className="w-full rounded-lg border border-card-border bg-white/3 py-2.5 text-sm font-semibold text-foreground transition-all hover:border-primary-blue/30 hover:text-primary-blue active:scale-[0.98]"
                        >
                            {copyState === "success"
                                ? "✓ Link berhasil disalin"
                                : copyState === "error"
                                    ? "Gagal menyalin, coba lagi"
                                    : "Copy Link Pembayaran"}
                        </button>
                    </div>
                )}

                {/* Warning — Mayar failed but transaction saved */}
                {warningMessage && (
                    <div className="flex items-center gap-2 rounded-xl border border-status-pending/20 bg-status-pending-bg px-4 py-3 text-sm text-status-pending animate-fade-in-up">
                        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                        {warningMessage}
                    </div>
                )}
            </form>
        </div>
    );
}
