import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "JBPIXS — Painel",
  description: "Painel interno JBPIXS",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f6f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0b" },
  ],
};

// Roda antes da primeira pintura para o tema não piscar no carregamento.
const THEME_SCRIPT = `
(function () {
  try {
    var salvo = localStorage.getItem('jbpixs-tema');
    var tema = salvo || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = tema;
  } catch (e) {
    document.documentElement.dataset.theme = 'light';
  }
  requestAnimationFrame(function () {
    document.documentElement.setAttribute('data-theme-ready', '');
  });
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
