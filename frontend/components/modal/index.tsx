import React, { useState, useEffect } from 'react';
import ModalShell from './ModalShell';
import ModalHeader from './ModalHeader';
import ContentViewer from './ContentViewer';
import ContentEditor from './ContentEditor';
import MetadataTabs from './MetadataTabs';
import SummaryTab from './tabs/SummaryTab';
import TagsTab from './tabs/TagsTab';
import BacklinksTab from './tabs/BacklinksTab';
import ActionItemsTab from './tabs/ActionItemsTab';
import { useModalContent, useModalTitle, useModalNavigation, useModalTabs } from '../../hooks/modal';
import { Tag } from '../../services/ai';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  title?: string;
  itemId: number;
  type?: 'note' | 'transcript';
  children?: React.ReactNode;
  initialTags?: Tag[];
  initialSummary?: string | null;
  onTagsUpdate?: (tags: Tag[]) => void;
  onSummaryUpdate?: (summary: string | null) => void;
  onRegenerateTitle?: () => void;
  isRegeneratingTitle?: boolean;
  onTitleUpdate?: () => void;
  onContentUpdate?: (content: string) => void;
}

const Modal: React.FC<ModalProps> = (props) => {
  const {
    isOpen,
    onClose,
    content: initialContent,
    title: initialTitle,
    itemId,
    type = 'note',
    initialTags = [],
    initialSummary = null,
    onTagsUpdate,
    onSummaryUpdate,
    onTitleUpdate
  } = props;

  // State management
  const [tags, setTags] = useState<Tag[]>(initialTags);
  const [currentSummary, setCurrentSummary] = useState<string | null>(initialSummary);
  const [selectedNoteId, setSelectedNoteId] = useState<number>(itemId);
  const [normalizedType, setNormalizedType] = useState(type === 'note' || type === 'transcript' ? type : 'note');

  // Custom hooks
  const content = useModalContent({
    initialContent,
    itemId: selectedNoteId,
    type: normalizedType,
    onContentUpdate: props.onContentUpdate
  });

  const title = useModalTitle({
    initialTitle,
    itemId: selectedNoteId,
    type: normalizedType,
    onTitleUpdate,
    onRegenerateTitle: props.onRegenerateTitle,
    isRegeneratingTitle: props.isRegeneratingTitle
  });

  const tabs = useModalTabs({
    initialTab: 'summary',
    isOpen
  });

  // Synchronize selectedNoteId with itemId prop
  useEffect(() => {
    setSelectedNoteId(itemId);
  }, [itemId]);

  // Synchronize normalizedType with type prop
  useEffect(() => {
    const newNormalizedType = type === 'note' || type === 'transcript' ? type : 'note';
    setNormalizedType(newNormalizedType);
  }, [type]);

  // Reset state when a new item is being shown
  useEffect(() => {
    if (isOpen) {
      setCurrentSummary(initialSummary);
    }
  }, [isOpen, itemId, initialSummary]);

  // Handle summary generation from SummaryModule
  const handleSummaryGenerated = (newSummary: string) => {
    setCurrentSummary(newSummary);
    // Call the parent component's callback if provided
    if (onSummaryUpdate) {
      onSummaryUpdate(newSummary);
    }
  };

  // Initialize navigation hook with all required state setters
  const navigation = useModalNavigation({
    itemId: selectedNoteId,
    type: normalizedType,
    editableTitle: title.editableTitle,
    content: content.content,
    currentSummary,
    tags,
    setContent: content.setContent,
    setEditableTitle: title.setEditableTitle,
    setSelectedNoteId,
    setTags,
    setCurrentSummary,
    setActiveTab: tabs.setActiveTab,
    setIsEditMode: content.setIsEditMode,
    setIsEditingTitle: title.setIsEditingTitle,
    setEditableContent: content.setEditableContent,
    setNormalizedType
  });

  if (!isOpen) return null;

  return (
    <ModalShell isOpen={isOpen} onClose={onClose}>
      <ModalHeader
        title={initialTitle || ''}
        isEditingTitle={title.isEditingTitle}
        setIsEditingTitle={title.setIsEditingTitle}
        editableTitle={title.editableTitle}
        setEditableTitle={title.setEditableTitle}
        handleSaveTitle={title.handleSaveTitle}
        handleCancelEdit={title.handleCancelEdit}
        onRegenerateTitle={props.onRegenerateTitle}
        isRegeneratingTitle={props.isRegeneratingTitle}
        breadcrumbStack={navigation.breadcrumbStack}
        handleBackNavigation={navigation.handleBackNavigation}
        onClose={onClose}
        setIsEditMode={content.setIsEditMode}
        isEditMode={content.isEditMode}
        isScrolled={tabs.isScrolled}
        itemId={selectedNoteId}
        normalizedType={normalizedType}
        content={content.content}
        tags={tags}
      />

      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
        {/* Left panel - Content */}
        <div 
          className={`flex-1 min-w-0 ${content.isEditMode ? '' : 'overflow-y-auto'} px-4 sm:px-6 py-4 lg:border-r border-gray-200 dark:border-gray-700 flex flex-col`}
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgb(156 163 175) transparent'
          }}
          onScroll={tabs.handleScroll}
        >
          {content.isEditMode ? (
            <ContentEditor
              editableContent={content.editableContent}
              handleContentChange={content.handleContentChange}
              handlePaste={content.handlePaste}
              formatText={content.formatText}
              saveContent={content.saveContent}
              handleCancelEditContent={content.handleCancelEditContent}
              handleCopyEditableContent={content.handleCopyEditableContent}
              hasEditableContent={content.hasEditableContent}
              isSaving={content.isSaving}
            />
          ) : (
            <ContentViewer
              content={content.content}
              onLinkClick={navigation.navigateToLink}
            />
          )}
        </div>

        {/* Right panel - Tabs */}
        <MetadataTabs activeTab={tabs.activeTab} setActiveTab={tabs.setActiveTab}>
          {tabs.activeTab === 'summary' && (
            <SummaryTab
              itemId={selectedNoteId}
              normalizedType={normalizedType}
              content={content.content}
              currentSummary={currentSummary}
              onSummaryGenerated={handleSummaryGenerated}
            />
          )}
          {tabs.activeTab === 'tags' && (
            <TagsTab
              itemId={selectedNoteId}
              normalizedType={normalizedType}
              content={content.content}
              tags={tags}
              onTagsUpdate={onTagsUpdate}
            />
          )}
          {tabs.activeTab === 'backlinks' && (
            <BacklinksTab
              itemId={selectedNoteId}
              normalizedType={normalizedType}
              onBacklinkClick={navigation.navigateToBacklink}
            />
          )}
          {tabs.activeTab === 'actions' && (
            <ActionItemsTab
              itemId={selectedNoteId}
              normalizedType={normalizedType}
              content={content.content}
            />
          )}
        </MetadataTabs>
      </div>
    </ModalShell>
  );
};

export default Modal;
