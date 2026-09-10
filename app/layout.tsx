import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'

const VercelAnalytics = process.env.VERCEL
  ? require('@vercel/analytics/next').Analytics
  : () => null

const VercelSpeedInsights = process.env.VERCEL
  ? require('@vercel/speed-insights/next').SpeedInsights
  : () => null

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: "Let's Baba!",
  description: 'Votação para o Baba Lets',
  icons: {
    icon: '/icon.png',
    apple: '/logo.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        {children}
        <Toaster richColors position="top-center" />
        <VercelAnalytics />
        <VercelSpeedInsights />
      </body>
    </html>
  )
}
