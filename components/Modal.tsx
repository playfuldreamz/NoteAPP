import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, content }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'; // Disable scrolling
    } else {
      document.body.style.overflow = 'unset'; // Re-enable scrolling
    }
    return () => {
      document.body.style.overflow = 'unset'; // Clean up on unmount
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full relative">
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-xl p-2">
          &times;
        </button>
        <p>{content}</p>
      </div>
    </div>
  );
};

export default Modal;
