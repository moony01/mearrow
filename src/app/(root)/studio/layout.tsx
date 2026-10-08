import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import Script from 'next/script';
import { BRAND_NAME, BRAND_TAGLINE } from '@/lib/brand';
import { ADSENSE_PUBLISHER_ID, FULL_URL } from '@/lib/constants';
import StudioFrame from './StudioFrame';

const configuredGaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const GA_MEASUREMENT_ID = configuredGaMeasurementId && /^[A-Z0-9-]+$/.test(configuredGaMeasurementId)
  ? configuredGaMeasurementId
  : 'G-LWCB5XG3S9';

export const metadata: Metadata = {
  metadataBase: new URL(FULL_URL),
  title: {
    default: `${BRAND_NAME} Studio`,
    template: `%s | ${BRAND_NAME} Studio`,
  },
  description: `${BRAND_NAME}'s news, auditions, fan voting, AI services, and community in one place. ${BRAND_TAGLINE}`,
  openGraph: {
    siteName: BRAND_NAME,
    type: 'website',
    locale: 'en_US',
  },
  twitter: { card: 'summary_large_image' },
};

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  setRequestLocale('en');
  const messages = await getMessages({ locale: 'en' });

  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="studio-google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){window.dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}');
        `}
      </Script>
      <Script
        async
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUBLISHER_ID}`}
        crossOrigin="anonymous"
        strategy="lazyOnload"
      />
      <StudioFrame>{children}</StudioFrame>
    </NextIntlClientProvider>
  );
}
