import type { Metadata } from 'next'
import { DM_Serif_Display, Outfit, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import Sidebar from '@/components/Sidebar'

const dmSerif = DM_Serif_Display({
  variable: '--font-dm-serif',
  subsets: ['latin'],
  weight: '400',
})

const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
})

const jetbrains = JetBrains_Mono({
  variable: '--font-jetbrains',
  subsets: ['latin'],
  weight: ['400', '500'],
})

export const metadata: Metadata = {
  title: 'LinkedIn Agent',
  description: 'LinkedIn post generation and management',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${dmSerif.variable} ${outfit.variable} ${jetbrains.variable} h-full antialiased bg-surface text-ink`}
      >
        <div className="flex h-full">
          <Sidebar />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </body>
    </html>
  )
}
