"use client";

import { useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { Check, Download, Loader2, Share2 } from "lucide-react";

type Props = {
  id: number;
  nome: string;
  url: string;
  w: number;
  h: number;
  atualizadaEm: string;
};

/*
  Salvar a foto de um jeito que funcione mesmo.

  O atributo `download` do <a> é ignorado quando o arquivo está em outro
  domínio — e o Vercel Blob é outro domínio. Por isso o download passa por uma
  rota nossa, que devolve a imagem com Content-Disposition: attachment.

  No celular ainda há um detalhe: no iOS o download vai para "Arquivos", não
  para a galeria de Fotos. Quando o aparelho suporta compartilhar arquivos, a
  gente oferece o compartilhamento nativo — daí o funcionário escolhe "Salvar
  imagem" e ela cai na galeria, que é onde ele espera achar.
*/
export function ArtCard({ id, nome, url, w, h, atualizadaEm }: Props) {
  const [ocupado, setOcupado] = useState<null | "baixando" | "compartilhando">(null);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const endpoint = `/api/artes/${id}/download`;

  async function baixar() {
    setErro(null);
    setOcupado("baixando");
    try {
      const a = document.createElement("a");
      a.href = endpoint;
      a.download = `${nome}.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setSalvo(true);
      setTimeout(() => setSalvo(false), 2500);
    } catch {
      setErro("Não consegui baixar. Tente de novo.");
    } finally {
      setOcupado(null);
    }
  }

  async function compartilhar() {
    setErro(null);
    setOcupado("compartilhando");
    try {
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const arquivo = new File([blob], `${nome}.jpg`, { type: "image/jpeg" });
      if (navigator.canShare?.({ files: [arquivo] })) {
        await navigator.share({ files: [arquivo] });
      } else {
        await baixar();
      }
    } catch (e) {
      // Cancelar o menu de compartilhamento dispara AbortError: não é falha.
      if ((e as Error)?.name !== "AbortError") setErro("Não consegui compartilhar.");
    } finally {
      setOcupado(null);
    }
  }

  // Lido como estado externo: no servidor o snapshot e false e no cliente e o
  // valor real, sem divergencia de markup na hidratacao.
  const podeCompartilhar = useSyncExternalStore(
    () => () => {},
    () => typeof navigator.canShare === "function",
    () => false
  );

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)]">
      <div className="bg-[var(--surface-2)]">
        <Image
          src={url}
          alt={nome}
          width={w}
          height={h}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 480px"
          className="h-auto w-full"
        />
      </div>

      <div className="border-t border-[var(--border)] p-4">
        <p className="truncate font-semibold text-[var(--text)]">{nome}</p>
        <p className="mt-0.5 text-xs text-[var(--text-muted)]">{atualizadaEm}</p>

        <div className="mt-3.5 flex gap-2">
          <button
            type="button"
            onClick={baixar}
            disabled={ocupado !== null}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--brand)] text-[15px] font-semibold text-white transition-colors hover:bg-[var(--brand-strong)] disabled:opacity-60"
          >
            {ocupado === "baixando" ? (
              <Loader2 size={17} className="animate-spin" />
            ) : salvo ? (
              <Check size={17} />
            ) : (
              <Download size={17} />
            )}
            {salvo ? "Salva" : "Salvar foto"}
          </button>

          {podeCompartilhar && (
            <button
              type="button"
              onClick={compartilhar}
              disabled={ocupado !== null}
              aria-label="Compartilhar ou salvar na galeria"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-[var(--border)] text-[var(--text-muted)] transition-colors hover:text-[var(--text)] disabled:opacity-60"
            >
              {ocupado === "compartilhando" ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <Share2 size={17} />
              )}
            </button>
          )}
        </div>

        {erro && (
          <p role="alert" className="mt-2.5 text-sm text-[var(--brand)]">
            {erro}
          </p>
        )}
      </div>
    </div>
  );
}
