'use client';

export default function LoadingIndicator() {
  return (
    <div className="flex items-center space-x-1 mx-2 my-1">
      <div className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400 animate-pulse" style={{ animationDelay: '0ms' }}></div>
      <div className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400 animate-pulse" style={{ animationDelay: '200ms' }}></div>
      <div className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400 animate-pulse" style={{ animationDelay: '400ms' }}></div>
    </div>
  );
}
