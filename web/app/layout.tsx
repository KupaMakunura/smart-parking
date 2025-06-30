import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'smart-parking',
  description: 'Smart parking app and parking allocation system',
 
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
