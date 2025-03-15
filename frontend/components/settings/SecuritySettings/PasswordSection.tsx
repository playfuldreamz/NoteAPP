import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { toast } from 'react-toastify';
import { API_BASE } from '../../../services/ai';

export const PasswordSection: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPasswordError, setCurrentPasswordError] = useState<string | null>(null);
  const [newPasswordError, setNewPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<number>(0);

  const validatePassword = (password: string, setError: React.Dispatch<React.SetStateAction<string | null>>) => {
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    if (password.length > 64) {
      setError('Password cannot exceed 64 characters');
      return false;
    }
    if (!/[A-Z]/.test(password)) {
      setError('Password must contain at least one uppercase letter');
      return false;
    }
    if (!/[a-z]/.test(password)) {
      setError('Password must contain at least one lowercase letter');
      return false;
    }
    if (!/[0-9]/.test(password)) {
      setError('Password must contain at least one number');
      return false;
    }
    if (!/[!@#$%^&*]/.test(password)) {
      setError('Password must contain at least one special character');
      return false;
    }
    setError(null);
    return true;
  };

  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[!@#$%^&*]/.test(password)) strength++;
    setPasswordStrength(strength);
  };

  const handlePasswordChange = async () => {
    // Validate all fields are filled
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      toast.error('New passwords do not match');
      return;
    }

    // Validate password strength
    if (!validatePassword(newPassword, setNewPasswordError)) {
      toast.error('Please fix password requirements');
      return;
    }

    try {
      setIsChangingPassword(true);
      const response = await fetch(`${API_BASE}/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        if (data.error.includes('current password')) {
          setCurrentPasswordError(data.error);
          toast.error('Current password is incorrect');
        } else {
          setNewPasswordError(data.error);
          toast.error('Failed to update password');
        }
        throw new Error(data.error);
      }

      // Clear form fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setCurrentPasswordError(null);
      setNewPasswordError(null);
      setConfirmPasswordError(null);
      setPasswordStrength(0);

      toast.success('Password updated successfully!');
    } catch (error) {
      console.error('Failed to update password:', error);
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="p-4 rounded-lg bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3 mb-4">
        <Lock className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        <span className="text-gray-700 dark:text-gray-200">Change Password</span>
      </div>
      <div className="space-y-3">
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => {
            setCurrentPassword(e.target.value);
            setCurrentPasswordError(null);
          }}
          placeholder="Current password"
          className={`w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 ${
            currentPasswordError ? 'border-red-500' : ''
          }`}
        />
        {currentPasswordError && (
          <p className="text-sm text-red-600 dark:text-red-400">{currentPasswordError}</p>
        )}
        <input
          type="password"
          value={newPassword}
          onChange={(e) => {
            setNewPassword(e.target.value);
            setNewPasswordError(null);
            calculatePasswordStrength(e.target.value);
          }}
          placeholder="New password"
          className={`w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 ${
            newPasswordError ? 'border-red-500' : ''
          }`}
        />
        {newPasswordError && (
          <p className="text-sm text-red-600 dark:text-red-400">{newPasswordError}</p>
        )}
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            setConfirmPasswordError(null);
          }}
          placeholder="Confirm new password"
          className={`w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 ${
            confirmPasswordError ? 'border-red-500' : ''
          }`}
        />
        {confirmPasswordError && (
          <p className="text-sm text-red-600 dark:text-red-400">{confirmPasswordError}</p>
        )}
        <button
          onClick={handlePasswordChange}
          disabled={!currentPassword || !newPassword || !confirmPassword || isChangingPassword}
          className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isChangingPassword ? 'Updating...' : 'Update Password'}
        </button>
      </div>
    </div>
  );
};

export default PasswordSection;
