"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, LogIn, TriangleAlert } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErro(data.error ?? "Não consegui entrar. Tente de novo.");
        setEnviando(false);
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setErro("Sem conexão com o servidor.");
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <label htmlFor="username" className="block text-sm font-medium text-[var(--text)]">
          Usuário
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3.5 text-[15px] text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand)]"
          placeholder="seu usuário"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium text-[var(--text)]">
          Senha
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] pl-3.5 pr-11 text-[15px] text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand)]"
            placeholder="sua senha"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            className="absolute right-1 top-1 grid size-9 place-items-center rounded-md text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
      </div>

      {erro && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-[var(--brand)]/30 bg-[var(--brand-soft)] px-3 py-2.5 text-sm text-[var(--brand-strong)]"
        >
          <TriangleAlert size={16} className="mt-px shrink-0" />
          {erro}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--brand)] text-[15px] font-semibold text-white transition-colors hover:bg-[var(--brand-strong)] disabled:opacity-60"
      >
        {enviando ? (
          <>
            <Loader2 size={17} className="animate-spin" />
            Entrando…
          </>
        ) : (
          <>
            <LogIn size={17} />
            Entrar
          </>
        )}
      </button>
    </form>
  );
}
