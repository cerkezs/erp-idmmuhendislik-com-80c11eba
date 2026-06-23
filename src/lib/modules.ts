import {
  LayoutDashboard,
  Building2,
  Package,
  Factory,
  FileText,
  ReceiptText,
  Wallet,
  Receipt,
  Users,
  Files,
  BarChart3,
  Bell,
  Settings,
  ListChecks,
  Mail,
} from "lucide-react";
import type { ComponentType } from "react";

export type ModuleDef = {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  group: "main" | "ops" | "fin" | "system";
  desc: string;
};

export const MODULES: ModuleDef[] = [
  { to: "/", label: "Panel", icon: LayoutDashboard, group: "main", desc: "Ana özet ekran" },
  { to: "/companies", label: "Firmalar", icon: Building2, group: "main", desc: "Müşteri & tedarikçi" },
  { to: "/products", label: "Ürünler", icon: Package, group: "ops", desc: "Ürün kartları + stok" },
  { to: "/productions", label: "Üretim", icon: Factory, group: "ops", desc: "Üretim emirleri & DOM" },
  { to: "/quotes", label: "Teklifler", icon: FileText, group: "fin", desc: "Teklif + sipariş" },
  { to: "/invoices", label: "Faturalar", icon: ReceiptText, group: "fin", desc: "Faturalar + vade" },
  { to: "/expenses", label: "Giderler", icon: Receipt, group: "fin", desc: "Şirket giderleri" },
  { to: "/kasa", label: "Kasa", icon: Wallet, group: "fin", desc: "Kasalar & nakit akışı" },
  { to: "/actions", label: "Aksiyon & Görev", icon: ListChecks, group: "ops", desc: "Aksiyon ve görevler" },
  { to: "/files", label: "Dosyalar", icon: Files, group: "ops", desc: "Tüm dosyalar ağacı" },
  { to: "/mail", label: "Mail", icon: Mail, group: "ops", desc: "Mail gönderim & log" },
  { to: "/reports", label: "Raporlar", icon: BarChart3, group: "system", desc: "Tarihsel raporlar" },
  { to: "/notifications", label: "Bildirimler", icon: Bell, group: "system", desc: "Bildirim merkezi" },
  { to: "/settings", label: "Ayarlar", icon: Settings, group: "system", desc: "Kullanıcı, SMTP, kur, roller" },
];
