import type { Metadata, Viewport } from 'next'
import { Sora, Fraunces } from 'next/font/google'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/components/AuthProvider'
import '../globals.css'

const sora = Sora({ subsets: ['latin'], variable: '--font-sora', weight: ['400', '500', '600', '700'] })
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces', weight: ['500', '600', '700'], style: ['normal', 'italic'] })

export const metadata: Metadata = {
  title: 'Rewards — earn real money',
  description: 'Complete tasks, play games, and earn real rewards.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#F2F4EE',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sora.variable} ${fraunces.variable}`}>
      <body>
        <AuthProvider>
          {children}
          <Toaster position="top-center" richColors closeButton />
        </AuthProvider>
      </body>
    </html>
  )
}