"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NotesHubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    // If we're at /notes-hub/ (with trailing slash), redirect to /notes-hub
    if (window.location.pathname === '/notes-hub/') {
      router.replace('/notes-hub');
    }
  }, [router]);

  return children;
}
