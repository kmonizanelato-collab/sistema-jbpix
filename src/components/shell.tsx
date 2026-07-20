"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Egg,
  Flame,
  ImagePlus,
  LayoutGrid,
  LogOut,
  Menu,
  PartyPopper,
  ShieldCheck,
  TreePine,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Brand } from "./brand";
import { ThemeToggle } from "./theme-toggle";

/* Mapa fixo em vez de import dinâmico: são cinco ícones, e assim o bundle não
   carrega a biblioteca inteira. Ícone desconhecido cai no genérico. */
const ICONS: Record<string, LucideIcon> = {
  LayoutGrid,
  Flame,
  PartyPopper,
  Egg,
  TreePine,
};

export type NavTheme = { slug: string; name: string; icon: string };

type Props = {
  user: { name: string; role: "admin" | "funcionario" };
  themes: NavTheme[];
  children: React.ReactNode;
};

export function Shell({ user, themes, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuAberto, setMenuAberto] = useState(false);
  const [saindo, setSaindo] = useState(false);

  // Trava o scroll do fundo enquanto a gaveta está aberta.
  useEffect(() => {
    document.body.style.overflow = menuAberto ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuAberto]);

  async function sair() {
    setSaindo(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const nav = (
    <nav className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center px-5">
        <Brand />
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        <p className="px-2 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Temas
        </p>
        <ul className="space-y-0.5">
          {themes.map((t) => {
            const href = `/temas/${t.slug}`;
            const ativo = pathname === href || pathname.startsWith(`${href}/`);
            const Icone = ICONS[t.icon] ?? LayoutGrid;
            return (
              <li key={t.slug}>
                <Link
                  href={href}
                  aria-current={ativo ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    ativo
                      ? "bg-[var(--brand-soft)] text-[var(--brand-strong)]"
                      : "text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                  }`}
                >
                  <Icone size={18} className="shrink-0" />
                  {t.name}
                </Link>
              </li>
            );
          })}
        </ul>

        {user.role === "admin" && (
          <>
            <p className="px-2 pb-2 pt-5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Administração
            </p>
            <ul className="space-y-0.5">
              {[
                { href: "/admin/artes", label: "Artes", Icone: ImagePlus },
                { href: "/admin/funcionarios", label: "Funcionários", Icone: Users },
              ].map(({ href, label, Icone }) => {
                const ativo = pathname.startsWith(href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={ativo ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                        ativo
                          ? "bg-[var(--brand-soft)] text-[var(--brand-strong)]"
                          : "text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                      }`}
                    >
                      <Icone size={18} className="shrink-0" />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      <div className="shrink-0 border-t border-[var(--border)] p-3">
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--surface-2)] text-xs font-semibold text-[var(--text)]">
            {user.name.slice(0, 2).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-[var(--text)]">
              {user.name}
            </span>
            {user.role === "admin" && (
              <span className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                <ShieldCheck size={11} /> Administrador
              </span>
            )}
          </span>
        </div>
        <button
          type="button"
          onClick={sair}
          disabled={saindo}
          className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)] disabled:opacity-60"
        >
          <LogOut size={18} />
          {saindo ? "Saindo…" : "Sair"}
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_1fr]">
      {/* Barra lateral fixa a partir de telas grandes */}
      <aside className="hidden border-r border-[var(--border)] bg-[var(--surface)] lg:sticky lg:top-0 lg:block lg:h-dvh">
        {nav}
      </aside>

      {/* Gaveta no celular e no tablet */}
      {menuAberto && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Fechar menu"
            onClick={() => setMenuAberto(false)}
            className="absolute inset-0 bg-black/50"
          />
          {/* Fechar no clique, e nao num efeito ligado ao pathname: o clique
              e o evento real, e assim nao ha render extra a cada navegacao. */}
          <div
            onClick={(e) => {
              if ((e.target as HTMLElement).closest("a")) setMenuAberto(false);
            }}
            className="absolute inset-y-0 left-0 w-[min(84vw,280px)] border-r border-[var(--border)] bg-[var(--surface)]"
          >
            <button
              onClick={() => setMenuAberto(false)}
              aria-label="Fechar menu"
              className="absolute right-3 top-3.5 grid size-9 place-items-center rounded-lg text-[var(--text-muted)]"
            >
              <X size={18} />
            </button>
            {nav}
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)]/85 px-4 backdrop-blur-md lg:justify-end lg:px-8">
          <button
            type="button"
            onClick={() => setMenuAberto(true)}
            aria-label="Abrir menu"
            className="grid size-9 place-items-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] lg:hidden"
          >
            <Menu size={20} />
          </button>
          <div className="lg:hidden">
            <Brand compact />
          </div>
          <div className="ml-auto lg:ml-0">
            <ThemeToggle />
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8 safe-bottom">
          {children}
        </main>
      </div>
    </div>
  );
}
