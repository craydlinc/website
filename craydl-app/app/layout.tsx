import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

const portalId = process.env.NEXT_PUBLIC_HUBSPOT_PORTAL_ID;

export const metadata: Metadata = {
  title: 'CRAYDL',
  description: 'Virtual Design Construction',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {portalId ? (
          <Script
            id="hs-script-loader"
            src={`https://js.hs-scripts.com/${portalId}.js`}
            strategy="afterInteractive"
          />
        ) : null}
        {children}
      </body>
    </html>
  );
}
