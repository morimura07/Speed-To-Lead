import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '../lib/auth';

export const metadata: Metadata = {
  title: 'LeadArrow — Speed to Lead',
  description:
    'LeadArrow rings the right sales rep the instant a lead lands — across phone, browser, and push. Built for high-ticket sales teams.',
  applicationName: 'LeadArrow',
};

export const viewport: Viewport = {
  themeColor: '#0a0b0e',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
