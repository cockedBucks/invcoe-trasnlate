import type { Metadata } from 'next';
import { Inter, Cairo, Architects_Daughter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  variable: '--font-cairo',
  display: 'swap',
});

const architectsDaughter = Architects_Daughter({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-sketch',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'محمود تسخيت | مترجم الفواتير السلكي اليدوي',
  description:
    'محمود تسخيت - مترجم الفواتير الإنجليزية إلى العربية الفصحى بطابع سلكي ورسم يدوي، دقة متناهية وحسابات مطابقة 100%.',
  icons: {
    icon: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`dark ${inter.variable} ${cairo.variable} ${architectsDaughter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="bg-[#080d1a] text-slate-100 font-cairo antialiased selection:bg-emerald-500/30 selection:text-emerald-300 min-h-screen">
        {/* Blueprint Wireframe Grid Background */}
        <div className="fixed inset-0 pointer-events-none wireframe-grid z-0 opacity-40" />
        <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(16,185,129,0.12),transparent)] z-0" />
        <div className="relative z-10 min-h-screen flex flex-col">{children}</div>
      </body>
    </html>
  );
}
