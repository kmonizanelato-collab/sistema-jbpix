import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { hashPassword } from "@/lib/auth";
import { query } from "@/lib/db";

export const runtime = "nodejs";

const schema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "O usuário precisa de pelo menos 3 caracteres.")
    .max(32)
    .regex(/^[a-zA-Z0-9._-]+$/, "Use só letras, números, ponto, hífen ou sublinhado."),
  name: z.string().trim().min(2, "Informe o nome.").max(80),
  password: z.string().min(6, "A senha precisa de pelo menos 6 caracteres.").max(200),
  role: z.enum(["admin", "funcionario"]),
});

export async function POST(request: Request) {
  const sessao = await getSession();
  if (sessao?.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }
  const { username, name, password, role } = parsed.data;

  const existe = await query("SELECT 1 FROM users WHERE lower(username) = lower($1)", [username]);
  if (existe.length) {
    return NextResponse.json({ error: "Já existe alguém com esse usuário." }, { status: 409 });
  }

  const rows = await query<{ id: number }>(
    "INSERT INTO users (username, password_hash, name, role) VALUES ($1,$2,$3,$4) RETURNING id",
    [username, await hashPassword(password), name, role]
  );
  return NextResponse.json({ ok: true, id: rows[0].id });
}
