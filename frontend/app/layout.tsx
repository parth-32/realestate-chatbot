import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AURA | Luxury Real Estate AI Concierge (DarGlobal & Wasalt)',
  description: 'AI-powered real estate discovery for DarGlobal international branded residences and Wasalt Saudi Arabian prime properties. Powered by OpenRouter free models.',
  keywords: ['DarGlobal', 'Wasalt', 'Luxury Real Estate', 'AI Chatbot', 'Dubai Real Estate', 'Riyadh Villas', 'OpenRouter'],
  authors: [{ name: 'Antigravity AI Engineer' }],
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Syne:wght@500;600;700;800&family=Cinzel:wght@600;700&family=Noto+Sans+Arabic:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-[#080C14] text-slate-100 min-h-screen selection:bg-[#D4AF37]/30 selection:text-[#FFF]">
        {children}
      </body>
    </html>
  );
}
