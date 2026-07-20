"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Eye, EyeOff, Loader2, TriangleAlert, Wand2, WrapText } from "lucide-react";

type ErroLinha = { line: number; raw: string; reason: string };

type Props = {
  id: number;
  nome: string;
  slots: number[];
  textosIniciais: Record<string, string>;
  urlAtual: string;
  publicada: boolean;
};

export function TableEditor({ id, nome, slots, textosIniciais, urlAtual, publicada }: Props) {
  const router = useRouter();
  const [slot, setSlot] = useState(String(slots[0] ?? 1));
  const [textos, setTextos] = useState<Record<string, string>>(textosIniciais);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [errosLinha, setErrosLinha] = useState<ErroLinha[]>([]);
  const [avisos, setAvisos] = useState<string[]>([]);
  const [preview, setPreview] = useState(urlAtual);
  const [ok, setOk] = useState(false);
  const [transcrever, setTranscrever] = useState(false);

  // Arte de tabela única (a da Federal) não tem "1ª ou 2ª" para escolher.
  const tabelaUnica = slots.length === 1;

  async function aplicar() {
    setErro(null);
    setErrosLinha([]);
    setAvisos([]);
    setOk(false);
    setSalvando(true);

    const res = await fetch(`/api/admin/artes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tabelas: { [slot]: textos[slot] ?? "" }, transcrever }),
    });
    const data = await res.json().catch(() => ({}));
    setSalvando(false);

    if (!res.ok) {
      setErro(data.error ?? "Não consegui gerar a arte.");
      const lista = data.erros?.[slot];
      if (Array.isArray(lista)) setErrosLinha(lista);
      return;
    }

    // A URL muda a cada render, mas acrescento o carimbo de tempo para o
    // navegador não servir a versão anterior do cache.
    setPreview(`${data.url}${data.url.includes("?") ? "&" : "?"}v=${Date.now()}`);
    setAvisos(data.avisos?.[slot] ?? []);
    setOk(true);
    router.refresh();
  }

  async function alternarPublicacao() {
    setSalvando(true);
    await fetch(`/api/admin/artes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicar: !publicada }),
    });
    setSalvando(false);
    router.refresh();
  }

  const texto = textos[slot] ?? "";
  const linhas = texto.split("\n").filter((l) => l.trim()).length;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
          {!tabelaUnica && (
            <div>
              <span className="mb-2 block text-sm font-medium text-[var(--text)]">
                Em qual tabela?
              </span>
              <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-1">
                {slots.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSlot(String(s))}
                    className={`h-9 rounded-md px-4 text-sm font-medium transition-colors ${
                      String(s) === slot
                        ? "bg-[var(--brand)] text-white"
                        : "text-[var(--text-muted)] hover:text-[var(--text)]"
                    }`}
                  >
                    {s === 1 ? "1ª — esquerda" : "2ª — direita"}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <span className="mb-2 block text-sm font-medium text-[var(--text)]">Transcrever</span>
            <button
              type="button"
              role="switch"
              aria-checked={transcrever}
              onClick={() => setTranscrever((v) => !v)}
              className={`flex h-11 items-center gap-2.5 rounded-lg border px-3.5 text-sm font-medium transition-colors ${
                transcrever
                  ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand-strong)]"
                  : "border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              <WrapText size={17} />
              <span
                aria-hidden
                className={`relative h-5 w-9 rounded-full transition-colors ${
                  transcrever ? "bg-[var(--brand)]" : "bg-[var(--border-strong)]"
                }`}
              >
                <span
                  className={`absolute top-0.5 size-4 rounded-full bg-white transition-all ${
                    transcrever ? "left-[1.125rem]" : "left-0.5"
                  }`}
                />
              </span>
            </button>
          </div>
        </div>

        {transcrever && (
          <p className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-2.5 text-xs text-[var(--text-muted)]">
            Ligado: pode colar a lista <strong>corrida numa linha só</strong>, do jeito que sai ao
            copiar pelo celular. Eu separo em cada <span className="font-mono">Nº</span> antes de
            converter.
          </p>
        )}

        <label className="block space-y-2">
          <span className="flex items-baseline justify-between">
            <span className="text-sm font-medium text-[var(--text)]">
              Cole a lista de atrasados
            </span>
            <span className="text-xs text-[var(--text-muted)]">
              {linhas} {linhas === 1 ? "linha" : "linhas"}
            </span>
          </span>
          <textarea
            value={texto}
            onChange={(e) => setTextos({ ...textos, [slot]: e.target.value })}
            rows={16}
            spellCheck={false}
            placeholder={"1º 🦩 01 - Avestruz atrasado há 17 dias, , no milhar\n2º 🐐 06 - Cabra atrasado há 16 dias, , no milhar\n…"}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3.5 font-mono text-[13px] leading-relaxed text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand)]"
          />
          <span className="block text-xs text-[var(--text-muted)]">
            Cole como vem do sistema. Eu converto para o formato da arte
            (<span className="font-mono">1° 🦩 AVESTRUZ 17 DIAS</span>). Deixe em branco para
            limpar esta tabela.
          </span>
        </label>

        {erro && (
          <div
            role="alert"
            className="rounded-lg border border-[var(--brand)]/30 bg-[var(--brand-soft)] p-3.5 text-sm text-[var(--brand-strong)]"
          >
            <p className="flex items-start gap-2 font-medium">
              <TriangleAlert size={16} className="mt-px shrink-0" />
              {erro}
            </p>
            {errosLinha.length > 0 && (
              <ul className="mt-2 space-y-1 pl-6">
                {errosLinha.map((e) => (
                  <li key={e.line} className="text-xs">
                    <span className="font-semibold">Linha {e.line}:</span> {e.reason}
                    <span className="block truncate opacity-70">{e.raw}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {ok && avisos.length === 0 && (
          <p className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={16} /> Arte gerada.
          </p>
        )}

        {avisos.length > 0 && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 text-sm text-amber-700 dark:text-amber-400">
            <p className="font-medium">Gerei, mas confira:</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs">
              {avisos.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={aplicar}
            disabled={salvando}
            className="flex h-11 items-center gap-2 rounded-lg bg-[var(--brand)] px-5 text-[15px] font-semibold text-white transition-colors hover:bg-[var(--brand-strong)] disabled:opacity-60"
          >
            {salvando ? <Loader2 size={17} className="animate-spin" /> : <Wand2 size={17} />}
            Gerar arte
          </button>
          <button
            type="button"
            onClick={alternarPublicacao}
            disabled={salvando}
            className="flex h-11 items-center gap-2 rounded-lg border border-[var(--border)] px-5 text-[15px] font-medium text-[var(--text)] disabled:opacity-60"
          >
            {publicada ? <EyeOff size={17} /> : <Eye size={17} />}
            {publicada ? "Despublicar" : "Publicar"}
          </button>
        </div>
      </div>

      <div className="lg:sticky lg:top-24 lg:self-start">
        <p className="mb-2 text-sm font-medium text-[var(--text)]">Resultado</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={preview}
          alt={`Prévia de ${nome}`}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] shadow-[var(--shadow)]"
        />
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          A arte é sempre regerada a partir do modelo com as tabelas vazias — dá para reeditar
          quantas vezes quiser sem sujar a imagem.
        </p>
      </div>
    </div>
  );
}
