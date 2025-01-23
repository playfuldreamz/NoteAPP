import TagChip from './TagChip';

interface UserTagChipProps {
  tag: {
    id: number;
    name: string;
    is_user_tag?: boolean;
  };
  isSelected: boolean;
  onToggle: () => void;
}

export default function UserTagChip({ tag, isSelected, onToggle }: UserTagChipProps) {
  return (
    <TagChip 
      tag={tag}
      isSelected={isSelected}
      onToggle={onToggle}
      className={tag.is_user_tag ? 'border-2 border-blue-300' : ''}
    />
  );
}
