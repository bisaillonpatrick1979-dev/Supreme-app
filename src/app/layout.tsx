import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'sonner'
import { ThemeProvider } from '@/context/ThemeContext'

export const metadata: Metadata = {
  title: 'HailiteManager - Gestion Hailite Xteriors',
  description: 'Plateforme de gestion complète pour Hailite Xteriors - Roofing & Siding',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: 'rgb(var(--color-bg-elevated))',
                border: '1px solid rgb(var(--color-border))',
                color: 'rgb(var(--color-text))',
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  )
}
