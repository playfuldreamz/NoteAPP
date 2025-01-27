"use client";

import React from 'react';

interface MainContentProps {
  children: React.ReactNode;
}

export default function MainContent({ children }: MainContentProps) {
  return (
    <div className="flex-1 ml-16 bg-gray-50 dark:bg-gray-900 overflow-auto">
      <div className="h-full max-w-[2000px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 pt-12 pb-8">
        {children}
      </div>
    </div>
  );
}