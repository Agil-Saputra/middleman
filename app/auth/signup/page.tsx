"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/app/lib/supabase-browser";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Validate password match
    if (password !== confirmPassword) {
      setError("Password tidak cocok. Silakan coba lagi.");
      setLoading(false);
      return;
    }

    // Validate password length
    if (password.length < 6) {
      setError("Password minimal 6 karakter.");
      setLoading(false);
      return;
    }

    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
          data: {
            name: name.trim(),
          },
        },
      });

      if (signUpError) {
        if (signUpError.message.includes("already registered")) {
          setError("Email sudah terdaftar. Silakan masuk.");
        } else {
          setError(signUpError.message);
        }
        return;
      }

      // Check if email confirmation is required
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setError("Email sudah terdaftar. Silakan masuk.");
        return;
      }

      // If email confirmation is disabled, user is auto-confirmed
      if (data.session) {
        router.push("/dashboard");
        router.refresh();
      } else {
        // Email confirmation is enabled
        setSuccess(true);
      }
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  // Success state — email confirmation sent
  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-success/5 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-success/5 blur-3xl" />
        </div>

        <div className="relative w-full max-w-md animate-fade-in-up">
          <div className="glass-card p-8 text-center">
            {/* Success checkmark */}
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <svg className="h-8 w-8 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-foreground">Cek Email Anda</h2>
            <p className="mt-2 text-sm text-black">
              Kami telah mengirim link konfirmasi ke{" "}
              <span className="font-semibold text-foreground">{email}</span>.
              Silakan buka email dan klik link untuk mengaktifkan akun.
            </p>
            <Link
              href="/auth/signin"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary-blue px-6 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-accent-hover hover:shadow-lg hover:shadow-primary-blue/25"
            >
              Kembali ke Masuk
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      {/* Decorative background elements */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary-blue/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-primary-blue/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in-up">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/blue-logo.svg" alt="Logo" width={40} height={40} />
            <span className="text-xl font-bold tracking-tight">Middleman</span>
          </Link>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Buat Akun Baru
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Daftar untuk mulai bertransaksi aman
            </p>
          </div>
        </div>

        {/* Form Card */}
        <div className="glass-card p-8">
          <form onSubmit={handleSignUp} className="space-y-5">
            {/* Error Message */}
            {error && (
              <div className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger animate-fade-in-up">
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  {error}
                </div>
              </div>
            )}

            {/* Name */}
            <div>
              <label htmlFor="name" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Nama Lengkap
              </label>
              <input
                id="name"
                type="text"
                required
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full rounded-xl border border-input-border bg-input-bg px-4 py-3 text-sm text-foreground placeholder:text-black/50 outline-none transition-all duration-200 focus:border-input-focus focus:ring-2 focus:ring-input-focus/20"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full rounded-xl border border-input-border bg-input-bg px-4 py-3 text-sm text-foreground placeholder:text-black/50 outline-none transition-all duration-200 focus:border-input-focus focus:ring-2 focus:ring-input-focus/20"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full rounded-xl border border-input-border bg-input-bg px-4 py-3 text-sm text-foreground placeholder:text-black/50 outline-none transition-all duration-200 focus:border-input-focus focus:ring-2 focus:ring-input-focus/20"
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Konfirmasi Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi password"
                className="w-full rounded-xl border border-input-border bg-input-bg px-4 py-3 text-sm text-foreground placeholder:text-black/50 outline-none transition-all duration-200 focus:border-input-focus focus:ring-2 focus:ring-input-focus/20"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full overflow-hidden rounded-xl bg-primary-blue px-4 py-3 text-sm font-semibold text-white transition-all duration-300 hover:bg-accent-hover hover:shadow-lg hover:shadow-primary-blue/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className={`flex items-center justify-center gap-2 transition-opacity ${loading ? 'opacity-0' : 'opacity-100'}`}>
                Daftar
              </span>
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                </div>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-card-border" />
            <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">atau</span>
            <div className="h-px flex-1 bg-card-border" />
          </div>

          {/* Sign In Link */}
          <p className="text-center text-sm text-muted-foreground">
            Sudah punya akun?{" "}
            <Link
              href="/auth/signin"
              className="font-semibold text-primary-blue transition-colors hover:text-accent-hover"
            >
              Masuk di sini
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
