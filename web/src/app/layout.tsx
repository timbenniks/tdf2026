import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TdF Dashboard',
  description: 'Personal Tour de France live dashboard'
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>): React.JSX.Element {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
