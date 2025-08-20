import type React from "react"
import type { Metadata } from "next"
import { Inter, Caveat, DM_Mono } from "next/font/google"
import "./globals.css"
import { Heart } from "lucide-react"
import { AuthProvider } from '@/context/AuthContext'

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

const caveat = Caveat({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-caveat",
  weight: ["400", "500", "600", "700"],
})

const dmMono = DM_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-mono",
  weight: ["300", "400", "500"],
})

export const metadata: Metadata = {
  metadataBase: new URL("https://unwraplove.com"),
  title: "Unwrap Love",
  description: "Where Every Click is a Hug",
  openGraph: {
    title: "Unwrap Love",
    description: "Where Every Click is a Hug",
    images: [
      {
        url: "/images/landing-page.png",
        width: 1200,
        height: 630,
        alt: "Unwrap Love - Digital Storytelling"
      }
    ],
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Unwrap Love",
    description: "Where Every Click is a Hug",
    images: ["/images/landing-page.png"]
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <AuthProvider>
      <html lang="zh-CN">
        <head>
          <meta name="darkreader-lock" />
          <link
            rel="preload"
            href="/images/landing-page.png"
            as="image"
            fetchPriority="high"
          />
          <meta httpEquiv="Cache-Control" content="max-age=31536000, immutable" />
        </head>
        <body
          className={`${inter.variable} ${caveat.variable} ${dmMono.variable} antialiased`}
          suppressHydrationWarning
        >
          {children}
        </body>
      </html>
    </AuthProvider>
  )
}