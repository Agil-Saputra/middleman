![Middleman Logo](public/blue-logo.svg)

# Middleman — Aplikasi Rekening Bersama

Middleman adalah aplikasi escrow untuk transaksi digital/jasa yang melibatkan **pembeli** dan **penjual** dalam satu platform.
Dana pembeli ditahan terlebih dahulu, lalu diteruskan ke penjual saat transaksi selesai dan kedua belah pihak merasa puas.

## Fitur Utama

- Autentikasi user (sign up / sign in) via Supabase Auth.
- Pembuatan transaksi dengan fee platform otomatis (**5%**).
- Integrasi pembayaran dengan **Mayar** (payment link + webhook + pengecekan manual).
- Alur status transaksi:
  - `PENDING` → `SECURED` → `DELIVERED` → `COMPLETED`
  - Jalur sengketa: `DELIVERED` → `DISPUTED` → `REFUNDED`
- Upload bukti pengiriman oleh penjual.
- Konfirmasi selesai / ajukan sengketa oleh pembeli.
- Auto-release transaksi (`/api/transactions/auto-release`) untuk transaksi `DELIVERED` yang melewati batas waktu lebih dari 3 hari.
- Wallet internal + withdrawal user.
- Dashboard admin untuk approval/update status withdrawal + export CSV.

## Tech Stack

- **Next.js 16** (App Router)
- **React 19**
- **TypeScript**
- **Supabase** (Auth + Database)
- **Tailwind CSS**


## Kredensial Demo (User & Admin)

Gunakan kredensial berikut agar bisa mencoba semua role.

### A. Akun User (Buyer)

- Email: `bukanagel@gmail.com`
- Password: `123456`

### B. Akun User (Seller)

- Email: `ragelyusuf752@gmail.com`
- Password: `123456`

### C. Akun Admin

- Email: `admin@gmail.com`
- Password: `admin`

## Cara Menggunakan Aplikasi (End-to-End)

### Sebagai Seller

1. Login sebagai `seller@test.com`.
2. Buka dashboard.
3. Buat transaksi baru:
	- Isi judul, deskripsi, harga.
	- Isi email buyer: `bukanagel@gmail.com`.
4. Sistem membuat transaksi + payment link Mayar.

### Sebagai Buyer

1. Login sebagai `bukanagel@gmail.com`.
2. Buka detail transaksi.
3. Jika pembayaran sudah terdeteksi, status menjadi `SECURED`.
4. Setelah seller mengirim bukti (`DELIVERED`), buyer bisa:
	- **Complete** transaksi (dana masuk wallet seller), atau
	- **Dispute** (dana direfund ke wallet buyer).

### Sebagai Admin

1. Login sebagai `admin@gmail.com`.
2. Masuk ke halaman `/admin`.
3. Kelola request withdrawal:
	- Ubah status (`PENDING`, `PROCESSING`, `COMPLETED`, `REJECTED`)
	- Isi catatan admin
	- Export data CSV

## Notes untuk Reviewer

- Jika setelah selesai pembayaran namun status transaksi belum terupdate, gunakan tombol/flow pengecekan manual payment (`check-payment`) di halaman detail transaksi.

