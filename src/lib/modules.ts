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
  Database,
  Truck,
  FileInput,
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
  { to: "/musteriler", label: "Müşteriler", icon: Users, group: "main", desc: "Müşteri firmaları & cari" },
  { to: "/tedarikciler", label: "Tedarikçiler", icon: Truck, group: "main", desc: "Tedarikçi firmaları & cari" },
  { to: "/products", label: "Ürünler", icon: Package, group: "ops", desc: "Ürün kartları + stok" },
  { to: "/productions", label: "Üretim", icon: Factory, group: "ops", desc: "Üretim emirleri & DOM" },
  { to: "/quotes", label: "Teklifler", icon: FileText, group: "fin", desc: "Teklif + sipariş" },
  { to: "/invoices", label: "Satış Faturaları", icon: ReceiptText, group: "fin", desc: "Bizim kestiğimiz faturalar" },
  { to: "/alis-faturalari", label: "Alış Faturaları", icon: FileInput, group: "fin", desc: "Bize gelen faturalar" },
  { to: "/expenses", label: "Giderler", icon: Receipt, group: "fin", desc: "Şirket giderleri" },
  { to: "/kasa", label: "Kasa", icon: Wallet, group: "fin", desc: "Kasalar & nakit akışı" },
  { to: "/actions", label: "Aksiyon & Görev", icon: ListChecks, group: "ops", desc: "Aksiyon ve görevler" },
  { to: "/files", label: "Dosyalar", icon: Files, group: "ops", desc: "Tüm dosyalar ağacı" },
  { to: "/mail", label: "Mail", icon: Mail, group: "ops", desc: "Mail gönderim & log" },
  { to: "/reports", label: "Raporlar", icon: BarChart3, group: "system", desc: "Tarihsel raporlar" },
  { to: "/notifications", label: "Bildirimler", icon: Bell, group: "system", desc: "Bildirim merkezi" },
  { to: "/companies", label: "Tüm Firmalar", icon: Building2, group: "system", desc: "Tüm firma kartları" },
  { to: "/settings", label: "Ayarlar", icon: Settings, group: "system", desc: "Kullanıcı, SMTP, kur, roller" },
  { to: "/setup", label: "Kurulum", icon: Database, group: "system", desc: "NocoDB şema kurulumu" },
];
