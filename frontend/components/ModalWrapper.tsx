import React from 'react';
import NewModal from './modal/index';
import OldModal from './Modal';

// This wrapper component helps with the transition from the old Modal to the new refactored one
// It has the exact same props as both Modal components
interface ModalWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  title?: string;
  itemId: number;
  type?: 'note' | 'transcript';
  children?: React.ReactNode;
  initialTags?: any[];
  initialSummary?: string | null;
  onTagsUpdate?: (tags: any[]) => void;
  onSummaryUpdate?: (summary: string | null) => void;
  onRegenerateTitle?: () => void;
  isRegeneratingTitle?: boolean;
  onTitleUpdate?: () => void;
  onContentUpdate?: (content: string) => void;
}

// Set this to true to use the new refactored Modal component
// Set to false to revert to the old implementation if needed
const USE_NEW_MODAL = true;

const ModalWrapper: React.FC<ModalWrapperProps> = (props) => {
  // Log which implementation is being used when the modal opens
  React.useEffect(() => {
    if (props.isOpen) {
      console.log(`%c Modal loaded: ${USE_NEW_MODAL ? 'NEW REFACTORED MODAL' : 'OLD ORIGINAL MODAL'}`, 
        `font-weight: bold; color: ${USE_NEW_MODAL ? 'green' : 'orange'}; background: #f0f0f0; padding: 4px; border-radius: 4px;`);
    }
  }, [props.isOpen]);

  // Simply pass all props to either the new or old Modal component
  return USE_NEW_MODAL ? <NewModal {...props} /> : <OldModal {...props} />;
};

export default ModalWrapper;
