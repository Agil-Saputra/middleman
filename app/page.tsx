"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import { Hero } from "@/components/ui/animated-hero";
import { FeatureSteps } from "@/components/ui/feature-steps";
import DisplayCards from "@/components/ui/display-cards";
import Features from "@/components/ui/main-features";

import {
  Shield,
  Eye,
  ThumbsUp,
  RefreshCcw,
  ChevronDown,
  Globe,
  Menu,
  X,
  ShieldCheck,
  Lock,
  Smile,
  AlertTriangle,
  ArrowRight,
  ShoppingCart,
  Car,
  Cpu,
  Building2,
  Star,
  Mail,
  MapPin,
  Handshake,
  Wallet,
  CheckCircle2,
} from "lucide-react";

/* ─────────────────── Data ─────────────────── */

const NAV_LINKS = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Fitur", href: "#features" },
  { label: "Cara Kerja", href: "#how-it-works" },
];

const CATEGORIES = [
  "Jual Beli Akun",
  "Elektronik",
  "Properti",
  "Kendaraan",
  "Biro Jasa",
];

const TRUST_POINTS = [
  { icon: ShieldCheck, text: "Transaksi aman dan terjamin" },
  { icon: Lock, text: "Pengaturan Rekber Tanpa Repot" },
  { icon: Smile, text: "Kenyamanan dan Kepercayaan" },
  { icon: AlertTriangle, text: "Mencegah Penipuan" },
];

const FEATURES = [
  {
    icon: Shield,
    title: "Dana Ditahan Aman",
    desc: "Uang pembeli ditahan di rekening bersama Middleman dan baru diteruskan ke penjual setelah barang diterima sesuai kesepakatan.",
  },
  {
    icon: Eye,
    title: "Pantau Status Real-Time",
    desc: "Pembeli dan penjual bisa memantau setiap tahap transaksi secara langsung — dari pembayaran hingga barang sampai.",
  },
  {
    icon: RefreshCcw,
    title: "Garansi Uang Kembali",
    desc: "Jika barang tidak sesuai deskripsi atau penjual gagal mengirim, dana 100% dikembalikan ke pembeli.",
  },
  {
    icon: Lock,
    title: "Tanpa Ribet, Tanpa Tipu",
    desc: "Cukup buat transaksi, bayar, dan tunggu barang dikirim. Middleman yang mengamankan dana Anda dari risiko penipuan.",
  },
];

const HOW_IT_WORKS_FEATURES = [
  {
    id: "step-1",
    title: "1. Sepakati Transaksi",
    description:
      "Pembeli dan penjual menyepakati detail barang, harga, dan biaya pengiriman. Setelah sepakat, pembeli memilih metode pembayaran menggunakan Middleman.",
    image:
      "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=1632&auto=format&fit=crop",
    icon: Handshake,
  },
  {
    id: "step-2",
    title: "2. Pembeli Membayar",
    description:
      "Pembeli mentransfer dana ke rekening bersama (Rekber) kami yang aman. Dana akan ditahan dengan aman dan penjual akan dinotifikasi untuk mengirim barang.",
    image:
      "https://images.unsplash.com/photo-1563013544-824ae1b704d3?q=80&w=1770&auto=format&fit=crop",
    icon: Wallet,
  },
  {
    id: "step-3",
    title: "3. Penjual Mengirim Barang",
    description:
      "Setelah dana diverifikasi, penjual diwajibkan mengirimkan barang sesuai kesepakatan dan memberikan resi pengiriman yang valid ke dalam sistem.",
    image:
      "https://images.unsplash.com/photo-1580674285054-bed31e145f59?q=80&w=1770&auto=format&fit=crop",
    icon: ShieldCheck,
  },
  {
    id: "step-4",
    title: "4. Transaksi Selesai",
    description:
      "Pembeli menerima dan memverifikasi barang. Setelah pembeli mengkonfirmasi barang sesuai, dana akan otomatis diteruskan ke rekening penjual.",
    image:
      "https://images.unsplash.com/photo-1601597111158-2fceff292cdc?q=80&w=1770&auto=format&fit=crop",
    icon: CheckCircle2,
  },
];

const PRODUCTS = [
  {
    icon: ShoppingCart,
    title: "Jual Beli Online",
    desc: "Amankan transaksi jual beli online Anda dengan rekening bersama.",
    img: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&auto=format&fit=crop&q=80",
  },
  {
    icon: Car,
    title: "Kendaraan",
    desc: "Beli atau jual kendaraan tanpa khawatir penipuan.",
    img: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=600&auto=format&fit=crop&q=80",
  },
  {
    icon: Cpu,
    title: "Elektronik",
    desc: "Transaksi gadget, laptop, dan elektronik lainnya dengan aman.",
    img: "https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=600&auto=format&fit=crop&q=80",
  },
  {
    icon: Building2,
    title: "Properti",
    desc: "Sewa atau beli properti dengan jaminan keamanan dana.",
    img: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&auto=format&fit=crop&q=80",
  },
];

/* ─────────────────── Page ─────────────────── */

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<"seller" | "buyer">("buyer");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [catOpen, setCatOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  return (
    <div className="min-h-screen bg-white text-black overflow-x-hidden">
      {/* ───── NAVBAR ───── */}
      <nav
        id="home"
        className="sticky top-0 z-50 border-b border-card-border bg-background/80 backdrop-blur-xl"
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
             <Image src="/blue-logo.svg" alt="Logo" width={40} height={40}/>
              <span className="text-base font-bold tracking-tight">
                Middleman
              </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm text-black hover:text-foreground transition-colors"
              >
                {l.label}
              </a>
            ))}
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            <button className="flex items-center gap-1 text-sm text-black hover:text-foreground transition-colors">
              <Globe className="h-4 w-4" />
              <span>ID</span>
            </button>
            <Link
              href="/auth/signin"
              className="text-sm font-medium text-foreground hover:text-accent transition-colors px-3 py-1.5"
            >
              Login
            </Link>
            <Link
              href="/auth/signup"
              className="text-sm font-semibold bg-primary-blue hover:bg-accent-hover text-white px-4 py-2 rounded-xl transition-colors"
            >
              Daftar
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-foreground"
            onClick={() => setMobileNav(!mobileNav)}
          >
            {mobileNav ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileNav && (
          <div className="md:hidden border-t border-card-border bg-background/95 backdrop-blur-xl animate-fade-in-up">
            <div className="px-4 py-4 space-y-3">
              {NAV_LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="block text-sm text-black hover:text-foreground transition-colors"
                  onClick={() => setMobileNav(false)}
                >
                  {l.label}
                </a>
              ))}
              <div className="pt-3 border-t border-card-border flex gap-3">
                <Link
                  href="/auth/signin"
                  className="flex-1 text-center text-sm font-medium border border-card-border rounded-xl py-2 hover:bg-card transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/auth/signup"
                  className="flex-1 text-center text-sm font-semibold bg-primary-blue hover:bg-accent-hover text-white rounded-xl py-2 transition-colors"
                >
                  Daftar
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>
      {/* ───── CONTAINER SCROLL ───── */}
      <section className="relative">
        <ContainerScroll titleComponent={<Hero />}>
          <Image
            src="/dashboard-mockup.png"
            alt="Middleman Dashboard"
            height={720}
            width={1400}
            className="mx-auto rounded-2xl object-cover h-full object-top"
            draggable={false}
          />
        </ContainerScroll>
      </section>


      {/* ───── Why Choose Us ───── */}
      <section
        id="features"
        className="py-20 md:py-28 border-t border-card-border"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Text */}
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-primary-blue">
                Kenapa Harus Middleman?
              </h2>
              <p className="text-black leading-relaxed mb-6">
                Transaksi online rawan penipuan. Middleman hadir sebagai pihak
                ketiga terpercaya yang menahan dana hingga kedua belah pihak
                puas — jadi tidak ada yang dirugikan.
              </p>
              <ul className="space-y-3">
                {FEATURES.map((f) => (
                  <li key={f.title} className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                      <f.icon className="h-4.5 w-4.5 text-primary-blue" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{f.title}</p>
                      <p className="text-xs text-black leading-relaxed">
                        {f.desc}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Display Cards */}
            <div className="flex items-center justify-center py-10">
              <DisplayCards
                cards={[
                  {
                    icon: <Shield className="size-4 text-blue-300" />,
                    title: "Dana Ditahan Aman",
                    description: "Uang ditahan sampai barang diterima",
                    date: "Rekber Otomatis",
                    iconClassName: "text-blue-500",
                    titleClassName: "text-blue-500",
                    className:
                      "[grid-area:stack] hover:-translate-y-10 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
                  },
                  {
                    icon: <Eye className="size-4 text-blue-300" />,
                    title: "Pantau Real-Time",
                    description: "Status transaksi selalu transparan",
                    date: "Selalu Aktif",
                    iconClassName: "text-blue-500",
                    titleClassName: "text-blue-500",
                    className:
                      "[grid-area:stack] translate-x-12 translate-y-10 hover:-translate-y-1 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
                  },
                  {
                    icon: <RefreshCcw className="size-4 text-blue-300" />,
                    title: "Uang Kembali",
                    description: "100% refund jika barang tidak sesuai",
                    date: "Garansi Penuh",
                    iconClassName: "text-blue-500",
                    titleClassName: "text-blue-500",
                    className:
                      "[grid-area:stack] translate-x-24 translate-y-20 hover:translate-y-10",
                  },
                ]}
              />
            </div>
          </div>
        </div>
      </section>

      <Features />

      {/* ───── HOW IT WORKS ───── */}
      <section
        id="how-it-works"
        className="py-20 md:py-28 border-t border-card-border"
      >
        <FeatureSteps
          features={HOW_IT_WORKS_FEATURES}
          title="Bagaimana Proses Middleman Bekerja"
          autoPlayInterval={1200}
          imageHeight="h-[500px]"
        />
      </section>
      {/* ───── TESTIMONIALS ───── */}
      {/* <TestimonialsSection /> */}
      {/* ───── FOOTER ───── */}
      <footer className="border-t border-card-border bg-card/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {/* Brand */}
            <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
             <Image src="/blue-logo.svg" alt="Logo" width={40} height={40}/>
              <span className="text-base font-bold tracking-tight">
                Middleman
              </span>
             </Link>
              <p className="text-sm text-black leading-relaxed">
                Platform rekening bersama terpercaya #1 di Indonesia untuk
                transaksi online yang aman.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-sm font-bold mb-4">Menu</h4>
              <ul className="space-y-2.5">
                {NAV_LINKS.map((l) => (
                  <li key={l.href}>
                    <a
                      href={l.href}
                      className="text-sm text-black hover:text-foreground transition-colors"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Layanan */}
            <div>
              <h4 className="text-sm font-bold mb-4">Layanan</h4>
              <ul className="space-y-2.5">
                {PRODUCTS.map((p) => (
                  <li key={p.title}>
                    <span className="text-sm text-black">{p.title}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-sm font-bold mb-4">Kontak</h4>
              <ul className="space-y-3">
                <li className="flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-primary-blue" />
                  <span className="text-sm text-black">
                    Yogyakarta, Indonesia
                  </span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Mail className="h-4 w-4 text-primary-blue shrink-0" />
                  <a
                    href="mailto:support@middleman.id"
                    className="text-sm text-black hover:text-foreground transition-colors"
                  >
                    support@middleman.id
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-card-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-black">
              &copy; {new Date().getFullYear()} Middleman. All rights reserved.
            </p>
            <div className="flex gap-4">
              <span className="text-xs text-black hover:text-foreground cursor-pointer transition-colors">
                Privacy Policy
              </span>
              <span className="text-xs text-black hover:text-foreground cursor-pointer transition-colors">
                Terms of Service
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
