'use client';

import { useState } from 'react';
import { PlusCircle, MessageSquare, Trash2, Edit2, Check, X } from 'lucide-react';

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
  onRenameChat?: (chatId: string, newTitle: string) => void;
}

export default function ChatSidebar({ 
  chats, 
  activeChatId, 
  onNewChat, 
  onSelectChat, 
  onDeleteChat,
  onRenameChat
}: ChatSidebarProps) {
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editedTitle, setEditedTitle] = useState<string>('');

  const handleEditClick = (chatId: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChatId(chatId);
    setEditedTitle(currentTitle);
  };

  const handleSaveTitle = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editedTitle.trim() && onRenameChat) {
      onRenameChat(chatId, editedTitle.trim());
    }
    setEditingChatId(null);
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChatId(null);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedTitle(e.target.value);
  };

  const handleKeyDown = (chatId: string, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (editedTitle.trim() && onRenameChat) {
        onRenameChat(chatId, editedTitle.trim());
        setEditingChatId(null);
      }
    } else if (e.key === 'Escape') {
      setEditingChatId(null);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden">
      {/* Header with title on mobile */}
      <div className="md:hidden py-3 px-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="font-semibold text-gray-800 dark:text-gray-200">Chat History</h2>
      </div>
      
      {/* New chat button */}
      <button
        onClick={onNewChat}
        className="flex items-center gap-2 mx-3 mt-3 mb-2 px-4 py-2 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800/40 transition-colors shadow-sm"
      >
        <PlusCircle size={16} className="sm:w-[18px] sm:h-[18px]" />
        <span className="font-medium text-sm">New chat</span>
      </button>
      
      {/* Chats list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">{chats.length === 0 ? (
          <div className="px-3 py-3 text-gray-500 dark:text-gray-400 text-xs">
            No chat history yet
          </div>
        ) : (
          <div className="space-y-1 px-2 pb-4">
            {chats.map((chat) => (              <div
                key={chat.id}
                className={`relative flex items-center rounded-md px-2 py-2 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700/50 transition-colors ${
                  activeChatId === chat.id 
                    ? 'bg-gray-200 dark:bg-gray-700/70 text-gray-900 dark:text-gray-100 shadow-sm' 
                    : 'text-gray-700 dark:text-gray-300'
                }`}
                onClick={() => onSelectChat(chat.id)}
              >                <MessageSquare size={14} className="flex-shrink-0 mr-2" />
                <div className="flex-1 min-w-0">
                  {editingChatId === chat.id ? (
                    <div 
                      className="flex items-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        value={editedTitle}
                        onChange={handleTitleChange}
                        onKeyDown={(e) => handleKeyDown(chat.id, e)}
                        className="w-full text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded py-1 px-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        autoFocus
                      />
                      <button 
                        onClick={(e) => handleSaveTitle(chat.id, e)}
                        className="p-1 ml-1 text-green-600 dark:text-green-400 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md"
                        title="Save"
                      >
                        <Check size={14} />
                      </button>
                      <button 
                        onClick={handleCancelEdit}
                        className="p-1 ml-1 text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md"
                        title="Cancel"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="truncate font-medium text-xs">{chat.title}</div>
                      <div className="flex items-center text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                        <span>{chat.timestamp}</span>
                        <span className="mx-1">•</span>
                        <span>{chat.messageCount} message{chat.messageCount !== 1 ? 's' : ''}</span>
                      </div>
                    </>
                  )}
                </div>
                
                {/* Action buttons - only shown when not editing */}
                {editingChatId !== chat.id && (
                  <div className="flex">
                    <button
                      onClick={(e) => handleEditClick(chat.id, chat.title, e)}
                      className="p-1 ml-1 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 opacity-60 hover:opacity-100 focus:opacity-100"
                      title="Rename chat"
                    >
                      <Edit2 size={14} className="text-gray-500 dark:text-gray-400" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteChat(chat.id);
                      }}
                      className="p-1 ml-1 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 opacity-60 hover:opacity-100 focus:opacity-100"
                      title="Delete chat"
                    >
                      <Trash2 size={14} className="text-gray-500 dark:text-gray-400" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
