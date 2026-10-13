import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { UnifrakturMaguntia } from 'next/font/google'
import './globals.css'

const unifraktur = UnifrakturMaguntia({ weight: '400', subsets: ['latin'], variable: '--font-unifraktur', display: 'swap' })

export const metadata: Metadata = {
  title: 'Purple cat | Control de Inventario - Ropa Gótica',
  description: 'Sistema de gestión de inventario de Purple cat, tienda de ropa gótica',
  generator: 'v0.app',
  icons: {
    icon: [
      { url: '/icon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#08040d',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${unifraktur.variable} bg-[#08040d]`}>
      <body className="antialiased bg-[#08040d]">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
