import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { Logo } from '@/components/ui/Logo';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/icons';
import { NAV_ITEMS } from '@/config/nav';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { api } from '@/lib/api';

function NavItem({ item, onNavigate }) {
  const Ico = item.icon;

  if (!item.ready) {
    return (
      <div
        className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-faint/70"
        title="Coming soon"
      >
        <Ico size={18} />
        <span className="flex-1">{item.label}</span>
        <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-faint">
          Soon
        </span>
      </div>
    );
  }

  return (
    <NavLink
      to={item.path}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
          isActive
            ? 'bg-brand/15 text-ink shadow-[inset_0_0_0_1px_rgba(99,102,241,0.3)]'
            : 'text-muted hover:bg-surface-2 hover:text-ink'
        )
      }
    >
      {({ isActive }) => (
        <>
          <Ico size={18} className={isActive ? 'text-brand-soft' : ''} />
          <span>{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

function SidebarContent({ user, onNavigate }) {
  const items = NAV_ITEMS.filter((i) => !i.admin || user?.role === 'admin');
  return (
    <div className="flex h-full flex-col gap-1 p-4">
      <div className="px-2 py-3">
        <Logo />
      </div>
      <nav className="mt-2 flex flex-1 flex-col gap-1 overflow-y-auto">
        {items.map((item) => (
          <NavItem key={item.path} item={item} onNavigate={onNavigate} />
        ))}
      </nav>
    </div>
  );
}

/**
 * Authenticated app shell: fixed sidebar on desktop, slide-over drawer on
 * mobile, and a sticky topbar with the page title + user menu. All feature
 * pages render inside this via the `title` + `children` props.
 */
export function AppShell({ title, subtitle, actions, children }) {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const onLogout = async () => {
    await logout();
    toast.info('Logged out');
    navigate('/login');
  };

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen border-r border-line bg-surface/40 lg:block">
        <SidebarContent user={user} />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-[260px] border-r border-line bg-surface animate-fade-up">
            <SidebarContent user={user} onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-40 glass border-b border-line">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
            <button
              className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-ink lg:hidden"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
            >
              <Icon.Menu size={20} />
            </button>

            <div className="flex-1">
              {title && <h1 className="font-display text-lg font-bold text-ink">{title}</h1>}
              {subtitle && <p className="text-xs text-faint">{subtitle}</p>}
            </div>

            {actions}

            <NotificationBell />

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
                className="flex items-center gap-2 rounded-full p-0.5 pr-2 transition hover:bg-surface-2"
              >
                <Avatar user={user} size="sm" />
                <span className="hidden text-sm font-medium text-ink sm:block">
                  {user?.name?.split(' ')[0]}
                </span>
              </button>

              {menuOpen && (
                <div className="glass absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-line shadow-xl animate-fade-up">
                  <div className="border-b border-line px-4 py-3">
                    <p className="truncate text-sm font-semibold text-ink">{user?.name}</p>
                    <p className="truncate text-xs text-faint">{user?.email}</p>
                  </div>
                  <button
                    onMouseDown={() => navigate('/profile')}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-muted hover:bg-surface-2 hover:text-ink"
                  >
                    <Icon.User size={16} /> Profile
                  </button>
                  <button
                    onMouseDown={onLogout}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-danger hover:bg-danger/10"
                  >
                    <Icon.Logout size={16} /> Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl animate-fade-up">{children}</div>
        </main>
      </div>
    </div>
  );
}

function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data.data.notifications || []);
      setUnreadCount(data.data.unreadCount || 0);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const markAllAsRead = async () => {
    try {
      await api.patch('/notifications/mark-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        className="relative rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-ink transition"
        aria-label="Notifications"
      >
        <Icon.Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand text-[9px] font-bold text-white ring-2 ring-surface">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="glass absolute right-0 mt-2 w-80 overflow-hidden rounded-xl border border-line shadow-2xl animate-fade-up z-50">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="text-xs font-bold text-ink uppercase tracking-wider">Notifications</span>
            {unreadCount > 0 && (
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  markAllAsRead();
                }}
                className="text-[10px] font-bold text-brand-soft hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-line">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-faint">
                All caught up! No notifications.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (!n.read) markAsRead(n._id);
                  }}
                  className={cn(
                    "flex items-start gap-2.5 px-4 py-3 cursor-pointer transition hover:bg-surface-2/60",
                    !n.read && "bg-brand/5"
                  )}
                >
                  <span
                    className={cn(
                      "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                      !n.read ? "bg-brand" : "bg-transparent"
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-xs font-semibold text-ink", !n.read && "font-bold")}>
                      {n.title}
                    </p>
                    <p className="text-[11px] text-muted leading-relaxed mt-0.5">
                      {n.message}
                    </p>
                    <p className="text-[9px] text-faint mt-1">
                      {new Date(n.createdAt).toLocaleDateString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
