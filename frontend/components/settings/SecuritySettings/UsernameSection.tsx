import React, { useState } from 'react';
import { User } from 'lucide-react';
import { toast } from 'react-toastify';
import { API_BASE } from '../../../services/ai';

interface UsernameSectionProps {
  setUsername: (username: string) => void;
}

export const UsernameSection: React.FC<UsernameSectionProps> = ({ setUsername }) => {
  const [newUsername, setNewUsername] = useState('');
  const [usernamePassword, setUsernamePassword] = useState('');
  const [isChangingUsername, setIsChangingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernamePasswordError, setUsernamePasswordError] = useState<string | null>(null);

  const handleUsernameChange = async () => {
    try {
      setIsChangingUsername(true);
      const response = await fetch(`${API_BASE}/change-username`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          newUsername,
          password: usernamePassword
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        if (data.error.includes('password')) {
          setUsernamePasswordError(data.error);
          toast.error('Incorrect password');
        } else if (data.error.includes('taken')) {
          setUsernameError(data.error);
          toast.error('Username is already taken');
        } else {
          setUsernameError(data.error);
          toast.error('Failed to update username');
        }
        throw new Error(data.error);
      }

      // Update username in state and localStorage
      setUsername(newUsername);
      
      // Clear form
      setNewUsername('');
      setUsernamePassword('');
      setUsernameError(null);
      setUsernamePasswordError(null);

      toast.success(`Username updated to ${newUsername}`);
    } catch (error) {
      console.error('Failed to update username:', error);
    } finally {
      setIsChangingUsername(false);
    }
  };

  return (
    <div className="flex flex-col bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow duration-200">
      <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
        <User className="w-5 h-5 text-blue-500" />
        Username Settings
      </h4>
      <form onSubmit={(e) => {
        e.preventDefault();
        handleUsernameChange();
      }} className="flex flex-col flex-1 space-y-4">
        <div className="relative">
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            New Username
          </label>
          <div className="mt-1 relative">
            <input
              id="username"
              type="text"
              value={newUsername}
              onChange={(e) => {
                const value = e.target.value.slice(0, 20);
                setNewUsername(value);
                setUsernameError(null);
                
                if (value.length < 3) {
                  setUsernameError('Username must be at least 3 characters');
                } else if (!/^[a-zA-Z0-9_]+$/.test(value)) {
                  setUsernameError('Only letters, numbers and underscores allowed');
                } else {
                  setUsernameError(null);
                }
              }}
              className={`block w-full px-3 py-2 border ${
                usernameError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-800 transition-all duration-200 pr-10 input-animation`}
              required
              aria-invalid={!!usernameError}
              aria-describedby="username-error"
              onFocus={(e) => {
                e.target.placeholder = '';
              }}
              onBlur={(e) => {
                if (!e.target.value) {
                  e.target.placeholder = 'New Username';
                }
              }}
            />
            {newUsername.length > 0 && !usernameError && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
          <div className="mt-2 space-y-1">
            {usernameError ? (
              <p id="username-error" className="text-sm text-red-600 dark:text-red-400">
                {usernameError}
              </p>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {newUsername.length > 0 && `Available characters: ${Math.max(0, 20 - newUsername.length)}`}
              </p>
            )}
            <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <li className={`flex items-center ${newUsername.length >= 3 ? 'text-green-500' : ''}`}>
                <svg className={`w-3 h-3 mr-1 ${newUsername.length >= 3 ? 'text-green-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                At least 3 characters
              </li>
              <li className={`flex items-center ${/^[a-zA-Z0-9_]+$/.test(newUsername) ? 'text-green-500' : 'text-gray-400'}`}>
                <svg className={`w-3 h-3 mr-1 ${/^[a-zA-Z0-9_]+$/.test(newUsername) ? 'text-green-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Only letters, numbers and underscores
              </li>
            </ul>
          </div>
        </div>

        <div>
          <label htmlFor="usernamePassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Current Password
          </label>
          <div className="mt-1 relative">
            <input
              id="usernamePassword"
              type="password"
              placeholder="Enter current password"
              value={usernamePassword}
              onChange={(e) => {
                setUsernamePassword(e.target.value);
                setUsernamePasswordError(null);
              }}
              className={`block w-full px-3 py-2 border ${
                usernamePasswordError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-800 input-animation`}
              required
              aria-invalid={!!usernamePasswordError}
              aria-describedby="password-error"
              onFocus={(e) => {
                e.target.placeholder = '';
              }}
              onBlur={(e) => {
                if (!e.target.value) {
                  e.target.placeholder = 'Enter current password';
                }
              }}
            />
            {usernamePasswordError && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
          {usernamePasswordError && (
            <p id="password-error" className="mt-2 text-sm text-red-600 dark:text-red-400">
              {usernamePasswordError}
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={isChangingUsername || !newUsername || !usernamePassword}
          className="w-full px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          {isChangingUsername ? 'Updating...' : 'Update Username'}
        </button>
      </form>
    </div>
  );
};

export default UsernameSection;
