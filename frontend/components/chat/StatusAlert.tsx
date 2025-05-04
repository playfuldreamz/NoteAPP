'use client';

import { AlertTriangle, Info, CheckCircle } from 'lucide-react';

type AlertType = 'error' | 'warning' | 'info' | 'success';

interface StatusAlertProps {
  message: string;
  type?: AlertType;
}

export default function StatusAlert({ message, type = 'error' }: StatusAlertProps) {
  const getIcon = () => {
    switch (type) {
      case 'error':
        return <AlertTriangle size={18} className="text-red-500 dark:text-red-400" />;
      case 'warning':
        return <AlertTriangle size={18} className="text-yellow-500 dark:text-yellow-400" />;
      case 'info':
        return <Info size={18} className="text-blue-500 dark:text-blue-400" />;
      case 'success':
        return <CheckCircle size={18} className="text-green-500 dark:text-green-400" />;
    }
  };

  const getStyles = () => {
    const baseStyles = "flex items-center gap-2 px-4 py-2 text-sm rounded-md mb-3";
    
    switch (type) {
      case 'error':
        return `${baseStyles} bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800`;
      case 'warning':
        return `${baseStyles} bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-800`;
      case 'info':
        return `${baseStyles} bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800`;
      case 'success':
        return `${baseStyles} bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800`;
    }
  };

  return (
    <div className={getStyles()}>
      {getIcon()}
      <span>{message}</span>
    </div>
  );
}
