import { cn } from '@/lib/cn';

const SIZES = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-20 w-20 text-2xl' };

/** User avatar — shows the uploaded image, or initials on a brand gradient. */
export function Avatar({ user, size = 'md', className }) {
  const initials =
    user?.name
      ?.split(' ')
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?';

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold text-white',
        SIZES[size],
        !user?.profile?.avatarUrl && 'btn-brand',
        className
      )}
    >
      {user?.profile?.avatarUrl ? (
        <img
          src={user.profile.avatarUrl}
          alt={user.name}
          className="h-full w-full object-cover"
        />
      ) : (
        initials
      )}
    </div>
  );
}
