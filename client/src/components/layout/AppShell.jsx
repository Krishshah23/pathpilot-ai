/**
 * components/layout/AppShell.jsx — Master Layout Shell Component
 *
 * ARCHITECTURAL ROLE:
 * Serves as the outer layout wrapper for all authenticated student and admin pages.
 *
 * LAYOUT STRUCTURE:
 * 1. `TopNav`: Sticky frosted navbar featuring logo, primary navigation links, notification drawer,
 *    and user profile avatar dropdown.
 * 2. `NotificationBell`: Polling drawer (every 30s) rendering real-time notifications.
 * 3. `AICoachFab` & `AICoachDrawer`: Floating action button and slide-over Gemini AI chat drawer.
 *    Supports custom event dispatch (`open-ai-coach`) for auto-explaining Path Score cards.
 * 4. `<main>` Container: Centered max-w-7xl content container wrapped in smooth entrance animations.
 */

import { useEffect, useState, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/cn';
import { Avatar } from '@/components/ui/Avatar';
import { Logo } from '@/components/ui/Logo';
import { Icon } from '@/components/ui/icons';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { api, errorMessage } from '@/lib/api';
import { Footer } from '@/components/layout/Footer';
import { ContactModal } from '@/components/layout/ContactModal';

/* ─── Top Nav ─────────────────────────────────────────────────────── */

const NAV_LINKS = [
  { label: 'Overview',        path: '/dashboard' },
  { label: 'Resume Builder',  path: '/resume-builder' },
  { label: 'Resume Strategy', path: '/talent-analyzer' },
  { label: 'Live Jobs',       path: '/live-jobs', live: true },
  { label: 'Skill Roadmap',   path: '/execution-engine' },
  { label: 'Interview Prep',  path: '/interview-prep' },
];

const ADMIN_NAV_LINKS = [
  { label: 'Admin Panel', path: '/admin' },
];

function TopNav({ user, onOpenContact, onStartTour }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const { logout } = useAuth();
  const toast = useToast();

  const isAdmin = user?.role === 'admin';
  const links = isAdmin ? ADMIN_NAV_LINKS : NAV_LINKS;

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setDropdownOpen(false);
    navigate('/', { replace: true });
    await logout();
    toast.info('Logged out successfully');
  };

  return (
    <div className="sticky top-0 z-40 px-3 pt-3 sm:px-5 sm:pt-4">
      <header className="apple-glass mx-auto max-w-7xl rounded-2xl border border-line shadow-[0_8px_32px_-8px_rgba(0,0,0,0.12)] transition-colors duration-300">
        <div className="px-4 sm:px-6 h-14 flex items-center justify-between gap-8">

          {/* Left: Logo */}
          <NavLink to="/dashboard" className="flex items-center shrink-0">
            <Logo />
          </NavLink>

          {/* Center: Nav links (desktop) — Apple pill-per-item nav */}
          <nav className="hidden md:flex items-center gap-1">
            {links.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                data-tour={`nav-${link.path.replace('/', '')}`}
                className={({ isActive }) =>
                  cn(
                    'px-3.5 py-1.5 rounded-full text-[13px] font-semibold transition-all duration-200 flex items-center gap-1.5',
                    isActive
                      ? 'bg-brand text-white shadow-sm'
                      : 'text-muted hover:text-ink hover:bg-surface-2'
                  )
                }
              >
                {link.live && (
                  <span className="relative flex h-1.5 w-1.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current" />
                  </span>
                )}
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Right: Bell + Avatar */}
          <div className="flex items-center gap-2 shrink-0 relative" ref={dropdownRef}>
            <NotificationBell />

            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 rounded-full p-0.5 pr-2.5 transition hover:bg-surface-2 focus:outline-none"
              title="Account options"
            >
              <Avatar user={user} size="sm" />
              <span className="hidden sm:block text-[13px] font-semibold text-ink">
                {user?.name?.split(' ')[0]}
              </span>
              <Icon.ChevronDown size={13} className={cn("text-faint transition-transform duration-200", dropdownOpen && "rotate-180")} />
            </button>

            {/* Account Dropdown Popover */}
            {dropdownOpen && (
              <div className="apple-glass absolute right-0 top-full mt-2 w-56 rounded-2xl border border-line p-1.5 shadow-xl z-50 animate-fade-down origin-top-right">
                {/* Account Header */}
                <div className="px-3 py-2 border-b border-line mb-1">
                  <p className="text-xs font-bold text-ink leading-tight truncate">{user?.name}</p>
                  <p className="text-[10px] text-faint truncate mt-0.5">{user?.email}</p>
                  <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-surface-2 text-muted text-[9px] font-semibold uppercase tracking-wider border border-line">
                    {user?.role}
                  </span>
                </div>

                {/* Actions */}
                {!isAdmin && (
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      navigate('/profile');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted hover:text-ink hover:bg-surface-2 rounded-xl transition-colors"
                  >
                    <Icon.User size={14} />
                    Profile Settings
                  </button>
                )}

                {!isAdmin && onStartTour && (
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      onStartTour();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted hover:text-ink hover:bg-surface-2 rounded-xl transition-colors"
                  >
                    <Icon.Compass size={14} />
                    Take a Tour
                  </button>
                )}

                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    onOpenContact();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted hover:text-ink hover:bg-surface-2 rounded-xl transition-colors"
                >
                  <Icon.MessageSquare size={14} />
                  Contact &amp; Feedback
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-danger hover:bg-danger/10 rounded-xl transition-colors"
                >
                  <Icon.Logout size={14} />
                  Log out
                </button>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              className="md:hidden rounded-full p-2 text-muted hover:bg-surface-2"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <Icon.X size={20} /> : <Icon.Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile nav drawer */}
        {mobileOpen && (
          <div className="md:hidden border-t border-line px-4 py-3 space-y-1 animate-fade-up">
            {links.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'block px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-brand text-white'
                      : 'text-muted hover:text-ink hover:bg-surface-2'
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>
        )}
      </header>
    </div>
  );
}

/* ─── Shared Profile Components ───────────────────────────────────── */

export function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input w-full text-sm"
      />
    </div>
  );
}

export function SkillTagInput({ skills, onChange }) {
  const [input, setInput] = useState('');

  const addSkill = (skill) => {
    const s = skill.trim();
    if (s && !skills.includes(s)) {
      onChange([...skills, s]);
    }
    setInput('');
  };

  const removeSkill = (s) => onChange(skills.filter((x) => x !== s));

  return (
    <div className="rounded-xl border border-line p-3 min-h-[80px]">
      <div className="flex flex-wrap gap-1.5 mb-2">
        {skills.map((s) => (
          <span
            key={s}
            className="inline-flex items-center gap-1 rounded-lg bg-surface-2 border border-line px-2.5 py-1 text-xs text-ink"
          >
            {s}
            <button
              onClick={() => removeSkill(s)}
              className="text-faint hover:text-danger"
            >
              <Icon.X size={10} />
            </button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addSkill(input);
          }
        }}
        placeholder="Type skill + Enter"
        className="w-full text-xs text-ink placeholder-faint bg-transparent outline-none"
      />
    </div>
  );
}

/* ─── Notification Bell ───────────────────────────────────────────── */

function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data.data.notifications || []);
      setUnreadCount(data.data.unreadCount || 0);
    } catch { /* silent */ }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const markAllAsRead = async () => {
    try {
      await api.patch('/notifications/mark-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch { /* silent */ }
  };

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}`);
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch { /* silent */ }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        className="relative rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-ink transition-colors"
        aria-label="Notifications"
      >
        <Icon.Bell size={19} />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand text-[9px] font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-xl border border-line bg-surface shadow-lg animate-fade-up z-50">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="text-xs font-bold text-ink uppercase tracking-wider">Notifications</span>
            {unreadCount > 0 && (
              <button
                onMouseDown={(e) => { e.preventDefault(); markAllAsRead(); }}
                className="text-[10px] font-semibold text-brand hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-line">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-faint">
                All caught up!
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (!n.read) markAsRead(n._id);
                    if (n.actionLink) {
                      setOpen(false);
                      navigate(n.actionLink);
                    }
                  }}
                  className={cn(
                    'flex items-start gap-2.5 px-4 py-3 cursor-pointer transition hover:bg-surface-2',
                    !n.read && 'bg-surface-2'
                  )}
                >
                  <span className={cn(
                    'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full',
                    !n.read ? 'bg-brand' : 'bg-transparent'
                  )} />
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-xs text-ink', !n.read && 'font-semibold')}>{n.title}</p>
                    <p className="text-[11px] text-muted leading-relaxed mt-0.5">{n.message}</p>
                    <p className="text-[9px] text-faint mt-1">
                      {new Date(n.createdAt).toLocaleDateString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {n.actionLink && <Icon.ChevronRight size={12} className="text-faint shrink-0 mt-1" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── AI Coach Drawer ─────────────────────────────────────────────── */

function AICoachDrawer({ onClose, explainType, clearExplainType, messages, setMessages }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  const QUICK_PROMPTS = [
    "What are my biggest resume gaps?",
    "How can I improve my Path Score?",
    "What should I focus on this week?",
  ];

  useEffect(() => {
    if (explainType) {
      loadExplanation(explainType);
      clearExplainType();
    }
  }, [explainType]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const loadExplanation = async (type) => {
    setLoading(true);
    setMessages((prev) => [...prev, {
      role: 'assistant',
      content: `Analyzing your ${type === 'pathScore' ? 'Path Score' : 'Resume Health'} metrics…`,
    }]);
    try {
      const { data } = await api.post('/ai-coach/explain', { type });
      setMessages((prev) => [
        ...prev.filter((m) => !m.content.startsWith('Analyzing')),
        { role: 'assistant', content: data.data.explanation, metrics: data.data.metrics },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev.filter((m) => !m.content.startsWith('Analyzing')),
        { role: 'assistant', content: 'Could not fetch explanation. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);
    try {
      const { data } = await api.post('/ai-coach/chat', { message: text, history: messages });
      setMessages((prev) => [...prev, { role: 'assistant', content: data.data.response }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, I hit a snag. Try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-md flex-col bg-surface border-l border-line shadow-xl animate-fade-right">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white">
              <Icon.MessageSquare size={16} />
            </span>
            <div>
              <h3 className="text-sm font-bold text-ink">AI Career Coach</h3>
              <span className="flex items-center gap-1 text-[10px] text-brand">
                <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" /> Online
              </span>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close AI Career Coach" className="rounded-lg p-1.5 text-faint hover:bg-surface-2 hover:text-ink">
            <Icon.X size={18} />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-3 bg-canvas">
          {messages.map((msg, i) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={i}
                className={cn(
                  'max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                  isUser
                    ? 'ml-auto bg-brand text-white rounded-br-none'
                    : 'mr-auto bg-surface border border-line text-ink rounded-bl-none'
                )}
              >
                {isUser ? (
                  <p className="whitespace-pre-line">{msg.content}</p>
                ) : (
                  <div className="markdown-chat">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  </div>
                )}
                {msg.metrics?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-line space-y-2">
                    {msg.metrics.map((m, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between text-xs text-muted mb-1">
                          <span>{m.name}</span>
                          <span>{m.value}{m.max ? `/${m.max}` : ''}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-brand transition-all duration-500"
                            style={{ width: `${m.max ? (m.value / m.max) * 100 : m.value}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {loading && (
            <div className="flex items-center gap-1 mr-auto bg-surface border border-line rounded-2xl px-4 py-3">
              <span className="h-2 w-2 rounded-full bg-faint animate-bounce" />
              <span className="h-2 w-2 rounded-full bg-faint animate-bounce [animation-delay:0.2s]" />
              <span className="h-2 w-2 rounded-full bg-faint animate-bounce [animation-delay:0.4s]" />
            </div>
          )}
        </div>

        {/* Quick-reply chips — only shown on fresh conversation */}
        {messages.length <= 1 && !loading && (
          <div className="border-t border-line px-4 pt-3 pb-1 bg-surface">
            <p className="text-[10px] font-bold uppercase tracking-wider text-faint mb-2">Suggested</p>
            <div className="flex flex-col gap-1.5">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => {
                    setInput(prompt);
                    setTimeout(() => {
                      setMessages((prev) => [...prev, { role: 'user', content: prompt }]);
                      setInput('');
                      setLoading(true);
                      api.post('/ai-coach/chat', { message: prompt, history: messages })
                        .then(({ data }) => setMessages((prev) => [...prev, { role: 'assistant', content: data.data.response }]))
                        .catch(() => setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, I hit a snag. Try again.' }]))
                        .finally(() => setLoading(false));
                    }, 0);
                  }}
                  className="text-left w-full rounded-xl border border-line px-3 py-2 text-xs text-muted hover:bg-surface-2 hover:border-faint transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSend} className="border-t border-line p-4 flex gap-2 bg-surface">
          <input
            type="text"
            placeholder="Ask about resume, gaps, skills…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="input flex-1 !h-10 text-sm"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white transition hover:bg-brand-soft disabled:opacity-40"
          >
            <Icon.Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
}

/* ─── App Shell ───────────────────────────────────────────────────── */

const DEFAULT_GREETING = { role: 'assistant', content: "Hi! I'm your AI Career Coach. Ask me anything about your resume, skill gaps, or career readiness." };

// Notifications the Coach proactively surfaces instead of leaving them to sit
// silently in the notification drawer — milestones and score-change alerts are
// exactly the moments a "coach" (rather than a plain notification feed) should
// speak up about.
function isNudgeWorthy(n) {
  return !n.read && (n.title?.startsWith('Milestone:') || n.title?.includes('Path Score'));
}

export function AppShell({ children }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [coachOpen, setCoachOpen] = useState(false);
  const [explainType, setExplainType] = useState(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [proactiveNotif, setProactiveNotif] = useState(null);

  const chatStorageKey = user?._id ? `pp_coach_chat_${user._id}` : null;

  // Restore the conversation on mount/user-change instead of always resetting
  // to the greeting — a "coach" who forgets every conversation on refresh
  // doesn't feel like an ongoing relationship.
  const [chatMessages, setChatMessages] = useState(() => {
    if (!chatStorageKey) return [DEFAULT_GREETING];
    try {
      const saved = JSON.parse(localStorage.getItem(chatStorageKey));
      return Array.isArray(saved) && saved.length ? saved : [DEFAULT_GREETING];
    } catch {
      return [DEFAULT_GREETING];
    }
  });

  useEffect(() => {
    if (!chatStorageKey) return;
    // Cap stored history so localStorage doesn't grow unbounded over a long relationship.
    localStorage.setItem(chatStorageKey, JSON.stringify(chatMessages.slice(-60)));
  }, [chatMessages, chatStorageKey]);

  useEffect(() => {
    const handleOpenCoach = (e) => {
      setCoachOpen(true);
      if (e.detail?.type) setExplainType(e.detail.type);
    };
    window.addEventListener('open-ai-coach', handleOpenCoach);
    return () => window.removeEventListener('open-ai-coach', handleOpenCoach);
  }, []);

  // Lightweight, independent poll (separate from the notification bell's own
  // fetch) purely to detect a milestone/score-change event worth proactively
  // surfacing through the Coach FAB, without turning every notification into
  // a chat interruption.
  useEffect(() => {
    if (user?.role === 'admin') return;
    let cancelled = false;
    const checkForNudge = async () => {
      try {
        const { data } = await api.get('/notifications');
        const seen = JSON.parse(localStorage.getItem('pp_coach_nudge_seen') || '[]');
        const candidate = (data?.data?.notifications || []).find((n) => isNudgeWorthy(n) && !seen.includes(n._id));
        if (!cancelled && candidate) setProactiveNotif(candidate);
      } catch { /* silent */ }
    };
    checkForNudge();
    const interval = setInterval(checkForNudge, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [user?.role]);

  const openCoach = () => {
    setCoachOpen(true);
    if (proactiveNotif) {
      setChatMessages((prev) => [...prev, { role: 'assistant', content: `${proactiveNotif.message} Want me to explain what this means for you?` }]);
      const seen = JSON.parse(localStorage.getItem('pp_coach_nudge_seen') || '[]');
      localStorage.setItem('pp_coach_nudge_seen', JSON.stringify([...seen, proactiveNotif._id].slice(-100)));
      setProactiveNotif(null);
    }
  };

  const startTour = () => {
    localStorage.setItem('pp_tour_requested', '1');
    if (window.location.pathname === '/dashboard') {
      window.dispatchEvent(new CustomEvent('start-app-tour'));
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-ink transition-colors duration-300">
      <TopNav user={user} onOpenContact={() => setContactOpen(true)} onStartTour={user?.role !== 'admin' ? startTour : null} />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8 animate-fade-up flex flex-col">
        <div className="flex-1">{children}</div>
        <Footer />
      </main>

      {/* Floating AI Coach button — hidden for admins */}
      {user?.role !== 'admin' && (
        <button
          data-tour="coach-button"
          onClick={openCoach}
          className="fixed bottom-6 right-6 z-40 flex items-center justify-center rounded-full bg-brand text-white transition-all duration-300 hover:scale-110 active:scale-95 group"
          style={{ height: '56px', width: '56px', boxShadow: '0 12px 32px -6px rgba(16, 185, 129, 0.45), 0 4px 12px rgba(0, 0, 0, 0.15)' }}
          aria-label={proactiveNotif ? 'Open AI Career Coach — new update about your progress' : 'Open AI Career Coach'}
        >
          <span className="absolute inset-0 rounded-full border-2 border-brand/30 animate-ping" />
          <Icon.MessageSquare size={22} className="relative z-10" />
          {proactiveNotif && !coachOpen && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 z-20">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex h-4 w-4 rounded-full bg-amber-400 border-2 border-surface" />
            </span>
          )}
        </button>
      )}

      {/* AI Coach Drawer — hidden for admins */}
      {user?.role !== 'admin' && coachOpen && (
        <AICoachDrawer
          onClose={() => setCoachOpen(false)}
          explainType={explainType}
          clearExplainType={() => setExplainType(null)}
          messages={chatMessages}
          setMessages={setChatMessages}
        />
      )}

      {contactOpen && <ContactModal onClose={() => setContactOpen(false)} />}
    </div>
  );
}
