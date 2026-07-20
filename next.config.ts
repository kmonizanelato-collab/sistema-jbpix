import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tira o botão flutuante de devtools do Next (o "N" no canto).
  devIndicators: false,
  images: {
    // As artes ficam no Vercel Blob; o subdomínio muda por projeto.
    remotePatterns: [{ protocol: "https", hostname: "**.public.blob.vercel-storage.com" }],
  },
  // O sharp e o opentype.js rodam só no servidor. Sem isso o bundler tenta
  // empacotá-los e o binário nativo do sharp quebra.
  serverExternalPackages: ["sharp", "opentype.js"],

  /*
    A fonte e os emojis são lidos por caminho montado em tempo de execução
    (join(process.cwd(), ...)), e o Next só empacota na função o que consegue
    enxergar estaticamente. Sem declarar aqui, os arquivos existem no
    repositório mas não dentro da função — e gerar arte quebra só em produção.
  */
  outputFileTracingIncludes: {
    "/api/admin/artes/**": ["./assets/fonts/**", "./public/emoji/**"],
  },
};

export default nextConfig;
