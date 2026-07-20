import { query, queryOne } from "./db";
import type { Entry } from "./parse";
import type { LayoutBox } from "./render";

export type Art = {
  id: number;
  card_id: number;
  name: string;
  template_url: string;
  template_w: number;
  template_h: number;
  layout: { boxes: LayoutBox[] };
  tables: Record<string, Entry[]>;
  rendered_url: string | null;
  rendered_at: Date | null;
  published: boolean;
  created_at: Date;
  updated_at: Date;
};

/** A imagem que o funcionário vê: a renderizada, ou o modelo se ainda não houver. */
export function imagemVisivel(art: Art): string {
  return art.rendered_url ?? art.template_url;
}

export function listPublished(cardId: number) {
  return query<Art>(
    "SELECT * FROM arts WHERE card_id = $1 AND published = true ORDER BY created_at DESC",
    [cardId]
  );
}

export function listAll(cardId: number) {
  return query<Art>("SELECT * FROM arts WHERE card_id = $1 ORDER BY created_at DESC", [cardId]);
}

export function listAllArts() {
  return query<Art & { card_name: string; theme_name: string; theme_slug: string; card_slug: string }>(
    `SELECT a.*, c.name AS card_name, c.slug AS card_slug, t.name AS theme_name, t.slug AS theme_slug
       FROM arts a
       JOIN cards c ON c.id = a.card_id
       JOIN themes t ON t.id = c.theme_id
      ORDER BY a.created_at DESC`
  );
}

export function getArt(id: number) {
  return queryOne<Art>("SELECT * FROM arts WHERE id = $1", [id]);
}

export function getArtPublicada(id: number) {
  return queryOne<Art>("SELECT * FROM arts WHERE id = $1 AND published = true", [id]);
}

export async function criarArt(input: {
  cardId: number;
  name: string;
  templateUrl: string;
  w: number;
  h: number;
  boxes: LayoutBox[];
}) {
  const rows = await query<{ id: number }>(
    `INSERT INTO arts (card_id, name, template_url, template_w, template_h, layout)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [
      input.cardId,
      input.name,
      input.templateUrl,
      input.w,
      input.h,
      JSON.stringify({ boxes: input.boxes }),
    ]
  );
  return rows[0].id;
}

export async function salvarTabelas(
  id: number,
  tables: Record<string, Entry[]>,
  renderedUrl: string,
  boxes?: LayoutBox[]
) {
  await query(
    `UPDATE arts SET tables = $2, rendered_url = $3, rendered_at = now(), updated_at = now()
       ${boxes ? ", layout = $4" : ""}
     WHERE id = $1`,
    boxes
      ? [id, JSON.stringify(tables), renderedUrl, JSON.stringify({ boxes })]
      : [id, JSON.stringify(tables), renderedUrl]
  );
}

export async function definirPublicacao(id: number, published: boolean) {
  await query("UPDATE arts SET published = $2, updated_at = now() WHERE id = $1", [id, published]);
}

export async function apagarArt(id: number) {
  await query("DELETE FROM arts WHERE id = $1", [id]);
}
