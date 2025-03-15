import React from 'react';
import { Lock } from 'lucide-react';
import UsernameSection from './UsernameSection';
import PasswordSection from './PasswordSection';

interface SecuritySettingsProps {
  setUsername: (username: string) => void;
}

export const SecuritySettings: React.FC<SecuritySettingsProps> = ({ setUsername }) => {
  return (
    <div className="space-y-8">
      <div className="p-8 rounded-xl bg-gray-50 dark:bg-gray-800/50">
        <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-8 flex items-center gap-3">
          <Lock className="w-7 h-7 text-blue-500" />
          Account Security
        </h3>
        
        {/* Account Credentials Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <UsernameSection setUsername={setUsername} />
          <PasswordSection />
        </div>
      </div>
    </div>
  );
};

export default SecuritySettings;
