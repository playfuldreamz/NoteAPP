import TagChip from './TagChip';
import { UserTag } from '../services/userTags';

interface UserTagChipProps {
  tag: UserTag;
  isSelected: boolean;
  onToggle: (tag: UserTag) => void;
}

export default function UserTagChip({ tag, isSelected, onToggle }: UserTagChipProps) {
  return (
    <TagChip 
      tag={tag}
      isSelected={isSelected}
      onToggle={() => onToggle(tag)}
      className={tag.is_user_tag ? 'border-2 border-blue-300' : ''}
    />
  );
}
