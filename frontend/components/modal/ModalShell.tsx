import React, { useEffect } from 'react';

interface ModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const ModalShell: React.FC<ModalShellProps> = ({ isOpen, onClose, children }) => {
  // Handle body overflow when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-sm">
      <div className="fixed inset-4 lg:inset-8 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col max-h-[calc(100vh-2rem)] lg:max-h-[calc(100vh-4rem)]">
        {children}
      </div>
    </div>
  );
};

export default ModalShell;
