import { useState, useEffect } from 'react';

interface UseModalTabsProps {
  initialTab?: string;
  isOpen?: boolean;
}

export const useModalTabs = ({
  initialTab = 'summary',
  isOpen = false
}: UseModalTabsProps = {}) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isScrolled, setIsScrolled] = useState(false);

  // Reset active tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setIsScrolled(e.currentTarget.scrollTop > 0);
  };

  return {
    activeTab,
    setActiveTab,
    isScrolled,
    handleScroll
  };
};

export default useModalTabs;
