import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: {
    default: "Purple Cat · Vestí tu propia magia",
    template: "%s | Purple Cat",
  },
  description:
    "Descubrí la colección de Purple Cat: ropa alternativa, piezas con carácter y un estilo propio.",
  icons: { icon: "/icon-32x32.png", apple: "/apple-icon.png" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" data-scroll-behavior="smooth">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Inter:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#0a0a12] text-[#e2d9f3] min-h-screen">
        {children}
      </body>
    </html>
  );
}
