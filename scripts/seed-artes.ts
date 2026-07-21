/**
 * Cadastra as artes-modelo (tabelas vazias) que já estão preparadas em disco.
 *
 * Rodar: npm run seed:artes
 * É idempotente: arte com o mesmo nome no mesmo card é ignorada.
 */
import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

import { readFileSync, existsSync } from "node:fs";
import sharp from "sharp";
import { query, queryOne } from "../src/lib/db";
import { detectBoxes } from "../src/lib/detect";
import { typographyPadrao, type LayoutBox } from "../src/lib/render";
import { salvar } from "../src/lib/storage";

type Arte = { arquivo: string; tema: string; card: string; nome: string };

const ARTES: Arte[] = [
  // Festa Junina
  {
    arquivo: "imagens/saida/ptrio-lookgoias.jpg",
    tema: "festa-junina",
    card: "rj-goias",
    nome: "PT-Rio e Look-Goiás — Festa Junina",
  },
  {
    arquivo: "imagens/saida/nacional-ptbahia.jpg",
    tema: "festa-junina",
    card: "bahia-nacional",
    nome: "PT Bahia e Nacional — Festa Junina",
  },
  {
    arquivo: "imagens/saida/federal.jpg",
    tema: "festa-junina",
    card: "federal",
    nome: "Federal — Festa Junina",
  },
  // Natal
  {
    arquivo: "imagens/saida/natal-rj-goias.jpg",
    tema: "natal",
    card: "rj-goias",
    nome: "PT-Rio e Look-Goiás — Natal",
  },
  {
    arquivo: "imagens/saida/natal-nacional-ptbahia.jpg",
    tema: "natal",
    card: "bahia-nacional",
    nome: "PT Bahia e Nacional — Natal",
  },
  {
    arquivo: "imagens/saida/natal-federal.jpg",
    tema: "natal",
    card: "federal",
    nome: "Federal — Natal",
  },
];

async function main() {
  let criadas = 0;

  for (const a of ARTES) {
    if (!existsSync(a.arquivo)) {
      console.warn(`! ${a.arquivo} não existe, pulando`);
      continue;
    }

    const card = await queryOne<{ id: number }>(
      `SELECT c.id FROM cards c JOIN themes t ON t.id = c.theme_id
        WHERE t.slug = $1 AND c.slug = $2`,
      [a.tema, a.card]
    );
    if (!card) {
      console.warn(`! card ${a.tema}/${a.card} não existe, pulando`);
      continue;
    }

    const existe = await queryOne<{ id: number }>(
      "SELECT id FROM arts WHERE card_id = $1 AND name = $2",
      [card.id, a.nome]
    );
    if (existe) {
      console.log(`· "${a.nome}" já cadastrada (id ${existe.id})`);
      continue;
    }

    const buf = readFileSync(a.arquivo);
    const meta = await sharp(buf).metadata();
    const boxes = await detectBoxes(buf);
    if (boxes.length === 0) console.warn(`  ! nenhuma caixa detectada em ${a.arquivo}`);
    const layout: LayoutBox[] = boxes.map((b) => ({ ...b, type: typographyPadrao(b) }));

    const url = await salvar(`${a.tema}-${a.card}.jpg`, buf, "image/jpeg");
    const rows = await query<{ id: number }>(
      `INSERT INTO arts (card_id, name, template_url, template_w, template_h, layout, published)
       VALUES ($1,$2,$3,$4,$5,$6,true) RETURNING id`,
      [card.id, a.nome, url, meta.width, meta.height, JSON.stringify({ boxes: layout })]
    );
    console.log(
      `· "${a.nome}" criada (id ${rows[0].id}, ${boxes.length} ${boxes.length === 1 ? "tabela" : "tabelas"})`
    );
    criadas++;
  }

  console.log(criadas ? `\n${criadas} arte(s) criada(s).` : "\nNada novo a cadastrar.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
