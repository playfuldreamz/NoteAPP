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
    <div className="flex flex-col bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow duration-200">
      <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
        <Lock className="w-5 h-5 text-blue-500" />
        Password Settings
      </h4>
      <form onSubmit={(e) => {
        e.preventDefault();
        handlePasswordChange();
      }} className="flex flex-col flex-1 space-y-4">
        <div>
          <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Current Password
          </label>
          <div className="mt-1 relative">
            <input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                setCurrentPasswordError(null);
              }}
              className={`block w-full px-3 py-2 border ${
                currentPasswordError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-800`}
              required
            />
            {currentPasswordError && (
              <p className="mt-2 text-sm text-red-600">{currentPasswordError}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            New Password
          </label>
          <div className="mt-1 relative">
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setNewPasswordError(null);
                calculatePasswordStrength(e.target.value);
              }}
              className={`block w-full px-3 py-2 border ${
                newPasswordError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-800`}
              required
            />
            {newPasswordError && (
              <p className="mt-2 text-sm text-red-600">{newPasswordError}</p>
            )}
          </div>
          <div className="mt-2">
            <div className="flex space-x-1">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className={`h-1 w-full rounded-full ${
                    i < passwordStrength
                      ? passwordStrength <= 2
                        ? 'bg-red-500'
                        : passwordStrength <= 4
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Password strength: {
                passwordStrength <= 2 ? 'Weak' :
                passwordStrength <= 4 ? 'Medium' :
                'Strong'
              }
            </p>
          </div>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Confirm New Password
          </label>
          <div className="mt-1 relative">
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setConfirmPasswordError(null);
              }}
              className={`block w-full px-3 py-2 border ${
                confirmPasswordError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-800`}
              required
            />
            {confirmPasswordError && (
              <p className="mt-2 text-sm text-red-600">{confirmPasswordError}</p>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
          className="w-full px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          {isChangingPassword ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  );
};

export default PasswordSection;
