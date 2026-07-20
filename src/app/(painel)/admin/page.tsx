import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";

/** /admin sozinho não é uma tela; manda para a primeira do grupo. */
export default async function AdminIndex() {
  await requireAdmin();
  redirect("/admin/artes");
}
