import { AIProvider } from '../../services/ai';

export type { AIProvider } from '../../services/ai';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  setUsername: (username: string) => void;
  currentModel: string;
  modelSource: string;
}

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  source: string;
}

export interface SavedAPIKeys {
  [key: string]: {
    key: string;
    source: string;
  };
}
