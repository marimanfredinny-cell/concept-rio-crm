import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Concept Rio | CRM',
  description: 'CRM Imobiliário - Concept Rio',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
