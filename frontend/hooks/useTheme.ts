import { useState, useEffect } from 'react';

const useTheme = () => {
  // Initialize with null to indicate loading state
  const [darkMode, setDarkMode] = useState<boolean | null>(null);

  useEffect(() => {
    // Get initial theme from localStorage or system preference
    const isDark = localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    setDarkMode(isDark);
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  const toggleDarkMode = () => {
    if (darkMode === null) return; // Don't toggle if initial state isn't set
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    document.documentElement.classList.toggle('dark', newDarkMode);
    localStorage.setItem('theme', newDarkMode ? 'dark' : 'light');
  };

  return { darkMode, toggleDarkMode };
};

export default useTheme;