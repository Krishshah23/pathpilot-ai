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

/**
 * Resolves a file URL that may be a relative path (e.g. '/uploads/avatars/xyz.jpg')
 * stored by the Node backend. In production the frontend (Vercel) and backend (Render)
 * are on different domains, so relative paths must be prefixed with the backend origin.
 * In dev, Vite proxies /api/* but NOT /uploads/*, so we still need to point at localhost:5000.
 */
function resolveUploadUrl(url) {
  if (!url) return null;
  if (url.startsWith('http')) return url; // already absolute (e.g. Google OAuth photo)
  // Get backend base URL from env (same one used by api.js) but strip the trailing /api
  const apiBase = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '');
  if (apiBase) return `${apiBase}${url}`;
  // Dev fallback: Vite dev server — proxy doesn't cover /uploads, point at backend directly
  if (typeof window !== 'undefined' && window.location.port === '5173') {
    return `http://localhost:5000${url}`;
  }
  return url;
}

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

  const resolvedAvatarUrl = resolveUploadUrl(user?.profile?.avatarUrl);

  return (
    <div
      className={cn(
        // Base: circular container, centered content, no overflow (clips the image to circle)
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold text-white',
        SIZES[size],
        // Only apply the branded gradient background when there's no profile picture
        !resolvedAvatarUrl && 'bg-ink',
        className
      )}
    >
      {/* If the user has uploaded an avatar image, show it. Otherwise show initials text. */}
      {resolvedAvatarUrl ? (
        <img
          src={resolvedAvatarUrl}
          alt={user.name}
          className="h-full w-full object-cover" // fill the circle, crop the image
          onError={(e) => { e.currentTarget.style.display = 'none'; }} // fallback if broken
        />
      ) : (
        initials // e.g. "KS"
      )}
    </div>
  );
}
