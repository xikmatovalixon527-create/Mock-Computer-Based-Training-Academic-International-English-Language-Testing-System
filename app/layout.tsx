import type { Metadata, Viewport } from 'next';
import { Outfit, Cormorant_Garamond, JetBrains_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

const outfit = Outfit({ 
  subsets: ['latin'], 
  variable: '--font-sans' 
});

const cormorant = Cormorant_Garamond({ 
  subsets: ['latin'], 
  weight: ['300', '400', '500', '600', '700'], 
  variable: '--font-serif' 
});

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ['latin'], 
  variable: '--font-mono' 
});

export const metadata: Metadata = {
  title: 'IELTS CBT Platform — Academic Writing Practice',
  description: 'Professional computer-based IELTS writing test platform with examiner feedback.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${cormorant.variable} ${jetbrainsMono.variable} dark`}>
      <body className="bg-[var(--color-bg)] text-[var(--color-text)] antialiased min-h-screen">
        {children}
        <Toaster
          position="top-center"
          theme="system"
          toastOptions={{
            style: {
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
              borderRadius: 'var(--radius-lg)',
              fontSize: '0.875rem',
            },
          }}
        />
      </body>
    </html>
  );
}