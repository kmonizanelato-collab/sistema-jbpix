"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, ShieldCheck, Trash2, TriangleAlert, User } from "lucide-react";

export type UserRow = {
  id: number;
  username: string;
  name: string;
  role: "admin" | "funcionario";
  criadoEm: string;
};

export function UsersManager({ users, meuId }: { users: UserRow[]; meuId: number }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState({
    name: "",
    username: "",
    password: "",
    role: "funcionario" as "admin" | "funcionario",
  });
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState<number | null>(null);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);
    const res = await fetch("/api/admin/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    setSalvando(false);
    if (!res.ok) return setErro(data.error ?? "Não consegui criar.");
    setForm({ name: "", username: "", password: "", role: "funcionario" });
    setAberto(false);
    router.refresh();
  }

  async function excluir(u: UserRow) {
    if (!confirm(`Excluir ${u.name} (${u.username})? Isso não pode ser desfeito.`)) return;
    setErro(null);
    setExcluindo(u.id);
    const res = await fetch(`/api/admin/usuarios/${u.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setExcluindo(null);
    if (!res.ok) return setErro(data.error ?? "Não consegui excluir.");
    router.refresh();
  }

  const campo =
    "h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3.5 text-[15px] text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand)]";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[var(--text-muted)]">
          {users.length} {users.length === 1 ? "pessoa" : "pessoas"} com acesso
        </p>
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          className="flex h-10 items-center gap-2 rounded-lg bg-[var(--brand)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-strong)]"
        >
          <Plus size={16} />
          Novo funcionário
        </button>
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

      {aberto && (
        <form
          onSubmit={criar}
          className="grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] sm:grid-cols-2"
        >
          <label className="space-y-1.5">
            <span className="block text-sm font-medium">Nome</span>
            <input
              className={campo}
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Maria Silva"
            />
          </label>
          <label className="space-y-1.5">
            <span className="block text-sm font-medium">Usuário</span>
            <input
              className={campo}
              required
              autoCapitalize="none"
              autoCorrect="off"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="maria"
            />
          </label>
          <label className="space-y-1.5">
            <span className="block text-sm font-medium">Senha</span>
            <input
              className={campo}
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="mínimo 6 caracteres"
            />
          </label>
          <label className="space-y-1.5">
            <span className="block text-sm font-medium">Permissão</span>
            <select
              className={campo}
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as UserRow["role"] })}
            >
              <option value="funcionario">Funcionário</option>
              <option value="admin">Administrador</option>
            </select>
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <button
              type="submit"
              disabled={salvando}
              className="flex h-11 items-center gap-2 rounded-lg bg-[var(--brand)] px-5 text-[15px] font-semibold text-white disabled:opacity-60"
            >
              {salvando && <Loader2 size={16} className="animate-spin" />}
              Criar
            </button>
            <button
              type="button"
              onClick={() => setAberto(false)}
              className="h-11 rounded-lg border border-[var(--border)] px-5 text-[15px] font-medium text-[var(--text-muted)]"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)]">
        {users.map((u) => (
          <li key={u.id} className="flex items-center gap-3 p-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--surface-2)] text-[var(--text-muted)]">
              {u.role === "admin" ? <ShieldCheck size={17} /> : <User size={17} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium text-[var(--text)]">{u.name}</span>
              <span className="block truncate text-sm text-[var(--text-muted)]">
                {u.username}
                {u.role === "admin" && " · administrador"}
                {u.id === meuId && " · você"}
              </span>
            </span>
            <button
              type="button"
              onClick={() => excluir(u)}
              disabled={u.id === meuId || excluindo === u.id}
              aria-label={`Excluir ${u.name}`}
              title={u.id === meuId ? "Você não pode excluir a si mesmo" : "Excluir"}
              className="grid size-9 shrink-0 place-items-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--brand-soft)] hover:text-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[var(--text-muted)]"
            >
              {excluindo === u.id ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Trash2 size={16} />
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
