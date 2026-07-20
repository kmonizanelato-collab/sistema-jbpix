import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { query, queryOne } from "@/lib/db";

export const runtime = "nodejs";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const sessao = await getSession();
  if (sessao?.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const id = Number((await ctx.params).id);
  if (id === sessao.id) {
    return NextResponse.json({ error: "Você não pode excluir a si mesmo." }, { status: 400 });
  }

  const alvo = await queryOne<{ role: string }>("SELECT role FROM users WHERE id = $1", [id]);
  if (!alvo) return NextResponse.json({ error: "Funcionário não encontrado." }, { status: 404 });

  // Trava de segurança: sem isso dá para apagar o último admin e ficar sem
  // ninguém capaz de gerenciar o sistema.
  if (alvo.role === "admin") {
    const [{ total }] = await query<{ total: number }>(
      "SELECT count(*)::int AS total FROM users WHERE role = 'admin'"
    );
    if (total <= 1) {
      return NextResponse.json(
        { error: "Este é o único administrador. Crie outro antes de excluir." },
        { status: 400 }
      );
    }
  }

  await query("DELETE FROM users WHERE id = $1", [id]);
  return NextResponse.json({ ok: true });
}
