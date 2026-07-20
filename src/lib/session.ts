import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

export const COOKIE_NAME = "jbpixs_sessao";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 dias

export type SessionUser = {
  id: number;
  username: string;
  name: string;
  role: "admin" | "funcionario";
};

function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      "SESSION_SECRET ausente ou curta demais (mínimo 32 caracteres). Veja .env.example."
    );
  }
  return new TextEncoder().encode(s);
}

export async function createSession(user: SessionUser): Promise<void> {
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());

  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      id: Number(payload.sub),
      username: String(payload.username),
      name: String(payload.name),
      role: payload.role === "admin" ? "admin" : "funcionario",
    };
  } catch {
    return null;
  }
}
