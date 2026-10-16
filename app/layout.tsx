export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        {/* Carga instantánea de Tailwind CSS y Fuentes Góticas */}
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
        <style>{`
          body {
            font-family: 'Inter', sans-serif;
            background-color: #0a0a12 !important;
            color: #e2d9f3 !important;
          }
          h1, h2, h3 {
            font-family: 'Cinzel', serif;
          }
        `}</style>
      </head>
      <body className="bg-[#0a0a12] text-[#e2d9f3] min-h-screen">
        {children}
      </body>
    </html>
  )
}
