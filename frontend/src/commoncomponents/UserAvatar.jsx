import { useAppSettings } from '../hooks/useAppSettings';

const DICEBEAR_BASE = 'https://api.dicebear.com/9.x';

export default function UserAvatar({ seed, name, size = 32, className = '' }) {
  const { settings } = useAppSettings();
  const style = settings.avatar_style || 'fun-emoji';
  const safeSeed = encodeURIComponent(seed || name || 'default');
  const url = `${DICEBEAR_BASE}/${style}/svg?seed=${safeSeed}`;

  return (
    <img
      src={url}
      alt={name || 'avatar'}
      width={size}
      height={size}
      className={`rounded-full bg-primary-50 shrink-0 ${className}`}
      crossOrigin="anonymous"
      loading="lazy"
    />
  );
}
