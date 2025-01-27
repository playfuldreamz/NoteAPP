"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    // If we're at /home/ (with trailing slash), redirect to /home
    if (window.location.pathname === '/home/') {
      router.replace('/home');
    }
  }, [router]);

  return children;
}
