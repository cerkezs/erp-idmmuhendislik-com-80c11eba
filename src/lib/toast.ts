import { toast } from "sonner";

export function crudToast(action: "save" | "delete" | "create" | "update" | "send", name = "Kayıt") {
  const map: Record<string, string> = {
    save: `${name} kaydedildi`,
    create: `${name} eklendi`,
    update: `${name} güncellendi`,
    delete: `${name} silindi`,
    send: `${name} gönderildi`,
  };
  toast.success(map[action]);
}

export function errorToast(err: unknown, fallback = "İşlem başarısız") {
  const msg = err instanceof Error ? err.message : String(err || fallback);
  toast.error(msg || fallback);
}

// React Query onError adapter: callback that ignores extra args.
export function onErrorToast(fallback = "İşlem başarısız") {
  return (err: unknown) => errorToast(err, fallback);
}
