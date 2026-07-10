import type { Metadata } from 'next';
import { Providers } from '../providers/providers';
import { AppFrame } from '../components/shared/app-frame';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: 'Techciko Health Suite',
  description: 'AI Smart Clinic Management System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <AppFrame>{children}</AppFrame>
        </Providers>
      </body>
    </html>
  );
}
