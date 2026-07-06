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
  const [coachOpen, setCoachOpen] = useState(false);
  const [explainType, setExplainType] = useState(null);

  useEffect(() => {
    const handleOpenCoach = (e) => {
      setCoachOpen(true);
      if (e.detail?.type) {
        setExplainType(e.detail.type);
      }
    };
    window.addEventListener('open-ai-coach', handleOpenCoach);
    return () => window.removeEventListener('open-ai-coach', handleOpenCoach);
  }, []);

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

      {/* Floating AI Coach Button */}
      <button
        onClick={() => setCoachOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-brand to-indigo-600 text-white shadow-xl shadow-brand/20 transition-all hover:scale-110 hover:shadow-brand/35"
        aria-label="Open AI Career Coach"
      >
        <Icon.MessageSquare size={24} />
      </button>

      {/* AI Coach Drawer */}
      {coachOpen && (
        <AICoachDrawer
          onClose={() => setCoachOpen(false)}
          explainType={explainType}
          clearExplainType={() => setExplainType(null)}
        />
      )}
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

function AICoachDrawer({ onClose, explainType, clearExplainType }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm your AI Career Coach. Ask me anything about your resume, skill gaps, or readiness, or click 'Ask Why' on the dashboard to run deep-impact analytics explanations.",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useEffectEventRef();

  useEffect(() => {
    if (explainType) {
      loadExplanation(explainType);
      clearExplainType();
    }
  }, [explainType]);

  // Keep scroll area at bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const loadExplanation = async (type) => {
    setLoading(true);
    const label = type === 'pathScore' ? 'Path Score' : 'Resume Health';
    const introMsg = {
      role: 'assistant',
      content: `Analyzing your ${label} diagnostic metrics and generating your career impact report...`,
    };
    setMessages((prev) => [...prev, introMsg]);

    try {
      const { data } = await api.post('/ai-coach/explain', { type });
      // Remove the placeholder intro message to keep it clean
      setMessages((prev) => [
        ...prev.filter((m) => !m.content.startsWith('Analyzing your')),
        {
          role: 'assistant',
          content: data.data.explanation,
          metrics: data.data.metrics,
        },
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev.filter((m) => !m.content.startsWith('Analyzing your')),
        {
          role: 'assistant',
          content: 'I had trouble fetching your explanation metrics. Please try again in a moment.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await api.post('/ai-coach/chat', {
        message: text,
        history: messages,
      });
      setMessages((prev) => [...prev, { role: 'assistant', content: data.data.response }]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I hit a snag answering that. Can you try again?',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={onClose} />

      {/* Drawer Container */}
      <div className="relative flex h-full w-full max-w-md flex-col border-l border-line bg-slate-900 text-white shadow-2xl animate-fade-right">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-brand to-indigo-500 text-white shadow-md shadow-brand/20">
              <Icon.MessageSquare size={16} />
            </span>
            <div>
              <h3 className="text-sm font-bold tracking-wide">AI Career Coach</h3>
              <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Online
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
            aria-label="Close drawer"
          >
            <Icon.X size={18} />
          </button>
        </div>

        {/* Message Panel */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-900/95"
        >
          {messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={index}
                className={cn(
                  "flex flex-col max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed",
                  isUser
                    ? "ml-auto bg-brand text-white rounded-br-none"
                    : "mr-auto bg-slate-800/80 border border-white/5 text-slate-200 rounded-bl-none"
                )}
              >
                {/* Markdown render (very simplified to preserve styling tags) */}
                <div className="space-y-1.5 whitespace-pre-line font-medium">
                  {msg.content}
                </div>

                {/* Sub-metrics visualization card */}
                {msg.metrics && msg.metrics.length > 0 && (
                  <div className="mt-3.5 border-t border-white/5 pt-3 space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Metrics Impact Details</p>
                    <div className="space-y-2">
                      {msg.metrics.map((m, idx) => (
                        <div key={idx} className="space-y-0.5">
                          <div className="flex justify-between text-[10px] font-bold text-slate-300">
                            <span>{m.name}</span>
                            <span>{m.value}{m.max ? `/${m.max}` : ''}</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-slate-950 overflow-hidden border border-white/5">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-500",
                                m.impact === 'positive' || m.impact === 'high' ? 'bg-emerald-500' : 'bg-amber-500'
                              )}
                              style={{ width: `${m.max ? (m.value / m.max) * 100 : m.value}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="flex items-center gap-1 mr-auto bg-slate-800/50 border border-white/5 rounded-2xl px-4 py-3">
              <span className="h-2 w-2 rounded-full bg-slate-500 animate-bounce" />
              <span className="h-2 w-2 rounded-full bg-slate-500 animate-bounce [animation-delay:0.2s]" />
              <span className="h-2 w-2 rounded-full bg-slate-500 animate-bounce [animation-delay:0.4s]" />
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="border-t border-line p-4 bg-slate-950/60 flex gap-2">
          <input
            type="text"
            placeholder="Ask about resume, jobs, target skills..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="input flex-1 !bg-slate-900 border border-white/10 text-white placeholder-slate-500 !h-10 text-xs px-3 focus:border-brand"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white transition hover:bg-brand-soft disabled:opacity-50"
          >
            <Icon.Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}

// React ref helper to maintain scroll anchor
function useEffectEventRef() {
  const ref = useRef(null);
  return ref;
}
