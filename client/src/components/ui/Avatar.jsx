/**
 * components/ui/Avatar.jsx — User Avatar Component
 *
 * Displays the user's profile picture if they have uploaded one.
 * Falls back to their initials on a branded gradient background when no image exists.
 *
 * Example:
 *   User name "Krish Shah" → initials "KS" on a brand-coloured circle
 *   User with avatarUrl   → their actual photo, cropped to a circle
 *
 * SIZES:
 *   sm — small (h-8 w-8), used in the top navigation bar
 *   md — medium (h-10 w-10), used in dropdown menus
 *   lg — large (h-20 w-20), used on the profile page header
 *
 * USAGE:
 *   <Avatar user={user} />           // medium size by default
 *   <Avatar user={user} size="sm" /> // small, for the nav bar
 *   <Avatar user={user} size="lg" /> // large, for profile page
 */

import { cn } from '@/lib/cn';

// Tailwind classes for each size variant
const SIZES = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-20 w-20 text-2xl' };

/** User avatar — shows uploaded image, or initials on a brand gradient fallback. */
export function Avatar({ user, size = 'md', className }) {
  // Build initials from the user's name.
  // Split by space → take first letter of each word → first 2 only → uppercase
  // If user has no name, fall back to '?'
  const initials =
    user?.name
      ?.split(' ')         // ["Krish", "Shah"]
      .map((p) => p[0])    // ["K", "S"]
      .slice(0, 2)         // ["K", "S"] (max 2 initials)
      .join('')            // "KS"
      .toUpperCase() || '?';

  return (
    <div
      className={cn(
        // Base: circular container, centered content, no overflow (clips the image to circle)
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold text-white',
        SIZES[size],
        // Only apply the branded gradient background when there's no profile picture
        !user?.profile?.avatarUrl && 'btn-brand',
        className
      )}
    >
      {/* If the user has uploaded an avatar image, show it. Otherwise show initials text. */}
      {user?.profile?.avatarUrl ? (
        <img
          src={user.profile.avatarUrl}
          alt={user.name}
          className="h-full w-full object-cover" // fill the circle, crop the image
        />
      ) : (
        initials // e.g. "KS"
      )}
    </div>
  );
}
