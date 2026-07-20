import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyCredentials } from "@/lib/auth";
import { createSession } from "@/lib/session";

export const runtime = "nodejs";

const schema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(200),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Preencha usuário e senha." }, { status: 400 });
  }

  const user = await verifyCredentials(parsed.data.username, parsed.data.password);
  if (!user) {
    // Mensagem única de propósito: não dizemos se foi o usuário ou a senha.
    return NextResponse.json({ error: "Usuário ou senha incorretos." }, { status: 401 });
  }

  await createSession(user);
  return NextResponse.json({ ok: true, role: user.role });
}
