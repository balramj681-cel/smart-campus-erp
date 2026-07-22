/**
 * @file Navbar.jsx
 * @location src/components/layout/Navbar.jsx
 * Premium redesign — same sub-component architecture, useAuth/useNotifications
 * wiring preserved. Upgraded: brand indigo+slate palette, glass dropdown
 * panels, functional Messages dropdown (was a static badge before).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import useAuth from "../../hooks/useAuth";
import { useNotifications } from "../../hooks/useNotifications";
import { NOTIFICATION_TYPE_CONFIG } from "../../services/notificationService";
import { chatService } from "../../services/chatService";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { photoUrl } from "../../services/profileService";
import {
  Bell, BookOpen, ChevronDown, Expand, HelpCircle, LogOut, Menu,
  MessageSquare, Moon, Search, Settings, Shrink, Sun, User, X,
} from "lucide-react";

import { useLayout } from "../../layouts/DashboardLayout";

// ─────────────────────────────────────────────────────────────────────────────
// Animation Variants
// ─────────────────────────────────────────────────────────────────────────────

const dropdownVariants = {
  hidden: { opacity: 0, scale: 0.95, y: -8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.18, ease: "easeOut" } },
  exit: { opacity: 0, scale: 0.95, y: -8, transition: { duration: 0.14, ease: "easeIn" } },
};

const PROFILE_MENU_ITEMS = [
  { id: "profile", label: "My Profile", icon: User, href: "/profile" },
  { id: "settings", label: "Settings", icon: Settings, href: "/settings" },
  { id: "help", label: "Help Center", icon: HelpCircle, href: "/help" },
];

const useOnClickOutside = (ref, handler) => {
  useEffect(() => {
    const listener = (event) => {
      if (!ref.current || ref.current.contains(event.target)) return;
      handler(event);
    };
    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler]);
};

const timeAgo = (iso) => {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const initials = (name = "?") =>
  name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

// ─────────────────────────────────────────────────────────────────────────────
// SidebarToggleButton
// ─────────────────────────────────────────────────────────────────────────────

const SidebarToggleButton = () => {
  const { toggleSidebar, isSidebarOpen, isMobile } = useLayout();
  const showClose = isMobile && isSidebarOpen;

  return (
    <button
      onClick={toggleSidebar}
      aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
      className="flex items-center justify-center w-9 h-9 rounded-xl text-slate-500
        hover:text-brand-600 hover:bg-brand-50 transition-colors duration-150
        focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={showClose ? "close" : "menu"}
          initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {showClose ? <X size={20} /> : <Menu size={20} />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// GlobalSearch
// ─────────────────────────────────────────────────────────────────────────────

const GlobalSearch = () => {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        document.getElementById("navbar-search")?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="hidden md:flex items-center relative">
      <Search size={16} className={`absolute left-3 pointer-events-none transition-colors ${focused ? "text-brand-500" : "text-slate-400"}`} />
      <input
        id="navbar-search"
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Search…"
        aria-label="Global search"
        className="w-64 lg:w-80 h-9 pl-9 pr-16 rounded-xl text-sm bg-slate-100 text-slate-700
          placeholder-slate-400 border border-transparent
          focus:outline-none focus:border-brand-300 focus:bg-white focus:ring-4 focus:ring-brand-50
          transition-all duration-150"
      />
      <span className="absolute right-2 flex items-center gap-0.5 text-[10px] font-medium text-slate-400
        bg-white border border-slate-200 rounded-md px-1.5 py-0.5 pointer-events-none select-none">
        <span className="font-sans">⌘</span>K
      </span>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// IconButton
// ─────────────────────────────────────────────────────────────────────────────

const IconButton = ({ children, label, onClick, className = "" }) => (
  <button
    onClick={onClick}
    aria-label={label}
    className={`relative flex items-center justify-center w-9 h-9 rounded-xl text-slate-500
      hover:text-brand-600 hover:bg-brand-50 transition-colors duration-150
      focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${className}`}
  >
    {children}
  </button>
);

// ─────────────────────────────────────────────────────────────────────────────
// NotificationBadge — gradient, glowing
// ─────────────────────────────────────────────────────────────────────────────

const NotificationBadge = ({ count }) => {
  if (!count || count === 0) return null;
  return (
    <span
      aria-label={`${count} unread`}
      className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center
        rounded-full text-[10px] font-bold text-white
        bg-gradient-to-br from-rose-500 to-rose-600 shadow-[0_2px_6px_-1px_rgba(225,29,72,0.55)]
        ring-2 ring-white pointer-events-none select-none"
    >
      {count > 9 ? "9+" : count}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// NotificationsDropdown
// ─────────────────────────────────────────────────────────────────────────────

const NotificationsDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();

  useOnClickOutside(containerRef, () => setIsOpen(false));

  return (
    <div ref={containerRef} className="relative">
      <IconButton label="Notifications" onClick={() => setIsOpen((prev) => !prev)}>
        <Bell size={19} />
        <NotificationBadge count={unreadCount} />
      </IconButton>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="notifications-panel"
            variants={dropdownVariants} initial="hidden" animate="visible" exit="exit"
            className="absolute right-0 top-12 z-50 w-80 sm:w-96 bg-white rounded-2xl border border-slate-100
              shadow-[0_12px_36px_-8px_rgba(15,23,42,0.18)] overflow-hidden"
            role="dialog" aria-label="Notifications panel"
          >
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 bg-gradient-to-r from-brand-50/60 to-white">
              <h3 className="text-sm font-bold text-slate-800">Notifications</h3>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-brand-600 hover:text-brand-700 font-semibold transition-colors">
                  Mark all as read
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-slate-400">No notifications yet.</div>
            ) : (
              <ul className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
                {notifications.map((notification) => {
                  const cfg = NOTIFICATION_TYPE_CONFIG[notification.type] ?? NOTIFICATION_TYPE_CONFIG.GENERAL;
                  return (
                    <li
                      key={notification.id}
                      onClick={() => !notification.read && markRead(notification.id)}
                      className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors duration-100
                        ${notification.read ? "bg-white" : "bg-brand-50/50"} hover:bg-slate-50`}
                    >
                      <span className={`flex-shrink-0 mt-0.5 w-7 h-7 rounded-full flex items-center justify-center text-xs ${cfg.color}`} aria-hidden="true">
                        {notification.typeEmoji ?? cfg.emoji}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{notification.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{notification.message}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{timeAgo(notification.createdAt)}</p>
                      </div>
                      {!notification.read && <span className="flex-shrink-0 mt-1 w-2 h-2 rounded-full bg-brand-500" aria-hidden="true" />}
                    </li>
                  );
                })}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MessagesDropdown — NAYA: real conversations preview (pehle sirf static badge tha)
// ─────────────────────────────────────────────────────────────────────────────

const MessagesDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  useOnClickOutside(containerRef, () => setIsOpen(false));

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const data = await chatService.getConversations();
      setConversations(Array.isArray(data) ? data : []);
    } catch { /* silent — badge just won't show */ }
    finally { setLoading(false); }
  };

  // Unread count ke liye ek halki background poll (dropdown band hone par bhi)
  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 20000);
    return () => clearInterval(interval);
  }, []);

  const openConversation = (conversationId) => {
    setIsOpen(false);
    navigate(`/messages?conversation=${conversationId}`);
  };

  return (
    <div ref={containerRef} className="relative">
      <IconButton
        label="Messages"
        onClick={() => { setIsOpen((prev) => !prev); if (!isOpen) loadConversations(); }}
      >
        <MessageSquare size={19} />
        <NotificationBadge count={totalUnread} />
      </IconButton>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="messages-panel"
            variants={dropdownVariants} initial="hidden" animate="visible" exit="exit"
            className="absolute right-0 top-12 z-50 w-80 sm:w-96 bg-white rounded-2xl border border-slate-100
              shadow-[0_12px_36px_-8px_rgba(15,23,42,0.18)] overflow-hidden"
            role="dialog" aria-label="Messages panel"
          >
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 bg-gradient-to-r from-brand-50/60 to-white">
              <h3 className="text-sm font-bold text-slate-800">Messages</h3>
              <button onClick={() => { setIsOpen(false); navigate("/messages"); }}
                className="text-xs text-brand-600 hover:text-brand-700 font-semibold transition-colors">
                Open all
              </button>
            </div>

            {loading ? (
              <div className="px-4 py-10 text-center text-sm text-slate-400">Loading…</div>
            ) : conversations.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-slate-400">No conversations yet.</div>
            ) : (
              <ul className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
                {conversations.slice(0, 8).map((c) => (
                  <li
                    key={c.id}
                    onClick={() => openConversation(c.id)}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors duration-100
                      ${c.unreadCount > 0 ? "bg-brand-50/50" : "bg-white"} hover:bg-slate-50`}
                  >
                    <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-700
                      flex items-center justify-center text-white text-xs font-bold select-none">
                      {initials(c.otherUserName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm truncate ${c.unreadCount > 0 ? "font-semibold text-slate-800" : "font-medium text-slate-700"}`}>
                          {c.otherUserName}
                        </p>
                        {c.lastMessageAt && <span className="text-[10px] text-slate-400 flex-shrink-0">{timeAgo(c.lastMessageAt)}</span>}
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{c.lastMessagePreview ?? "No messages yet"}</p>
                    </div>
                    {c.unreadCount > 0 && (
                      <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-gradient-to-br from-brand-600 to-brand-500 text-white text-[10px] font-bold rounded-full">
                        {c.unreadCount}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// FullscreenButton
// ─────────────────────────────────────────────────────────────────────────────

const FullscreenButton = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  }, []);

  return (
    <IconButton label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"} onClick={toggleFullscreen} className="hidden sm:flex">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={isFullscreen ? "shrink" : "expand"}
          initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.7, opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {isFullscreen ? <Shrink size={18} /> : <Expand size={18} />}
        </motion.span>
      </AnimatePresence>
    </IconButton>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DarkModeToggle
// ─────────────────────────────────────────────────────────────────────────────

const DarkModeToggle = () => {
  const [isDark, setIsDark] = useState(false);

  const toggle = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("dark", next);
      return next;
    });
  }, []);

  return (
    <IconButton label={isDark ? "Switch to light mode" : "Switch to dark mode"} onClick={toggle}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={isDark ? "moon" : "sun"}
          initial={{ rotate: -30, scale: 0.7, opacity: 0 }} animate={{ rotate: 0, scale: 1, opacity: 1 }} exit={{ rotate: 30, scale: 0.7, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {isDark ? <Moon size={18} className="text-brand-400" /> : <Sun size={18} />}
        </motion.span>
      </AnimatePresence>
    </IconButton>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ProfileDropdown
// ─────────────────────────────────────────────────────────────────────────────

const ProfileDropdown = () => {
  const { logout, user: authUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const user = {
    name: authUser?.name ?? "User",
    role: authUser?.role ?? "",
    email: authUser?.email ?? "",
    photoUrl: authUser?.photoUrl ?? null,
    avatarInitials: initials(authUser?.name ?? "U"),
  };

  useOnClickOutside(containerRef, () => setIsOpen(false));

  const handleLogout = useCallback(async () => {
    await logout();
    setIsOpen(false);
  }, [logout]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label="Open profile menu"
        className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-2xl hover:bg-slate-100
          transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
      >
        <div className="relative flex-shrink-0">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-brand-500 to-brand-700
            flex items-center justify-center text-white text-xs font-bold tracking-wide select-none ring-2 ring-white shadow-sm">
            {user.photoUrl ? (
              <img src={photoUrl(user.photoUrl)} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              user.avatarInitials
            )}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-white" />
        </div>

        <div className="hidden md:flex flex-col items-start leading-tight">
          <span className="text-sm font-semibold text-slate-800">{user.name}</span>
          <span className="text-[10px] bg-gradient-to-r from-brand-600 to-brand-500 bg-clip-text text-transparent font-bold uppercase tracking-wider">
            {user.role}
          </span>
        </div>

        <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }} className="hidden md:block text-slate-400" aria-hidden="true">
          <ChevronDown size={14} />
        </motion.span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="profile-panel"
            variants={dropdownVariants} initial="hidden" animate="visible" exit="exit"
            className="absolute right-0 top-12 z-50 w-64 bg-white rounded-2xl border border-slate-100
              shadow-[0_12px_36px_-8px_rgba(15,23,42,0.18)] overflow-hidden"
            role="menu" aria-label="Profile menu"
          >
            <div className="px-4 py-4 border-b border-slate-100 bg-gradient-to-br from-brand-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-brand-500 to-brand-700
                  flex items-center justify-center text-white text-sm font-bold select-none ring-2 ring-white shadow-md">
                  {user.photoUrl ? (
                    <img src={photoUrl(user.photoUrl)} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    user.avatarInitials
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{user.name}</p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider
                    bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-sm">
                    {user.role}
                  </span>
                </div>
              </div>
            </div>

            <nav className="py-1.5">
              {PROFILE_MENU_ITEMS.map(({ id, label, icon: Icon, href }) => (
                <a key={id} href={href} role="menuitem" onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700
                    hover:bg-brand-50 hover:text-brand-700 transition-colors duration-100">
                  <Icon size={16} className="flex-shrink-0" aria-hidden="true" />
                  {label}
                </a>
              ))}
            </nav>

            <div className="border-t border-slate-100 py-1.5">
              <button onClick={handleLogout} role="menuitem"
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-600
                  hover:bg-rose-50 transition-colors duration-100">
                <LogOut size={16} className="flex-shrink-0" aria-hidden="true" />
                Nikal
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component: Navbar
// ─────────────────────────────────────────────────────────────────────────────

const Navbar = () => {
  return (
    <nav className="flex items-center justify-between h-full px-4 md:px-6 bg-white/95 backdrop-blur-sm" aria-label="Top navigation">
      <div className="flex items-center gap-3">
        <SidebarToggleButton />
        <div className="flex items-center gap-2 select-none">
          <div className="w-8 h-8 rounded-xl flex-shrink-0 bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700
            flex items-center justify-center shadow-[0_4px_12px_-3px_rgba(79,70,229,0.5)]" aria-hidden="true">
            <BookOpen size={16} className="text-white" />
          </div>
          <span className="hidden lg:block text-base font-bold text-slate-800 tracking-tight">
            Smart<span className="bg-gradient-to-r from-brand-600 to-brand-500 bg-clip-text text-transparent">Campus</span>
          </span>
        </div>
      </div>

      <div className="flex-1 flex justify-center px-4">
        <GlobalSearch />
      </div>

      <div className="flex items-center gap-1 sm:gap-1.5">
        <NotificationsDropdown />
        <MessagesDropdown />
        <FullscreenButton />
        <DarkModeToggle />
        <div className="hidden sm:block w-px h-6 bg-slate-200 mx-1" aria-hidden="true" />
        <ProfileDropdown />
      </div>
    </nav>
  );
};

export default Navbar;