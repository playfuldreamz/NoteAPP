"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import RegisterForm from '../../components/RegisterForm';
import DarkModeToggle from '../../components/DarkModeToggle';
import { ThemeProvider } from '../../context/ThemeContext';

export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    if (token) {
      router.push('/');
    }
  }, [router]);

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100">
            Create your account
          </h2>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <RegisterForm />
        </div>

        <div className="fixed bottom-4 right-4 z-50">
          <DarkModeToggle />
        </div>
      </div>
    </ThemeProvider>
  );
}