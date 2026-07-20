/**
 * Sobe para o Vercel Blob as artes que ainda estão em public/uploads e corrige
 * os endereços no banco.
 *
 * Necessário porque o disco da Vercel é somente leitura e nada em
 * public/uploads vai para o repositório: sem migrar, o site publicado mostraria
 * as artes quebradas.
 *
 * Rodar: npm run storage:migrate   (é idempotente — o que já está no Blob é
 * ignorado, então pode rodar de novo sem duplicar arquivo)
 */
import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { query } from "../src/lib/db";
import { salvar } from "../src/lib/storage";

type Linha = {
  id: number;
  name: string;
  template_url: string;
  rendered_url: string | null;
};

const local = (url: string | null) => Boolean(url?.startsWith("/uploads/"));

async function subir(url: string, nome: string): Promise<string | null> {
  const caminho = join(process.cwd(), "public", url.replace(/^\//, ""));
  if (!existsSync(caminho)) {
    console.warn(`  ! arquivo não existe em disco: ${url}`);
    return null;
  }
  return salvar(nome, readFileSync(caminho), "image/jpeg");
}

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("BLOB_READ_WRITE_TOKEN não definido. Rode `vercel env pull` antes.");
    process.exit(1);
  }

  const artes = await query<Linha>(
    "SELECT id, name, template_url, rendered_url FROM arts ORDER BY id"
  );

  let migradas = 0;
  for (const a of artes) {
    if (!local(a.template_url) && !local(a.rendered_url)) {
      console.log(`· "${a.name}": já está no Blob`);
      continue;
    }
    console.log(`· "${a.name}":`);

    let template = a.template_url;
    if (local(template)) {
      const nova = await subir(template, `${a.name}-modelo.jpg`);
      if (nova) {
        template = nova;
        console.log("    modelo migrado");
      }
    }

    let render = a.rendered_url;
    if (local(render)) {
      const nova = await subir(render!, `${a.name}-render.jpg`);
      // Se o render sumiu, zeramos: a arte volta a mostrar o modelo em vez de
      // apontar para um arquivo que não existe mais.
      render = nova;
      console.log(nova ? "    render migrado" : "    render não encontrado, referência zerada");
    }

    await query(
      "UPDATE arts SET template_url = $2, rendered_url = $3, updated_at = now() WHERE id = $1",
      [a.id, template, render]
    );
    migradas++;
  }

  console.log(migradas ? `\n${migradas} arte(s) migrada(s).` : "\nNada a migrar.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
