/**
 * Confere se toda arte ainda aponta para um arquivo que existe.
 * Se o render sumiu, zera a referência: a arte volta a mostrar o modelo em vez
 * de quebrar a página. Rodar: npm run db:doctor
 */
import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

import { existsSync } from "node:fs";
import { join } from "node:path";
import { query } from "../src/lib/db";

function existe(url: string): boolean {
  if (!url.startsWith("/uploads/")) return true; // remoto: assumimos que está lá
  return existsSync(join(process.cwd(), "public", url.replace(/^\//, "")));
}

(async () => {
  const artes = await query<{ id: number; name: string; template_url: string; rendered_url: string | null }>(
    "SELECT id, name, template_url, rendered_url FROM arts"
  );
  let corrigidas = 0;
  for (const a of artes) {
    if (a.rendered_url && !existe(a.rendered_url)) {
      await query("UPDATE arts SET rendered_url = NULL, rendered_at = NULL WHERE id = $1", [a.id]);
      console.log(`· "${a.name}": render sumiu, referência zerada`);
      corrigidas++;
    }
    if (!existe(a.template_url)) {
      console.warn(`! "${a.name}" (id ${a.id}): o MODELO sumiu — reenvie a arte.`);
    }
  }
  console.log(corrigidas ? `\n${corrigidas} arte(s) corrigida(s).` : "\nTudo consistente.");
  process.exit(0);
})();
