"use client";

import { ToastContainer } from 'react-toastify';
import { usePathname } from 'next/navigation';
import localFont from 'next/font/local';
import "./globals.css";
import 'react-toastify/dist/ReactToastify.css';
import ClientLayout from './ClientLayout';

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: '--font-geist-sans',
  weight: '100 900',
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: '--font-geist-mono',
  weight: '100 900',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAuthRoute = pathname === '/login' || pathname === '/register';

  return (
    <html lang="en" className={`h-full ${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased min-h-full bg-gray-50 dark:bg-gray-900">
        {isAuthRoute ? (
          <>
            {children}
            <ToastContainer 
              position="bottom-right"
              autoClose={5000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="dark"
            />
          </>
        ) : (
          <ClientLayout>
            {children}
          </ClientLayout>
        )}
      </body>
    </html>
  );
}
