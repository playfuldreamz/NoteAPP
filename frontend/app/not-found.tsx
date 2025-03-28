"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const [mounted, setMounted] = useState(false);
  
  // This ensures hydration matching by only rendering the component after mounting on the client
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="max-w-md w-full text-center px-4">
        <div>
          <h1 className="text-9xl font-bold text-blue-600 dark:text-blue-400">404</h1>
          <h2 className="text-3xl font-semibold mt-4">Page Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Oops! The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        
        <div className="mt-8">
          <Link 
            href="/home"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors duration-200"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
          
          <div className="pt-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Need help? Contact support or try refreshing the page.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
