'use client';

import { useState } from 'react';
import { PlusCircle, MessageSquare, Trash2 } from 'lucide-react';

interface ChatItem {
  id: string;
  title: string;
  timestamp: string;
  messageCount: number;
}

interface ChatSidebarProps {
  chats: ChatItem[];
  activeChatId: string | null;
  onNewChat: () => void;
  onSelectChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
}

export default function ChatSidebar({ 
  chats, 
  activeChatId, 
  onNewChat, 
  onSelectChat, 
  onDeleteChat 
}: ChatSidebarProps) {
  const [hoverChatId, setHoverChatId] = useState<string | null>(null);

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      {/* New chat button */}
      <button
        onClick={onNewChat}
        className="flex items-center gap-2 mx-3 mt-3 mb-4 px-3 py-2 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800/40 transition-colors"
      >
        <PlusCircle size={18} />
        <span className="font-medium">New chat</span>
      </button>
      
      {/* Chats list */}
      <div className="flex-1 overflow-y-auto">
        {chats.length === 0 ? (
          <div className="px-3 py-2 text-gray-500 dark:text-gray-400 text-sm">
            No chat history yet
          </div>
        ) : (
          <div className="space-y-1 px-2">
            {chats.map((chat) => (
              <div
                key={chat.id}
                className={`relative flex items-center rounded-md px-2 py-2 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700/50 transition-colors ${
                  activeChatId === chat.id 
                    ? 'bg-gray-200 dark:bg-gray-700/70 text-gray-900 dark:text-gray-100' 
                    : 'text-gray-700 dark:text-gray-300'
                }`}
                onClick={() => onSelectChat(chat.id)}
                onMouseEnter={() => setHoverChatId(chat.id)}
                onMouseLeave={() => setHoverChatId(null)}
              >
                <MessageSquare size={16} className="flex-shrink-0 mr-2" />
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium text-sm">{chat.title}</div>
                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                    <span>{chat.timestamp}</span>
                    <span className="mx-1">•</span>
                    <span>{chat.messageCount} message{chat.messageCount !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                
                {/* Delete button - only shows on hover */}
                {hoverChatId === chat.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteChat(chat.id);
                    }}
                    className="p-1 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                    title="Delete chat"
                  >
                    <Trash2 size={16} className="text-gray-500 dark:text-gray-400" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
