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
    <div className="p-4 rounded-lg bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3 mb-4">
        <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        <span className="text-gray-700 dark:text-gray-200">Change Username</span>
      </div>
      <div className="space-y-3">
        <input
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
          placeholder="Enter new username"
          className={`w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 ${
            usernameError ? 'border-red-500' : ''
          }`}
        />
        {usernameError && (
          <p className="text-sm text-red-600 dark:text-red-400">{usernameError}</p>
        )}
        <input
          type="password"
          value={usernamePassword}
          onChange={(e) => {
            setUsernamePassword(e.target.value);
            setUsernamePasswordError(null);
          }}
          placeholder="Enter current password"
          className={`w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 ${
            usernamePasswordError ? 'border-red-500' : ''
          }`}
        />
        {usernamePasswordError && (
          <p className="text-sm text-red-600 dark:text-red-400">{usernamePasswordError}</p>
        )}
        <button
          onClick={handleUsernameChange}
          disabled={!newUsername || !usernamePassword || isChangingUsername}
          className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isChangingUsername ? 'Updating...' : 'Update Username'}
        </button>
      </div>
    </div>
  );
};

export default UsernameSection;
