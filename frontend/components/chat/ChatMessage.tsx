'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';

export interface ChatMessageProps {
  message: {
    role: 'user' | 'assistant';
    content: string;
    timestamp?: string;
  };
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div 
        className={`
          max-w-[80%] md:max-w-[70%] rounded-lg px-4 py-3 
          ${isUser 
            ? 'bg-blue-100 dark:bg-blue-900/40 text-gray-800 dark:text-gray-100' 
            : 'bg-gray-100 dark:bg-gray-700/40 text-gray-800 dark:text-gray-100'
          }
        `}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">
            {isUser ? 'You' : 'Assistant'}
          </span>
          {message.timestamp && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {message.timestamp}
            </span>
          )}
        </div>
        
        {isUser ? (
          <div className="whitespace-pre-wrap">{message.content}</div>
        ) : (
          <div className="prose dark:prose-invert prose-sm max-w-none">
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
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props}>
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
