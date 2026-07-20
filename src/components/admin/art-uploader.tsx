"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, TriangleAlert, Upload } from "lucide-react";

export type CardOpcao = { id: number; label: string };

export function ArtUploader({ cards }: { cards: CardOpcao[] }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [cardId, setCardId] = useState(String(cards[0]?.id ?? ""));
  const [nome, setNome] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!arquivo) return setErro("Escolha a imagem.");
    setErro(null);
    setEnviando(true);

    const fd = new FormData();
    fd.set("arquivo", arquivo);
    fd.set("cardId", cardId);
    fd.set("nome", nome);

    const res = await fetch("/api/admin/artes", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    setEnviando(false);

    if (!res.ok) return setErro(data.error ?? "Não consegui enviar.");
    // Quantas caixas saíram da detecção é informado na própria tela de edição,
    // que é para onde vamos agora.
    router.push(`/admin/artes/${data.id}`);
  }

  const campo =
    "h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3.5 text-[15px] text-[var(--text)] outline-none focus:border-[var(--brand)]";

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        disabled={cards.length === 0}
        className="flex h-10 items-center gap-2 rounded-lg bg-[var(--brand)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-strong)]"
      >
        <Plus size={16} />
        Nova arte
      </button>

      {aberto && (
        <form
          onSubmit={enviar}
          className="grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] sm:grid-cols-2"
        >
          <label className="space-y-1.5">
            <span className="block text-sm font-medium">Card</span>
            <select className={campo} value={cardId} onChange={(e) => setCardId(e.target.value)}>
              {cards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="block text-sm font-medium">Nome da arte</span>
            <input
              className={campo}
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Atrasados 20/07"
            />
          </label>

          <label className="space-y-1.5 sm:col-span-2">
            <span className="block text-sm font-medium">
              Imagem com as tabelas <strong>vazias</strong>
            </span>
            <input
              type="file"
              accept="image/*"
              required
              onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-[var(--text-muted)] file:mr-3 file:h-10 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[var(--surface-2)] file:px-4 file:text-sm file:font-medium file:text-[var(--text)]"
            />
            <span className="block text-xs text-[var(--text-muted)]">
              Envie a arte sem nenhuma linha preenchida. O sistema desenha a tabela por cima e
              guarda esta versão limpa para as próximas edições.
            </span>
          </label>

          {erro && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-[var(--brand)]/30 bg-[var(--brand-soft)] px-3 py-2.5 text-sm text-[var(--brand-strong)] sm:col-span-2"
            >
              <TriangleAlert size={16} className="mt-px shrink-0" />
              {erro}
            </p>
          )}

          <div className="flex gap-2 sm:col-span-2">
            <button
              type="submit"
              disabled={enviando}
              className="flex h-11 items-center gap-2 rounded-lg bg-[var(--brand)] px-5 text-[15px] font-semibold text-white disabled:opacity-60"
            >
              {enviando ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Upload size={16} />
              )}
              Enviar
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
    </div>
  );
}
