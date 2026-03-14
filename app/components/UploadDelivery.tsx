"use client";

import { useState, useCallback } from "react";

interface UploadDeliveryProps {
    transactionId: string;
    onSuccess?: () => void;
}

type FormStatus = "idle" | "loading" | "success" | "error";

export default function UploadDelivery({
    transactionId,
    onSuccess,
}: UploadDeliveryProps) {
    const [fileUrl, setFileUrl] = useState("");
    const [textProof, setTextProof] = useState("");
    const [screenRecordUrl, setScreenRecordUrl] = useState("");
    const [status, setStatus] = useState<FormStatus>("idle");
    const [errorMessage, setErrorMessage] = useState("");

    const handleSubmit = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();
            setStatus("loading");
            setErrorMessage("");

            try {
                const res = await fetch(
                    `/api/transactions/${transactionId}/deliver`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            file_url: fileUrl.trim(),
                            text_proof: textProof.trim(),
                            screen_record_url: screenRecordUrl.trim() || undefined,
                        }),
                    }
                );

                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || "Gagal mengirim bukti");
                }

                setStatus("success");
                onSuccess?.();
            } catch (err) {
                setStatus("error");
                setErrorMessage(
                    err instanceof Error ? err.message : "Terjadi kesalahan"
                );
                setTimeout(() => setStatus("idle"), 4000);
            }
        },
        [transactionId, fileUrl, textProof, screenRecordUrl, onSuccess]
    );

    const isDisabled = status === "loading" || !fileUrl.trim();

    if (status === "success") {
        return (
            <div className="glass-card p-6 animate-fade-in-up">
                <div className="flex flex-col items-center text-center py-4">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-status-completed-bg">
                        <svg
                            className="h-7 w-7 text-status-completed"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                    </div>
                    <h3 className="mb-1 text-base font-semibold text-foreground">
                        Bukti Berhasil Dikirim!
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-xs">
                        Pembeli akan menerima notifikasi. Status transaksi telah diperbarui
                        menjadi <span className="font-semibold text-status-delivered">DELIVERED</span>.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="glass-card p-6 animate-fade-in-up">
            <div className="mb-5">
                <div className="flex items-center gap-2.5 mb-1.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-blue/15">
                        <svg
                            className="h-4 w-4 text-primary-blue"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                            />
                        </svg>
                    </div>
                    <h3 className="text-base font-semibold text-foreground">
                        Kirim Bukti 
                    </h3>
                </div>
                <p className="text-sm text-muted-foreground">
                    Pembayaran sudah dikonfirmasi. Kirimkan link bukti video atau foto atau file ke pembeli.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* File URL */}
                <div>
                    <label
                        htmlFor="delivery-file-url"
                        className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                        Link Bukti (Video / Foto / File)
                    </label>
                    <input
                        id="delivery-file-url"
                        type="url"
                        value={fileUrl}
                        onChange={(e) => setFileUrl(e.target.value)}
                        placeholder="https://drive.google.com/... atau https://youtube.com/..."
                        className="w-full rounded-xl border border-input-border bg-input-bg px-4 py-3 text-sm text-foreground placeholder:text-black/50 outline-none transition-all duration-200 focus:border-input-focus focus:ring-2 focus:ring-input-focus/20"
                        required
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                        Pastikan link video/foto/file bisa diakses oleh pembeli
                    </p>
                </div>

                {/* Text Proof / Notes */}
                <div>
                    <label
                        htmlFor="delivery-text-proof"
                        className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                        Catatan Tambahan{" "}
                        <span className="normal-case text-muted-foreground/60">(opsional)</span>
                    </label>
                    <textarea
                        id="delivery-text-proof"
                        value={textProof}
                        onChange={(e) => setTextProof(e.target.value)}
                        placeholder="Keterangan bukti, detail pengiriman, atau catatan tambahan..."
                        rows={3}
                        className="w-full resize-none rounded-xl border border-input-border bg-input-bg px-4 py-3 text-sm text-foreground placeholder:text-black/50 outline-none transition-all duration-200 focus:border-input-focus focus:ring-2 focus:ring-input-focus/20"
                    />
                </div>

                {/* Screen Recording URL */}
                <div>
                    <label
                        htmlFor="delivery-screen-record"
                        className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                        Link Bukti Tambahan{" "}
                        <span className="normal-case text-muted-foreground/60">(opsional)</span>
                    </label>
                    <input
                        id="delivery-screen-record"
                        type="url"
                        value={screenRecordUrl}
                        onChange={(e) => setScreenRecordUrl(e.target.value)}
                        placeholder="https://youtube.com/watch?v=... atau link cloud storage"
                        className="w-full rounded-xl border border-input-border bg-input-bg px-4 py-3 text-sm text-foreground placeholder:text-black/50 outline-none transition-all duration-200 focus:border-input-focus focus:ring-2 focus:ring-input-focus/20"
                    />
                    <p className="mt-1 text-[11px] text-status-pending">
                        ⚠ Sertakan bukti tambahan untuk memperkuat validasi jika terjadi sengketa
                    </p>
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={isDisabled}
                    className={`
            relative w-full rounded-xl py-3.5 text-sm font-semibold transition-all duration-300
            ${status === "loading"
                            ? "cursor-wait bg-primary-blue/50 text-white/70"
                            : "bg-primary-blue text-white hover:bg-accent-hover hover:shadow-lg hover:shadow-primary-blue/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                        }
          `}
                >
                    {status === "loading" ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg
                                className="h-4 w-4 animate-spin"
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
                            Mengirim...
                        </span>
                    ) : (
                        "Kirim Bukti"
                    )}
                </button>

                {/* Error */}
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
            </form>
        </div>
    );
}
