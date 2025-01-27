"use client";

import { useEffect, useState } from 'react';
import useTheme from '../hooks/useTheme';

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const { darkMode } = useTheme();

  // Only show the UI after mounting to prevent hydration mismatch
  useEffect(() => {
    const isDark = localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    setMounted(true);
  }, []);

  // Prevent flash during SSR by hiding content until mounted
  if (!mounted) {
    return <div style={{ visibility: 'hidden' }}>{children}</div>;
  }

  return <>{children}</>;
}
