import React from 'react';
import { Lock } from 'lucide-react';
import UsernameSection from './UsernameSection';
import PasswordSection from './PasswordSection';

interface SecuritySettingsProps {
  setUsername: (username: string) => void;
}

export const SecuritySettings: React.FC<SecuritySettingsProps> = ({ setUsername }) => {
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-3">
          <Lock className="w-5 h-5 text-blue-500" />
          Account Security
        </h3>
        
        {/* Account Credentials Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <UsernameSection setUsername={setUsername} />
          <PasswordSection />
        </div>
      </div>
    </div>
  );
};

export default SecuritySettings;
