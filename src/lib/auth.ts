import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { queryOne } from "./db";
import { getSession, type SessionUser } from "./session";

type UserRow = {
  id: number;
  username: string;
  password_hash: string;
  name: string;
  role: "admin" | "funcionario";
};

export async function verifyCredentials(
  username: string,
  password: string
): Promise<SessionUser | null> {
  const user = await queryOne<UserRow>(
    "SELECT id, username, password_hash, name, role FROM users WHERE lower(username) = lower($1)",
    [username.trim()]
  );
  // Comparamos o hash mesmo quando o usuário não existe, para que a resposta
  // demore o mesmo tanto nos dois casos e não vaze quais logins são válidos.
  const hash = user?.password_hash ?? "$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin";
  const ok = await bcrypt.compare(password, hash);
  if (!user || !ok) return null;
  return { id: user.id, username: user.username, name: user.name, role: user.role };
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/** Para páginas: garante alguém logado, senão manda para o login. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect("/login");
  return user;
}

/** Para páginas de admin. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/");
  return user;
}
