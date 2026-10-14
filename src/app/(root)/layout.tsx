import '@/styles/main.scss';
import Script from 'next/script';
import { ADSENSE_PUBLISHER_ID } from '@/lib/constants';

const ADSENSE_SCRIPT_URL = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUBLISHER_ID}`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="google-adsense-account" content={ADSENSE_PUBLISHER_ID} />
      </head>
      <body>
        {children}
        <Script
          async
          src={ADSENSE_SCRIPT_URL}
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
