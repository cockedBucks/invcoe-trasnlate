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
  title: 'محمود تسخيت',
  description: 'محمود تسخيت - ترجمة فواتير PDF إلى العربية الفصحى بدقة ومطابقة حسابية.',
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
        <div className="relative z-10 min-h-screen flex flex-col">{children}</div>
      </body>
    </html>
  );
}
