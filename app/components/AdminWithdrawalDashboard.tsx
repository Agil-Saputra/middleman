"use client";

import { useMemo, useState } from "react";
import {
  AdminWithdrawal,
  WithdrawalStatus,
  WITHDRAWAL_STATUS_CONFIG,
} from "@/app/lib/types";

interface AdminWithdrawalDashboardProps {
  initialWithdrawals: AdminWithdrawal[];
}

const STATUS_OPTIONS: Array<"ALL" | WithdrawalStatus> = [
  "ALL",
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "REJECTED",
];

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
    day: "2-digit",
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

export default function AdminWithdrawalDashboard({
  initialWithdrawals,
}: AdminWithdrawalDashboardProps) {
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawal[]>(initialWithdrawals);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | WithdrawalStatus>("ALL");
  const [draftStatus, setDraftStatus] = useState<Record<string, WithdrawalStatus>>({});
  const [draftNote, setDraftNote] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  const filteredWithdrawals = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();

    return withdrawals.filter((item) => {
      const statusMatch = statusFilter === "ALL" || item.status === statusFilter;
      if (!statusMatch) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      const haystack = [
        item.id,
        item.user?.name,
        item.user?.email,
        item.bank_name,
        item.account_number,
        item.account_holder,
        item.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(keyword);
    });
  }, [withdrawals, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: withdrawals.length,
      pending: withdrawals.filter((item) => item.status === "PENDING").length,
      processing: withdrawals.filter((item) => item.status === "PROCESSING").length,
      completed: withdrawals.filter((item) => item.status === "COMPLETED").length,
      rejected: withdrawals.filter((item) => item.status === "REJECTED").length,
    };
  }, [withdrawals]);

  async function handleSave(item: AdminWithdrawal) {
    setError("");
    setSuccess("");

    const nextStatus = draftStatus[item.id] ?? item.status;
    const nextNote = (draftNote[item.id] ?? item.admin_note ?? "").trim();

    setSavingId(item.id);
    try {
      const res = await fetch(`/api/admin/withdrawals/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          admin_note: nextNote,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal memperbarui withdrawal");
      }

      setWithdrawals((prev) =>
        prev.map((entry) => (entry.id === item.id ? (data as AdminWithdrawal) : entry))
      );
      setSuccess(`Status withdrawal ${item.id.slice(0, 8)} berhasil diperbarui.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSavingId(null);
    }
  }

  function exportToExcelCsv() {
    const headers = [
      "Withdrawal ID",
      "Tanggal",
      "Nama User",
      "Email User",
      "Jumlah",
      "Bank",
      "Nomor Rekening",
      "Pemilik Rekening",
      "Status",
      "Catatan Admin",
    ];

    const rows = filteredWithdrawals.map((item) => [
      item.id,
      formatDate(item.created_at),
      item.user?.name ?? "-",
      item.user?.email ?? "-",
      String(item.amount),
      item.bank_name,
      item.account_number,
      item.account_holder,
      item.status,
      item.admin_note ?? "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `withdrawals-admin-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          { label: "Total", value: stats.total },
          { label: "Menunggu", value: stats.pending },
          { label: "Diproses", value: stats.processing },
          { label: "Selesai", value: stats.completed },
          { label: "Ditolak", value: stats.rejected },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-card-border bg-card p-3">
            <p className="text-[11px] text-muted-foreground">{card.label}</p>
            <p className="text-xl font-bold text-foreground">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="glass-card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row">
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Cari nama, email, bank, rekening, atau ID withdrawal"
              className="w-full rounded-xl border border-input-border bg-input-bg px-3 py-2.5 text-sm text-foreground placeholder:text-black/50 outline-none focus:border-input-focus"
            />
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as "ALL" | WithdrawalStatus)
              }
              className="rounded-xl border border-input-border bg-input-bg px-3 py-2.5 text-sm text-foreground outline-none focus:border-input-focus"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status === "ALL"
                    ? "Semua Status"
                    : WITHDRAWAL_STATUS_CONFIG[status].labelId}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={exportToExcelCsv}
            className="rounded-xl bg-primary-blue px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-accent-hover hover:shadow-lg hover:shadow-primary-blue/20"
          >
            Export Excel (.csv)
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-xl border border-danger/20 bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-3 rounded-xl border border-status-completed/20 bg-status-completed-bg px-3 py-2 text-xs text-status-completed">
            {success}
          </div>
        )}
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-card-border bg-card/80 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Withdrawal</th>
                <th className="px-4 py-3">Tujuan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Catatan Admin</th>
                <th className="px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredWithdrawals.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    Tidak ada data withdrawal yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filteredWithdrawals.map((item) => (
                  <tr key={item.id} className="border-b border-card-border/60 align-top">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">{item.user?.name ?? "-"}</p>
                      <p className="text-xs text-muted-foreground">{item.user?.email ?? "-"}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Saldo: {formatCurrency(Number(item.user?.wallet_balance ?? 0))}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">{formatCurrency(Number(item.amount))}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(item.created_at)}</p>
                      <p className="text-[11px] text-muted-foreground">ID: {item.id.slice(0, 8)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">{item.bank_name}</p>
                      <p className="text-xs text-muted-foreground">{item.account_number}</p>
                      <p className="text-xs text-muted-foreground">a.n. {item.account_holder}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="mb-2">
                        <WithdrawalStatusBadge status={item.status} />
                      </div>
                      <select
                        value={draftStatus[item.id] ?? item.status}
                        onChange={(event) =>
                          setDraftStatus((prev) => ({
                            ...prev,
                            [item.id]: event.target.value as WithdrawalStatus,
                          }))
                        }
                        className="rounded-lg border border-input-border bg-input-bg px-2 py-1.5 text-xs text-foreground outline-none focus:border-input-focus"
                      >
                        {STATUS_OPTIONS.filter((status) => status !== "ALL").map((status) => (
                          <option key={status} value={status}>
                            {WITHDRAWAL_STATUS_CONFIG[status].labelId}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <textarea
                        rows={3}
                        value={draftNote[item.id] ?? item.admin_note ?? ""}
                        onChange={(event) =>
                          setDraftNote((prev) => ({
                            ...prev,
                            [item.id]: event.target.value,
                          }))
                        }
                        placeholder="Tulis catatan admin"
                        className="w-56 rounded-lg border border-input-border bg-input-bg px-2 py-1.5 text-xs text-foreground placeholder:text-black/50 outline-none focus:border-input-focus"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleSave(item)}
                        disabled={savingId === item.id}
                        className="rounded-lg bg-primary-blue px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {savingId === item.id ? "Menyimpan..." : "Simpan"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
