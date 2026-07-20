import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LoginForm } from "@/components/login-form";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function LoginPage() {
  if (await getSession()) redirect("/");

  return (
    <main className="grid min-h-dvh place-items-center px-5 py-10">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-[380px]">
        <div className="mb-7 flex flex-col items-center gap-3 text-center">
          <Brand />
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-[var(--text)]">
              Painel interno
            </h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Acesso restrito aos funcionários.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
