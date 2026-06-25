import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Settings, Users, Mail, RefreshCw, Bell, Server, Tags, Wallet, Archive, ShieldCheck } from "lucide-react";

const SECTIONS = [
  { to: "/auth/sifre", label: "Hesabım & Güvenlik", icon: ShieldCheck, desc: "Parola değiştir · iki adımlı doğrulama (Google Authenticator)" },
  { to: "/settings/kullanicilar", label: "Kullanıcılar & Roller", icon: Users, desc: "Kullanıcı ekle, rol ata · parola/TOTP sıfırla" },
  { to: "/settings/mail", label: "Mail & SMTP", icon: Mail, desc: "SMTP durumu, test maili, ortak gönderici hesaplar" },
  { to: "/settings/kur", label: "Döviz Kurları", icon: RefreshCw, desc: "TCMB otomatik · manuel override · geçmiş kurlar" },
  { to: "/settings/bildirimler", label: "Bildirim Türleri", icon: Bell, desc: "Vade, stok, üretim, kasa — kanal başına aç/kapa" },
  { to: "/kasa", label: "Kasa Hesapları", icon: Wallet, desc: "Çoklu kasa (TRY/USD/EUR) — Kasa modülünde yönetilir" },
  { to: "/settings/kategoriler", label: "Kategoriler", icon: Tags, desc: "Gider · ürün · teklif kategorileri" },
  { to: "/settings/backup", label: "Yedekleme", icon: Archive, desc: "ZIP yedek · bölüm seç · firma bazlı klasörle" },
  { to: "/settings/sunucu", label: "Sunucu Durumu", icon: Server, desc: "NocoDB ping, mini-API sağlık, disk/RAM" },
] as const;

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Ayarlar — IDM ERP" }] }),
  component: () => (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-6 flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Ayarlar</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Kullanıcılar, mail, kur, bildirim ve sistem ayarları tek yerden.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.label}
                to={s.to}
                className="group rounded-lg border border-border bg-card p-4 shadow-sm transition-colors hover:bg-accent"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="text-sm font-medium">{s.label}</div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{s.desc}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </AppShell>
  ),
});
