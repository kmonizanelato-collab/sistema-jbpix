/**
 * Cadastra as duas artes da Festa Junina que já foram limpas (tabelas vazias).
 * Rodar: npm run seed:junina
 */
import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

import { readFileSync } from "node:fs";
import sharp from "sharp";
import { query, queryOne } from "../src/lib/db";
import { detectBoxes } from "../src/lib/detect";
import { typographyPadrao, type LayoutBox } from "../src/lib/render";
import { salvar } from "../src/lib/storage";

const ARTES = [
  {
    arquivo: "imagens/saida/ptrio-lookgoias.jpg",
    card: "rj-goias",
    nome: "PT-Rio e Look-Goiás — Festa Junina",
  },
  {
    arquivo: "imagens/saida/nacional-ptbahia.jpg",
    card: "bahia-nacional",
    nome: "PT Bahia e Nacional — Festa Junina",
  },
  {
    arquivo: "imagens/saida/federal.jpg",
    card: "federal",
    nome: "Federal — Festa Junina",
  },
];

async function main() {
  const tema = await queryOne<{ id: number }>("SELECT id FROM themes WHERE slug = 'festa-junina'");
  if (!tema) throw new Error("Tema festa-junina não existe. Rode npm run db:setup antes.");

  for (const a of ARTES) {
    const card = await queryOne<{ id: number }>(
      "SELECT id FROM cards WHERE theme_id = $1 AND slug = $2",
      [tema.id, a.card]
    );
    if (!card) throw new Error(`Card ${a.card} não encontrado.`);

    const existe = await queryOne<{ id: number }>(
      "SELECT id FROM arts WHERE card_id = $1 AND name = $2",
      [card.id, a.nome]
    );
    if (existe) {
      console.log(`· "${a.nome}" já cadastrada (id ${existe.id}), pulando`);
      continue;
    }

    const buf = readFileSync(a.arquivo);
    const meta = await sharp(buf).metadata();
    const boxes = await detectBoxes(buf);
    if (boxes.length === 0) {
      console.warn(`! ${a.arquivo}: não detectei nenhuma caixa`);
    }
    const layout: LayoutBox[] = boxes.map((b) => ({ ...b, type: typographyPadrao(b) }));

    const url = await salvar(`${a.card}-junina.jpg`, buf, "image/jpeg");
    const rows = await query<{ id: number }>(
      `INSERT INTO arts (card_id, name, template_url, template_w, template_h, layout, published)
       VALUES ($1,$2,$3,$4,$5,$6,true) RETURNING id`,
      [card.id, a.nome, url, meta.width, meta.height, JSON.stringify({ boxes: layout })]
    );
    console.log(
      `· "${a.nome}" criada (id ${rows[0].id}, ${boxes.length} ${boxes.length === 1 ? "tabela" : "tabelas"}) -> ${url}`
    );
  }
  console.log("\nPronto.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
