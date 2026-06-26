import { useQuery } from "@tanstack/react-query";
import { me } from "@/lib/auth.functions";

export type AppRole = "admin" | "editor" | "viewer";

export function useMe() {
  const q = useQuery({
    queryKey: ["auth-me"],
    queryFn: () => me(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const role = (q.data?.role || "viewer") as AppRole;
  const isAdmin = role === "admin";
  const isEditor = role === "admin" || role === "editor";
  const canWrite = isEditor; // editor + admin
  const canDelete = isAdmin; // sadece admin
  return { user: q.data, role, isAdmin, isEditor, canWrite, canDelete, loading: q.isLoading };
}
