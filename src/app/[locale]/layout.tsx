import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales } from '@/i18n';
import { Header, Footer } from '@/components/layout';
import '@/app/globals.css';

import { AuthProvider } from '@/providers';

export const metadata: Metadata = {
  title: 'CivicFix - Transform Complaints into Action',
  description: 'Report local issues, rally community support, and track resolutions in real-time.',
};

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;
  
  // Validate locale
  if (!locales.includes(locale as 'en' | 'am')) {
    notFound();
  }

  // Get messages for the locale
  const messages = await getMessages();

  return (
    <html lang={locale} className="dark">
      <body className="min-h-screen antialiased overflow-x-hidden">
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            <div className="relative flex min-h-screen flex-col">
              {/* Ultra-Luxury Atmosphere Layers - Clean */}
              
              <Header />
              <main className="flex-1 pt-24 relative z-10">
                {children}
              </main>
              <Footer />
            </div>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}
