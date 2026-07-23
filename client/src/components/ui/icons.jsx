/**
 * components/ui/icons.jsx — Custom SVG Icon Library
 *
 * A hand-rolled set of stroke-based SVG icons (Lucide-style) so the project
 * avoids pulling in a heavy icon library dependency (which would add ~50-100KB).
 *
 * HOW IT WORKS:
 *   - All icons share a base `Svg` wrapper that sets common SVG attributes:
 *     fill="none", stroke="currentColor" (inherits from CSS text colour),
 *     strokeWidth, viewBox="0 0 24 24", and a `size` prop for width/height.
 *   - Each icon is a function component stored as a property of the `Icon` object.
 *   - Passing `...props` lets callers add className, onClick, style, etc.
 *
 * USAGE:
 *   import { Icon } from '@/components/ui/icons';
 *
 *   <Icon.Check />                         // 20×20, inherits current text colour
 *   <Icon.Upload size={24} />              // 24×24
 *   <Icon.Bell className="text-brand" />   // coloured via Tailwind text colour
 *   <Icon.ArrowRight size={16} onClick={go} />
 *
 * TO ADD A NEW ICON:
 *   1. Find the SVG path data from lucide.dev or any stroke-icon source.
 *   2. Add a new entry to the Icon object following the same pattern.
 *
 * CURRENT ICON LIST:
 *   Compass, FileText, Gauge, Target, Route, ChartBar, Briefcase, Document,
 *   User, Shield, Menu, X, Logout, Upload, Check, ChevronRight, Plus,
 *   Sparkles, Building, Calendar, Columns, ListIcon, ExternalLink, Clock,
 *   Trash, Edit, ChevronDown, MapPin, DollarSign, ArrowRight, Download,
 *   Printer, Users, Settings, AlertTriangle, Bell, MessageSquare, Send,
 *   Globe, Info, Copy, TrendingUp, ArrowUp, ArrowDown, Zap, BookOpen,
 *   GripVertical, ChevronLeft, PanelRight, Link, ToggleLeft, ToggleRight,
 *   Mic, RotateCw, Camera, History
 */

/*
  Base SVG wrapper — shared by all icons.
  `size` sets both width and height. `...props` forwards everything else
  (className, onClick, style, strokeWidth overrides, etc.).
*/
function Svg({ children, size = 20, ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"  // inherits the CSS text colour of the parent element
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

// All icons are grouped in a single `Icon` export object so imports look like:
//   import { Icon } from '@/components/ui/icons';
//   <Icon.Upload size={24} />
export const Icon = {
  /** Compass rose — used in the nav/logo area */
  Compass: (p) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </Svg>
  ),
  /** Document with text lines — resume / file icon */
  FileText: (p) => (
    <Svg {...p}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </Svg>
  ),
  /** Speedometer / gauge — used for score cards */
  Gauge: (p) => (
    <Svg {...p}>
      <path d="M12 14 15 9" />
      <path d="M3.5 18a9 9 0 1 1 17 0" />
      <circle cx="12" cy="14" r="1.5" />
    </Svg>
  ),
  /** Bullseye target — used for "dream role" / goal icons */
  Target: (p) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" />
    </Svg>
  ),
  /** Winding path — used for the skill roadmap / learning path */
  Route: (p) => (
    <Svg {...p}>
      <circle cx="6" cy="19" r="2.5" />
      <circle cx="18" cy="5" r="2.5" />
      <path d="M8.5 19H14a4 4 0 0 0 0-8h-4a4 4 0 0 1 0-8h5.5" />
    </Svg>
  ),
  /** Bar chart — used for analytics / insights sections */
  ChartBar: (p) => (
    <Svg {...p}>
      <path d="M3 3v18h18" />
      <rect x="7" y="12" width="3" height="6" />
      <rect x="12" y="8" width="3" height="10" />
      <rect x="17" y="4" width="3" height="14" />
    </Svg>
  ),
  /** Briefcase — used for job / opportunities section */
  Briefcase: (p) => (
    <Svg {...p}>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M2 13h20" />
    </Svg>
  ),
  /** Document with a checkmark — uploaded/verified file */
  Document: (p) => (
    <Svg {...p}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z" />
      <path d="M15 2v5h5M9 13l2 2 4-4" />
    </Svg>
  ),
  /** Single person silhouette — user / profile */
  User: (p) => (
    <Svg {...p}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </Svg>
  ),
  /** Shield with checkmark — security / ATS pass */
  Shield: (p) => (
    <Svg {...p}>
      <path d="M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5z" />
      <path d="m9 12 2 2 4-4" />
    </Svg>
  ),
  /** Three horizontal lines — hamburger menu for mobile nav */
  Menu: (p) => (
    <Svg {...p}>
      <path d="M3 6h18M3 12h18M3 18h18" />
    </Svg>
  ),
  /** × close button — dismissing modals, removing tags */
  X: (p) => (
    <Svg {...p}>
      <path d="M18 6 6 18M6 6l12 12" />
    </Svg>
  ),
  /** Arrow pointing out of a box — logout / sign out */
  Logout: (p) => (
    <Svg {...p}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </Svg>
  ),
  /** Arrow pointing up into a cloud — file upload */
  Upload: (p) => (
    <Svg {...p}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
    </Svg>
  ),
  /** Checkmark — success / done / step completed */
  Check: (p) => (
    <Svg {...p}>
      <path d="M20 6 9 17l-5-5" />
    </Svg>
  ),
  /** > arrow — navigate to next, expand section */
  ChevronRight: (p) => (
    <Svg {...p}>
      <path d="m9 18 6-6-6-6" />
    </Svg>
  ),
  /** + plus sign — add tag, add opportunity */
  Plus: (p) => (
    <Svg {...p}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  ),
  /** Star sparkle — AI / Gemini feature indicator */
  Sparkles: (p) => (
    <Svg {...p}>
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
    </Svg>
  ),
  /** Office building — company / employer */
  Building: (p) => (
    <Svg {...p}>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01" />
    </Svg>
  ),
  /** Calendar grid — dates, deadlines, interview scheduling */
  Calendar: (p) => (
    <Svg {...p}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </Svg>
  ),
  /** Two side-by-side rectangles — Kanban column view toggle */
  Columns: (p) => (
    <Svg {...p}>
      <rect x="3" y="3" width="7" height="18" rx="1" />
      <rect x="14" y="3" width="7" height="18" rx="1" />
    </Svg>
  ),
  /** Stacked layers icon */
  Layers: (p) => (
    <Svg {...p}>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </Svg>
  ),

  /** Bullet list — list view toggle */
  ListIcon: (p) => (
    <Svg {...p}>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </Svg>
  ),
  /** Box with arrow — open link in a new tab */
  ExternalLink: (p) => (
    <Svg {...p}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" />
    </Svg>
  ),
  /** Circular clock — time / posted date */
  Clock: (p) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </Svg>
  ),
  /** Trash bin — delete action */
  Trash: (p) => (
    <Svg {...p}>
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </Svg>
  ),
  /** Pencil — edit / modify */
  Edit: (p) => (
    <Svg {...p}>
      <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" />
    </Svg>
  ),
  /** ˅ chevron — collapse/expand dropdown */
  ChevronDown: (p) => (
    <Svg {...p}>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  ),
  /** Location pin — job location / city */
  MapPin: (p) => (
    <Svg {...p}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </Svg>
  ),
  /** Dollar sign — salary / compensation */
  DollarSign: (p) => (
    <Svg {...p}>
      <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </Svg>
  ),
  /** → arrow — forward / continue / proceed */
  ArrowRight: (p) => (
    <Svg {...p}>
      <path d="M5 12h14M12 5l7 7-7 7" />
    </Svg>
  ),
  /** Arrow pointing down into tray — download */
  Download: (p) => (
    <Svg {...p}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </Svg>
  ),
  /** Printer — print career report */
  Printer: (p) => (
    <Svg {...p}>
      <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </Svg>
  ),
  /** Two people — admin / all users view */
  Users: (p) => (
    <Svg {...p}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </Svg>
  ),
  /** Gear / cog — settings */
  Settings: (p) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </Svg>
  ),
  /** Warning triangle — alerts / red flags / warnings */
  AlertTriangle: (p) => (
    <Svg {...p}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" />
    </Svg>
  ),
  /** Bell — notifications */
  Bell: (p) => (
    <Svg {...p}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </Svg>
  ),
  /** Speech bubble — chat / AI coach message */
  MessageSquare: (p) => (
    <Svg {...p}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </Svg>
  ),
  /** Paper plane — send chat message */
  Send: (p) => (
    <Svg {...p}>
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </Svg>
  ),
  /** Globe / earth — web / internet / public profile */
  Globe: (p) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20" />
    </Svg>
  ),
  /** ℹ info circle — tooltips / informational badges */
  Info: (p) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </Svg>
  ),
  /** Two overlapping squares — copy to clipboard */
  Copy: (p) => (
    <Svg {...p}>
      <rect x="8" y="8" width="14" height="14" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </Svg>
  ),
  /** Line trending upward — positive trend / improvement */
  TrendingUp: (p) => (
    <Svg {...p}>
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </Svg>
  ),
  /** ↑ arrow — positive impact / increase */
  ArrowUp: (p) => (
    <Svg {...p}>
      <path d="M12 19V5M5 12l7-7 7 7" />
    </Svg>
  ),
  /** ↓ arrow — negative impact / decrease */
  ArrowDown: (p) => (
    <Svg {...p}>
      <path d="M12 5v14M19 12l-7 7-7-7" />
    </Svg>
  ),
  /** Lightning bolt — quick action / Zap feature */
  Zap: (p) => (
    <Svg {...p}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </Svg>
  ),
  /** Open book — learning resources / roadmap tasks */
  BookOpen: (p) => (
    <Svg {...p}>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </Svg>
  ),
  /** Six-dot drag handle — draggable rows in lists */
  GripVertical: (p) => (
    <Svg {...p}>
      <circle cx="9" cy="5" r="1" fill="currentColor" />
      <circle cx="9" cy="12" r="1" fill="currentColor" />
      <circle cx="9" cy="19" r="1" fill="currentColor" />
      <circle cx="15" cy="5" r="1" fill="currentColor" />
      <circle cx="15" cy="12" r="1" fill="currentColor" />
      <circle cx="15" cy="19" r="1" fill="currentColor" />
    </Svg>
  ),
  /** < chevron — navigate to previous step */
  ChevronLeft: (p) => (
    <Svg {...p}>
      <path d="m15 18-6-6 6-6" />
    </Svg>
  ),
  /** Rectangle with right panel — side panel / drawer layout */
  PanelRight: (p) => (
    <Svg {...p}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M15 3v18" />
    </Svg>
  ),
  /** Chain link — hyperlink / URL */
  Link: (p) => (
    <Svg {...p}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </Svg>
  ),
  /** Toggle switch (off) — boolean setting disabled */
  ToggleLeft: (p) => (
    <Svg {...p}>
      <rect x="1" y="5" width="22" height="14" rx="7" />
      <circle cx="8" cy="12" r="3" fill="currentColor" />
    </Svg>
  ),
  /** Toggle switch (on) — boolean setting enabled */
  ToggleRight: (p) => (
    <Svg {...p}>
      <rect x="1" y="5" width="22" height="14" rx="7" fill="currentColor" />
      <circle cx="16" cy="12" r="3" fill="white" />
    </Svg>
  ),
  /** Microphone — voice recording for interview answers */
  Mic: (p) => (
    <Svg {...p}>
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3M8 22h8" />
    </Svg>
  ),
  /** Circular arrow — refresh / regenerate */
  RotateCw: (p) => (
    <Svg {...p}>
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
      <polyline points="21 3 21 8 16 8" />
    </Svg>
  ),
  /** Camera lens — photo / avatar upload */
  Camera: (p) => (
    <Svg {...p}>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </Svg>
  ),
  /** Clock with rewind arrow — history / past sessions */
  History: (p) => (
    <Svg {...p}>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <polyline points="3 3 3 8 8 8" />
      <polyline points="12 7 12 12 15 15" />
    </Svg>
  ),
};
