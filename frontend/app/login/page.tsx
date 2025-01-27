"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoginForm from '../../components/LoginForm';
import DarkModeToggle from '../../components/DarkModeToggle';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    if (token) {
      router.push('/');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100">
          Sign in to your account
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <LoginForm />
      </div>

      <div className="fixed bottom-4 right-4 z-50">
        <DarkModeToggle />
      </div>
    </div>
  );
}