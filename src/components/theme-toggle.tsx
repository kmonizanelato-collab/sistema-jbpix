"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

type Tema = "light" | "dark";

/*
  O tema não mora no React: quem manda é o atributo data-theme do <html>, que o
  script do <head> já escreveu antes da primeira pintura. Então lemos daí com
  useSyncExternalStore em vez de copiar para um estado dentro de um efeito —
  copiar causaria um render extra e um piscar de ícone na hidratação.
*/
const ouvintes = new Set<() => void>();

function subscribe(cb: () => void) {
  ouvintes.add(cb);
  return () => {
    ouvintes.delete(cb);
  };
}

function getSnapshot(): Tema {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

// No servidor não há tema definido; devolvemos null para o botão sair neutro e
// não trocar de ícone na hidratação.
function getServerSnapshot(): null {
  return null;
}

export function ThemeToggle() {
  const tema = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function alternar() {
    const novo: Tema = tema === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = novo;
    try {
      localStorage.setItem("jbpixs-tema", novo);
    } catch {
      // Modo privado ou storage bloqueado: o tema vale só nesta sessão.
    }
    ouvintes.forEach((cb) => cb());
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={tema === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro"}
      className="grid size-9 place-items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
    >
      {tema === null ? (
        <span className="size-[17px]" />
      ) : tema === "dark" ? (
        <Sun size={17} />
      ) : (
        <Moon size={17} />
      )}
    </button>
  );
}
