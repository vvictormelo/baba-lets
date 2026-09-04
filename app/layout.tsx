import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

// Analytics e Speed Insights só ativos no Vercel
const VercelAnalytics = process.env.VERCEL
  ? require('@vercel/analytics/next').Analytics
  : () => null

const VercelSpeedInsights = process.env.VERCEL
  ? require('@vercel/speed-insights/next').SpeedInsights
  : () => null

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Baba Lets',
  description: 'Votação para o Baba Lets',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        {children}
        <VercelAnalytics />
        <VercelSpeedInsights />
      </body>
    </html>
  )
}
