/**
 * Recalcula as caixas das artes a partir do modelo já guardado.
 * Útil quando a detecção melhora e as artes antigas ficaram com o layout velho.
 * Rodar: npm run artes:redetectar
 */
import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

import { query } from "../src/lib/db";
import { salvarLayout, type Art } from "../src/lib/arts";
import { ler } from "../src/lib/storage";
import { detectBoxes } from "../src/lib/detect";
import { typographyPadrao, type LayoutBox } from "../src/lib/render";

(async () => {
  const artes = await query<Art>("SELECT * FROM arts ORDER BY id");
  for (const a of artes) {
    const antes = (a.layout?.boxes ?? []) as LayoutBox[];
    const boxes = await detectBoxes(await ler(a.template_url));
    if (boxes.length === 0) {
      console.warn(`! "${a.name}": nenhuma caixa detectada, mantendo o layout atual`);
      continue;
    }
    const novo: LayoutBox[] = boxes.map((b) => ({ ...b, type: typographyPadrao(b) }));
    await salvarLayout(a.id, novo);
    const mudou = JSON.stringify(antes.map((b) => b.type)) !== JSON.stringify(novo.map((b) => b.type));
    console.log(
      `· "${a.name}": ${boxes.length} caixa(s)${mudou ? " — tipografia atualizada" : " — sem mudança"}`
    );
  }
  process.exit(0);
})();
