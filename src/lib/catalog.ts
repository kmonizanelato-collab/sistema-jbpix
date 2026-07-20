import { query, queryOne } from "./db";

export type Theme = {
  id: number;
  slug: string;
  name: string;
  icon: string;
  sort_order: number;
};

export type Card = {
  id: number;
  theme_id: number;
  slug: string;
  name: string;
  subtitle: string | null;
  sort_order: number;
};

export function listThemes() {
  return query<Theme>("SELECT * FROM themes ORDER BY sort_order, name");
}

export function getTheme(slug: string) {
  return queryOne<Theme>("SELECT * FROM themes WHERE slug = $1", [slug]);
}

export function listCards(themeId: number) {
  return query<Card>("SELECT * FROM cards WHERE theme_id = $1 ORDER BY sort_order, name", [
    themeId,
  ]);
}

export function getCard(themeId: number, slug: string) {
  return queryOne<Card>("SELECT * FROM cards WHERE theme_id = $1 AND slug = $2", [themeId, slug]);
}
