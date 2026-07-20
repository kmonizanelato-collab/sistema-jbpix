/**
 * Os 25 grupos do jogo do bicho.
 *
 * `emoji` é exatamente o emoji usado nas artes originais (conjunto Noto Color
 * Emoji, do Google) — foi conferido bicho a bicho contra as artes existentes.
 * `codepoint` é o nome do arquivo PNG em /public/emoji.
 */
export type Bicho = {
  grupo: number;
  nome: string;
  emoji: string;
  codepoint: string;
};

export const BICHOS: Bicho[] = [
  { grupo: 1, nome: "AVESTRUZ", emoji: "🦩", codepoint: "1f9a9" },
  { grupo: 2, nome: "ÁGUIA", emoji: "🦅", codepoint: "1f985" },
  { grupo: 3, nome: "BURRO", emoji: "🦙", codepoint: "1f999" },
  { grupo: 4, nome: "BORBOLETA", emoji: "🦋", codepoint: "1f98b" },
  { grupo: 5, nome: "CACHORRO", emoji: "🐕", codepoint: "1f415" },
  { grupo: 6, nome: "CABRA", emoji: "🐐", codepoint: "1f410" },
  { grupo: 7, nome: "CARNEIRO", emoji: "🐑", codepoint: "1f411" },
  { grupo: 8, nome: "CAMELO", emoji: "🐪", codepoint: "1f42a" },
  { grupo: 9, nome: "COBRA", emoji: "🐍", codepoint: "1f40d" },
  { grupo: 10, nome: "COELHO", emoji: "🐇", codepoint: "1f407" },
  { grupo: 11, nome: "CAVALO", emoji: "🐎", codepoint: "1f40e" },
  { grupo: 12, nome: "ELEFANTE", emoji: "🐘", codepoint: "1f418" },
  { grupo: 13, nome: "GALO", emoji: "🐓", codepoint: "1f413" },
  { grupo: 14, nome: "GATO", emoji: "🐈", codepoint: "1f408" },
  { grupo: 15, nome: "JACARÉ", emoji: "🐊", codepoint: "1f40a" },
  { grupo: 16, nome: "LEÃO", emoji: "🦁", codepoint: "1f981" },
  { grupo: 17, nome: "MACACO", emoji: "🐒", codepoint: "1f412" },
  { grupo: 18, nome: "PORCO", emoji: "🐖", codepoint: "1f416" },
  { grupo: 19, nome: "PAVÃO", emoji: "🦚", codepoint: "1f99a" },
  { grupo: 20, nome: "PERU", emoji: "🦃", codepoint: "1f983" },
  { grupo: 21, nome: "TOURO", emoji: "🐂", codepoint: "1f402" },
  { grupo: 22, nome: "TIGRE", emoji: "🐅", codepoint: "1f405" },
  { grupo: 23, nome: "URSO", emoji: "🐻", codepoint: "1f43b" },
  { grupo: 24, nome: "VEADO", emoji: "🦌", codepoint: "1f98c" },
  { grupo: 25, nome: "VACA", emoji: "🐄", codepoint: "1f404" },
];

const byGrupo = new Map(BICHOS.map((b) => [b.grupo, b]));

/** Chave de busca por nome: sem acento, sem caixa, sem espaços. */
function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase();
}

const byNome = new Map(BICHOS.map((b) => [fold(b.nome), b]));

export function bichoPorGrupo(grupo: number): Bicho | undefined {
  return byGrupo.get(grupo);
}

export function bichoPorNome(nome: string): Bicho | undefined {
  return byNome.get(fold(nome));
}
