import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { put, del } from "@vercel/blob";

/*
  Duas implementações atrás da mesma porta.

  Com BLOB_READ_WRITE_TOKEN definido usamos o Vercel Blob — é o modo de
  produção. Sem token, gravamos em public/uploads para o sistema rodar inteiro
  na máquina antes de existir conta na Vercel.

  Atenção: o disco da Vercel é efêmero. Se subir sem o token, as artes somem no
  próximo deploy — por isso o aviso no console.
*/

const usandoBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const DIR_LOCAL = join(process.cwd(), "public", "uploads");

let avisou = false;
function avisarUmaVez() {
  if (avisou || usandoBlob()) return;
  avisou = true;
  console.warn(
    "[storage] BLOB_READ_WRITE_TOKEN ausente: gravando em public/uploads. " +
      "Isso NÃO sobrevive a um deploy na Vercel."
  );
}

export async function salvar(nome: string, dados: Buffer, contentType: string): Promise<string> {
  avisarUmaVez();

  // Na Vercel o disco é somente leitura fora de /tmp. Sem o Blob, a gravação
  // falharia com um EROFS obscuro no meio do upload; melhor dizer o que falta.
  if (!usandoBlob() && process.env.VERCEL) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN não configurado. Na Vercel o disco é somente leitura, " +
        "então as artes precisam do Vercel Blob. Crie o store em Storage > Blob."
    );
  }

  if (usandoBlob()) {
    /*
      Cópia para um Buffer fora do pool antes de enviar.

      O sharp devolve Buffer apoiado num pool de memória compartilhada, e o
      fetch por baixo do @vercel/blob recusa corpo nessa condição com
      "SharedArrayBuffer is not allowed" — derrubando a função sem deixar
      mensagem. Local nunca aparecia porque ali gravamos em disco, e a migração
      passou porque lia os arquivos com readFileSync, que não usa o pool.
    */
    const copia = Buffer.allocUnsafeSlow(dados.byteLength);
    dados.copy(copia);

    const { url } = await put(nome, copia, {
      access: "public",
      contentType,
      addRandomSuffix: true,
    });
    return url;
  }
  await mkdir(DIR_LOCAL, { recursive: true });
  const arquivo = `${Date.now()}-${nome.replace(/[^\w.-]/g, "_")}`;
  await writeFile(join(DIR_LOCAL, arquivo), dados);
  return `/uploads/${arquivo}`;
}

/** Lê de volta uma URL que nós mesmos gravamos. */
export async function ler(url: string): Promise<Buffer> {
  if (url.startsWith("/uploads/")) {
    return readFile(join(process.cwd(), "public", url.replace("/uploads/", "uploads/")));
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Não consegui ler a imagem (${res.status}).`);
  return Buffer.from(await res.arrayBuffer());
}

export async function remover(url: string | null | undefined): Promise<void> {
  if (!url) return;
  try {
    if (url.startsWith("/uploads/")) {
      await unlink(join(process.cwd(), "public", url.replace("/uploads/", "uploads/")));
    } else {
      await del(url);
    }
  } catch {
    // Arquivo já sumiu: apagar de novo não é erro que valha interromper nada.
  }
}
