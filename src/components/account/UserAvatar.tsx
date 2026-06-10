import clsx from 'clsx';
import { getAvatarColor, getInitials } from '../../lib/userAccount';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZE_CLASS: Record<AvatarSize, string> = {
  sm: 'user-avatar-sm',
  md: 'user-avatar-md',
  lg: 'user-avatar-lg',
  xl: 'user-avatar-xl',
};

interface UserAvatarProps {
  displayName: string;
  size?: AvatarSize;
  className?: string;
  imageUrl?: string | null;
}

export function UserAvatar({
  displayName,
  size = 'md',
  className,
  imageUrl,
}: UserAvatarProps) {
  const initials = getInitials(displayName);
  const color = getAvatarColor(displayName);

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        className={clsx('user-avatar', SIZE_CLASS[size], className)}
      />
    );
  }

  return (
    <span
      className={clsx('user-avatar', SIZE_CLASS[size], className)}
      style={{ backgroundColor: color }}
      aria-hidden
    >
      {initials}
    </span>
  );
}