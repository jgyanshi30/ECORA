import { Analytics } from '@vercel/analytics/react'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'ECORA — Eco Cleanliness Observation & Real-time Analytics',
  description:
    'ECORA is an AI-powered Urban Intelligence Platform that transforms municipal vehicle dashcam feeds and citizen reports into real-time city intelligence using computer vision, machine learning, and geospatial analytics.',
  generator: 'v0.app',
  icons: {
    icon: [{ url: '/ecora-logo.png', type: 'image/png' }],
    apple: '/ecora-logo.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#070b0a',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="bg-background font-sans antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  )
}