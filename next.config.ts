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
};

export default nextConfig;
