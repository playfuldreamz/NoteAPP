'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import '@styles/ChatMarkdown.css';

export interface ChatMessageProps {
  message: {
    role: 'user' | 'assistant';
    content: string;
    timestamp?: string;
  };
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div 
        className={`
          max-w-[95%] sm:max-w-[85%] md:max-w-[75%] rounded-lg px-2.5 sm:px-4 py-2 sm:py-3 shadow-sm
          ${isUser 
            ? 'bg-blue-100 dark:bg-blue-900/40 text-gray-800 dark:text-gray-100 border border-blue-200 dark:border-blue-800/40' 
            : 'bg-gray-100 dark:bg-gray-700/40 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-600/40'
          }
        `}
      >
        <div className="flex items-center gap-1.5 mb-1">
          <span className="font-medium text-xs sm:text-sm">
            {isUser ? 'You' : 'Assistant'}
          </span>
          {message.timestamp && (
            <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
              {message.timestamp}
            </span>
          )}
        </div>
          {isUser ? (
          <div className="whitespace-pre-wrap text-sm sm:text-base">{message.content}</div>
        ) : (
          <div className="prose dark:prose-invert prose-sm sm:prose-base max-w-none break-words prose-ol:list-decimal prose-ul:list-disc prose-ol:pl-5 prose-ul:pl-5 prose-li:pl-0 prose-li:my-1">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({inline, className, children, ...props}: {
                  inline?: boolean;
                  className?: string;
                  children?: React.ReactNode;
                }) {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <SyntaxHighlighter
                      style={atomDark as {[key: string]: React.CSSProperties}}
                      language={match[1]}
                      PreTag="div"
                      className="text-xs sm:text-sm overflow-auto max-w-full"
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={`${className} text-xs sm:text-sm`} {...props}>
                      {children}
                    </code>
                  );
                }
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
