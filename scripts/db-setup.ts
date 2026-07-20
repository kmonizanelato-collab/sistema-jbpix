/**
 * Cria as tabelas e semeia temas, cards e os dois usuários iniciais.
 * Rodar: npm run db:setup   (é idempotente, pode rodar quantas vezes quiser)
 */
import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

// O Next lê .env.local automaticamente, mas um script solto não — daí carregar
// os dois na mão, com .env.local ganhando de .env.
config({ path: ".env" });
config({ path: ".env.local", override: true });

import { join } from "node:path";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const TEMAS = [
  { slug: "basico", name: "Básico", icon: "LayoutGrid", sort_order: 1 },
  { slug: "festa-junina", name: "Festa Junina", icon: "Flame", sort_order: 2 },
  { slug: "carnaval", name: "Carnaval", icon: "PartyPopper", sort_order: 3 },
  { slug: "pascoa", name: "Páscoa", icon: "Egg", sort_order: 4 },
  { slug: "natal", name: "Natal", icon: "TreePine", sort_order: 5 },
];

const CARDS = [
  { slug: "rj-goias", name: "RJ e Goiás", subtitle: "PT-Rio e Look-Goiás", sort_order: 1 },
  { slug: "bahia-nacional", name: "PT Bahia e Nacional", subtitle: "PT Bahia e Loteria Nacional", sort_order: 2 },
  { slug: "federal", name: "Federal", subtitle: "Loteria Federal — tabela única", sort_order: 3 },
];

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL não definida. Crie o .env.local a partir do .env.example.");
    process.exit(1);
  }
  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false },
  });

  const schema = readFileSync(join(process.cwd(), "db", "schema.sql"), "utf8");
  await pool.query(schema);
  console.log("· tabelas criadas");

  for (const t of TEMAS) {
    const { rows } = await pool.query(
      `INSERT INTO themes (slug, name, icon, sort_order) VALUES ($1,$2,$3,$4)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order
       RETURNING id`,
      [t.slug, t.name, t.icon, t.sort_order]
    );
    const themeId = rows[0].id;
    for (const c of CARDS) {
      await pool.query(
        `INSERT INTO cards (theme_id, slug, name, subtitle, sort_order) VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (theme_id, slug) DO UPDATE SET name = EXCLUDED.name, subtitle = EXCLUDED.subtitle`,
        [themeId, c.slug, c.name, c.subtitle, c.sort_order]
      );
    }
  }
  console.log(`· ${TEMAS.length} temas × ${CARDS.length} cards`);

  /*
    As senhas iniciais NÃO ficam no código: este arquivo vai para o repositório,
    e senha versionada é senha vazada — qualquer um que leia o repositório entra
    no painel. Elas vêm das variáveis SEED_ADMIN_PASSWORD e SEED_THAIS_PASSWORD;
    sem elas, sorteamos uma e mostramos aqui uma única vez.
  */
  function senhaInicial(variavel: string): { valor: string; sorteada: boolean } {
    const doAmbiente = process.env[variavel];
    if (doAmbiente && doAmbiente.length >= 6) return { valor: doAmbiente, sorteada: false };
    return { valor: randomBytes(9).toString("base64url"), sorteada: true };
  }

  const usuarios = [
    { username: "admin", name: "Administrador", role: "admin", env: "SEED_ADMIN_PASSWORD" },
    { username: "thais", name: "Thais", role: "funcionario", env: "SEED_THAIS_PASSWORD" },
  ];

  for (const u of usuarios) {
    const senha = senhaInicial(u.env);
    const hash = await bcrypt.hash(senha.valor, 12);
    // Só insere: se o usuário já existe, não sobrescrevemos a senha — senão
    // rodar o setup de novo desfaria qualquer troca de senha feita no painel.
    const res = await pool.query(
      `INSERT INTO users (username, password_hash, name, role) VALUES ($1,$2,$3,$4)
       ON CONFLICT (username) DO NOTHING`,
      [u.username, hash, u.name, u.role]
    );
    if (!res.rowCount) {
      console.log(`· usuário ${u.username}: já existia (senha preservada)`);
    } else if (senha.sorteada) {
      console.log(`· usuário ${u.username}: criado — SENHA SORTEADA: ${senha.valor}`);
      console.log(`    anote agora; ela não será mostrada de novo. Defina ${u.env} para escolher.`);
    } else {
      console.log(`· usuário ${u.username}: criado com a senha de ${u.env}`);
    }
  }

  await pool.end();
  console.log("\nPronto.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
