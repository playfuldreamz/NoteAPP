'use client';

import { useEffect, useRef } from 'react';
// Use a relative path for the component in the same directory
import ChatMessage from './ChatMessage';

// Use the exported interface from ChatMessage
type Message = {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
};

interface ChatMessageHistoryProps {
  messages: Message[];
}

export default function ChatMessageHistory({ messages }: ChatMessageHistoryProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);  return (
    <div className="p-2 sm:p-4 overflow-y-auto max-h-full custom-scrollbar">
      <div className="space-y-3 sm:space-y-5">
        {messages.map((message, index) => (
          <ChatMessage 
            key={index} 
            message={message} 
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
