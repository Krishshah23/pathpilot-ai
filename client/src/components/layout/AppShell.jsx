import { useEffect, useState, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/icons';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { api, errorMessage } from '@/lib/api';

/* ─── Top Nav ─────────────────────────────────────────────────────── */

const NAV_LINKS = [
  { label: 'Overview',        path: '/dashboard' },
  { label: 'Resume Strategy', path: '/talent-analyzer' },
  { label: 'Skill Roadmap',   path: '/execution-engine' },
  { label: 'Interview Prep',  path: '/interview-prep' },
];

const ADMIN_NAV_LINKS = [
  { label: 'Admin Panel', path: '/admin' },
];

function TopNav({ user }) {
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
    await logout();
    toast.info('Logged out successfully');
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 nav-frosted border-b border-[#EAEAE5]/60">
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between gap-8">

        {/* Left: Logo */}
        <a href="/dashboard" className="flex items-center gap-2.5 shrink-0 group">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#171717] shadow-sm transition-transform duration-300 group-hover:scale-105">
            <span className="text-white font-bold text-sm font-sans tracking-tight">PP</span>
          </span>
          <span className="font-serif font-bold text-[#171717] text-lg tracking-tight hidden sm:block">
            PathPilot
          </span>
        </a>

        {/* Center: Nav links (desktop) */}
        <nav className="hidden md:flex items-center gap-1">
          {links.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) =>
                cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150',
                  isActive
                    ? 'bg-[#171717] text-white'
                    : 'text-[#525252] hover:text-[#171717] hover:bg-[#F5F5F3]'
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* Right: Bell + Avatar */}
        <div className="flex items-center gap-3 shrink-0 relative" ref={dropdownRef}>
          <NotificationBell />

          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 rounded-full p-0.5 pr-3 transition hover:bg-[#F5F5F3] focus:outline-none"
            title="Account options"
          >
            <Avatar user={user} size="sm" />
            <span className="hidden sm:block text-sm font-medium text-[#171717]">
              {user?.name?.split(' ')[0]}
            </span>
            <Icon.ChevronDown size={14} className={cn("text-[#A3A3A3] transition-transform duration-200", dropdownOpen && "rotate-180")} />
          </button>

          {/* Account Dropdown Popover */}
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-[#EAEAE5] bg-white p-1.5 shadow-xl z-50 animate-fade-down origin-top-right" style={{ boxShadow: '0 12px 40px -8px rgba(23, 23, 23, 0.12), 0 4px 12px -4px rgba(23, 23, 23, 0.06)' }}>
              {/* Account Header */}
              <div className="px-3 py-2 border-b border-[#F5F5F3] mb-1">
                <p className="text-xs font-bold text-[#171717] leading-tight truncate">{user?.name}</p>
                <p className="text-[10px] text-[#A3A3A3] truncate mt-0.5">{user?.email}</p>
                <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[9px] font-semibold uppercase tracking-wider border border-slate-200">
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
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#525252] hover:text-[#171717] hover:bg-[#F5F5F3] rounded-lg transition-colors"
                >
                  <Icon.User size={14} />
                  Profile Settings
                </button>
              )}

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#B85A3C] hover:text-[#A14022] hover:bg-[#FDF5F3] rounded-lg transition-colors"
              >
                <Icon.Logout size={14} />
                Log out
              </button>
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            className="md:hidden rounded-lg p-2 text-[#525252] hover:bg-[#F5F5F3]"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <Icon.X size={20} /> : <Icon.Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[#EAEAE5] bg-white px-6 py-4 space-y-1 animate-fade-up">
          {links.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  'block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-[#171717] text-white'
                    : 'text-[#525252] hover:text-[#171717] hover:bg-[#F5F5F3]'
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      )}
    </header>
  );
}

/* ─── Shared Profile Components ───────────────────────────────────── */

export function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#525252] mb-1.5">{label}</label>
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
    <div className="rounded-xl border border-[#EAEAE5] p-3 min-h-[80px]">
      <div className="flex flex-wrap gap-1.5 mb-2">
        {skills.map((s) => (
          <span
            key={s}
            className="inline-flex items-center gap-1 rounded-lg bg-[#F5F5F3] border border-[#EAEAE5] px-2.5 py-1 text-xs text-[#171717]"
          >
            {s}
            <button
              onClick={() => removeSkill(s)}
              className="text-[#A3A3A3] hover:text-[#B85A3C]"
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
        className="w-full text-xs text-[#171717] placeholder-[#A3A3A3] bg-transparent outline-none"
      />
    </div>
  );
}

/* ─── Notification Bell ───────────────────────────────────────────── */

function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

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
        className="relative rounded-lg p-2 text-[#525252] hover:bg-[#F5F5F3] hover:text-[#171717] transition-colors"
        aria-label="Notifications"
      >
        <Icon.Bell size={19} />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#2B4C3F] text-[9px] font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-xl border border-[#EAEAE5] bg-white shadow-lg animate-fade-up z-50">
          <div className="flex items-center justify-between border-b border-[#EAEAE5] px-4 py-3">
            <span className="text-xs font-bold text-[#171717] uppercase tracking-wider">Notifications</span>
            {unreadCount > 0 && (
              <button
                onMouseDown={(e) => { e.preventDefault(); markAllAsRead(); }}
                className="text-[10px] font-semibold text-[#2B4C3F] hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-[#EAEAE5]">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#A3A3A3]">
                All caught up!
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  onMouseDown={(e) => { e.preventDefault(); if (!n.read) markAsRead(n._id); }}
                  className={cn(
                    'flex items-start gap-2.5 px-4 py-3 cursor-pointer transition hover:bg-[#F5F5F3]',
                    !n.read && 'bg-[#F5F5F3]'
                  )}
                >
                  <span className={cn(
                    'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full',
                    !n.read ? 'bg-[#2B4C3F]' : 'bg-transparent'
                  )} />
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-xs text-[#171717]', !n.read && 'font-semibold')}>{n.title}</p>
                    <p className="text-[11px] text-[#525252] leading-relaxed mt-0.5">{n.message}</p>
                    <p className="text-[9px] text-[#A3A3A3] mt-1">
                      {new Date(n.createdAt).toLocaleDateString('en-IN', { hour: '2-digit', minute: '2-digit' })}
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
      <div className="relative flex h-full w-full max-w-md flex-col bg-white border-l border-[#EAEAE5] shadow-xl animate-fade-right">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#EAEAE5] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#171717] text-white">
              <Icon.MessageSquare size={16} />
            </span>
            <div>
              <h3 className="text-sm font-bold text-[#171717]">AI Career Coach</h3>
              <span className="flex items-center gap-1 text-[10px] text-[#2B4C3F]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#2B4C3F] animate-pulse" /> Online
              </span>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[#A3A3A3] hover:bg-[#F5F5F3] hover:text-[#171717]">
            <Icon.X size={18} />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-3 bg-[#FBFBFA]">
          {messages.map((msg, i) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={i}
                className={cn(
                  'max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                  isUser
                    ? 'ml-auto bg-[#171717] text-white rounded-br-none'
                    : 'mr-auto bg-white border border-[#EAEAE5] text-[#171717] rounded-bl-none'
                )}
              >
                <p className="whitespace-pre-line">{msg.content}</p>
                {msg.metrics?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[#EAEAE5] space-y-2">
                    {msg.metrics.map((m, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between text-xs text-[#525252] mb-1">
                          <span>{m.name}</span>
                          <span>{m.value}{m.max ? `/${m.max}` : ''}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-[#EAEAE5] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#2B4C3F] transition-all duration-500"
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
            <div className="flex items-center gap-1 mr-auto bg-white border border-[#EAEAE5] rounded-2xl px-4 py-3">
              <span className="h-2 w-2 rounded-full bg-[#A3A3A3] animate-bounce" />
              <span className="h-2 w-2 rounded-full bg-[#A3A3A3] animate-bounce [animation-delay:0.2s]" />
              <span className="h-2 w-2 rounded-full bg-[#A3A3A3] animate-bounce [animation-delay:0.4s]" />
            </div>
          )}
        </div>

        {/* Quick-reply chips — only shown on fresh conversation */}
        {messages.length <= 1 && !loading && (
          <div className="border-t border-[#EAEAE5] px-4 pt-3 pb-1 bg-white">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3] mb-2">Suggested</p>
            <div className="flex flex-col gap-1.5">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => {
                    setInput(prompt);
                    // Trigger send with slight delay so input state updates
                    setTimeout(() => {
                      const fakeEvent = { preventDefault: () => {} };
                      setMessages((prev) => [...prev, { role: 'user', content: prompt }]);
                      setInput('');
                      setLoading(true);
                      api.post('/ai-coach/chat', { message: prompt, history: messages })
                        .then(({ data }) => setMessages((prev) => [...prev, { role: 'assistant', content: data.data.response }]))
                        .catch(() => setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, I hit a snag. Try again.' }]))
                        .finally(() => setLoading(false));
                    }, 0);
                  }}
                  className="text-left w-full rounded-xl border border-[#EAEAE5] px-3 py-2 text-xs text-[#525252] hover:bg-[#F5F5F3] hover:border-[#D0D0CA] transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSend} className="border-t border-[#EAEAE5] p-4 flex gap-2 bg-white">
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
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#171717] text-white transition hover:bg-[#2a2a2a] disabled:opacity-40"
          >
            <Icon.Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
}

/* ─── App Shell ───────────────────────────────────────────────────── */

/**
 * Authenticated app shell.
 * Renders the horizontal TopNav, optional ProfileDrawer, AI Coach button/drawer,
 * and a max-w-7xl centered main content area.
 */
export function AppShell({ children }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [coachOpen, setCoachOpen] = useState(false);
  const [explainType, setExplainType] = useState(null);
  // Lifted here so chat history persists when drawer is closed/reopened
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: "Hi! I'm your AI Career Coach. Ask me anything about your resume, skill gaps, or career readiness." }
  ]);

  useEffect(() => {
    const handleOpenCoach = (e) => {
      setCoachOpen(true);
      if (e.detail?.type) setExplainType(e.detail.type);
    };
    window.addEventListener('open-ai-coach', handleOpenCoach);
    return () => window.removeEventListener('open-ai-coach', handleOpenCoach);
  }, []);

  return (
    <div className="min-h-screen bg-[#FBFBFA]">
      <TopNav user={user} />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8 animate-fade-up">
        {children}
      </main>

      {/* Floating AI Coach button — hidden for admins */}
      {user?.role !== 'admin' && (
        <button
          onClick={() => setCoachOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center justify-center rounded-full bg-[#171717] text-white transition-all duration-300 hover:scale-110 active:scale-95 group"
          style={{ height: '56px', width: '56px', boxShadow: '0 8px 32px -4px rgba(23, 23, 23, 0.3), 0 2px 8px rgba(23, 23, 23, 0.1)' }}
          aria-label="Open AI Career Coach"
        >
          <span className="absolute inset-0 rounded-full border-2 border-[#2B4C3F]/30 animate-ping" />
          <Icon.MessageSquare size={22} className="relative z-10" />
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
    </div>
  );
}
