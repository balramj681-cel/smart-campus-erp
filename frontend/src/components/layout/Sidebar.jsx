/**
 * @file Sidebar.jsx
 * @location src/components/layout/Sidebar.jsx
 * Premium redesign — MENU_CONFIG / role logic / routing / photo-support
 * unchanged. Upgraded: sliding gradient active-pill (shared layout
 * animation), disciplined 2-hue color system (indigo + slate, rose only
 * for alerts), refined motion.
 */

import { useMemo } from "react";
import { NavLink } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import useAuth from "../../hooks/useAuth";
import { useLayout } from "../../layouts/DashboardLayout";
import { photoUrl } from "../../services/profileService";
import {
  BarChart2, Bell, BookOpen, Briefcase, Building2, CalendarDays,
  ClipboardList, CreditCard, GraduationCap, LayoutDashboard,
  Library, MessageSquareWarning, Settings, ShieldCheck, UserCheck, Users,
  FileText, Star, MessageCircle, CalendarOff, QrCode, ScanLine,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// MENU CONFIGURATION — unchanged
// ─────────────────────────────────────────────────────────────────────────────

const MENU_CONFIG = {
  STUDENT: [
    {
      groupId: "overview", label: "Overview",
      items: [
        { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
        { id: "notices", label: "Notices", icon: Bell, path: "/notices", badge: 0 },
        { id: "messages", label: "Messages", icon: MessageCircle, path: "/messages" },
        { id: "grievances", label: "Grievances", icon: MessageSquareWarning, path: "/grievances" },
      ],
    },
    {
      groupId: "academic", label: "Academic",
      items: [
        { id: "calendar", label: "Academic Calendar", icon: CalendarDays, path: "/calendar" },
        { id: "attendance", label: "My Attendance", icon: UserCheck, path: "/my-attendance" },
        { id: "scan-attendance", label: "Scan Attendance", icon: ScanLine, path: "/scan-attendance" },
        { id: "timetable", label: "My Timetable", icon: CalendarDays, path: "/my-timetable" },
        { id: "marks", label: "My Results", icon: BarChart2, path: "/my-results" },
        { id: "exams", label: "Exam Schedule", icon: ClipboardList, path: "/my-exams" },
        { id: "library", label: "My Library", icon: Library, path: "/my-library" },
        { id: "assignments", label: "My Assignments", icon: FileText, path: "/my-assignments" },
        { id: "feedback", label: "Course Feedback", icon: Star, path: "/my-feedback" },
        { id: "my-documents", label: "My Documents", icon: CreditCard, path: "/my-documents" },
      ],
    },
    {
      groupId: "finance", label: "Finance",
      items: [{ id: "fees", label: "My Fees", icon: CreditCard, path: "/my-fees" }],
    },
  ],
  FACULTY: [
    {
      groupId: "overview", label: "Overview",
      items: [
        { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
        { id: "calendar", label: "Academic Calendar", icon: CalendarDays, path: "/calendar" },
        { id: "notices", label: "Notices", icon: Bell, path: "/notices" },
        { id: "messages", label: "Messages", icon: MessageCircle, path: "/messages" },
        { id: "grievances", label: "Grievances", icon: MessageSquareWarning, path: "/grievances" },
      ],
    },
    {
      groupId: "teaching", label: "Teaching",
      items: [
        { id: "attendance", label: "Attendance", icon: UserCheck, path: "/attendance" },
        { id: "qr-attendance", label: "QR Attendance", icon: QrCode, path: "/qr-attendance" },
        { id: "assignments", label: "Assignments", icon: FileText, path: "/assignments" },
        { id: "leave", label: "My Leaves", icon: CalendarOff, path: "/leave" },
        { id: "marks", label: "Enter Marks", icon: BookOpen, path: "/marks" },
        { id: "timetable", label: "My Timetable", icon: CalendarDays, path: "/my-timetable" },
        { id: "exams", label: "Examinations", icon: ClipboardList, path: "/examinations" },
        { id: "feedback", label: "My Feedback", icon: Star, path: "/feedback" },
      ],
    },
  ],
  HOD: [
    {
      groupId: "core", label: "Overview",
      items: [
        { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
        { id: "notifications", label: "Notifications", icon: Bell, path: "/notifications", badge: 5 },
      ],
    },
    {
      groupId: "department", label: "Department",
      items: [
        { id: "students", label: "Students", icon: Users, path: "/students" },
        { id: "faculty", label: "Faculty", icon: GraduationCap, path: "/faculty" },
        { id: "attendance", label: "Attendance", icon: UserCheck, path: "/attendance" },
        { id: "exams", label: "Exams", icon: ClipboardList, path: "/examinations" },
        { id: "results", label: "Results", icon: BarChart2, path: "/results" },
        { id: "courses", label: "Courses", icon: BookOpen, path: "/courses" },
      ],
    },
    {
      groupId: "admin", label: "Administration",
      items: [
        { id: "finance", label: "Finance", icon: CreditCard, path: "/finance" },
        { id: "placement", label: "Placement", icon: Briefcase, path: "/placement" },
        { id: "reports", label: "Reports", icon: FileText, path: "/reports" },
        { id: "settings", label: "Settings", icon: Settings, path: "/settings" },
      ],
    },
  ],
  ADMIN: [
    {
      groupId: "core", label: "Overview",
      items: [
        { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
        { id: "notifications", label: "Notifications", icon: Bell, path: "/notifications" },
      ],
    },
    {
      groupId: "management", label: "Management",
      items: [
        { id: "users", label: "User Management", icon: ShieldCheck, path: "/users" },
        { id: "academic", label: "Academic Structure", icon: Building2, path: "/academic-structure" },
        { id: "students", label: "Students", icon: Users, path: "/students" },
        { id: "faculty", label: "Faculty", icon: GraduationCap, path: "/faculty" },
        { id: "courses", label: "Courses", icon: BookOpen, path: "/courses" },
      ],
    },
    {
      groupId: "operations", label: "Operations",
      items: [
        { id: "calendar", label: "Academic Calendar", icon: CalendarDays, path: "/calendar" },
        { id: "attendance", label: "Attendance", icon: UserCheck, path: "/attendance" },
        { id: "exams", label: "Examinations", icon: ClipboardList, path: "/examinations" },
        { id: "timetable", label: "Timetable", icon: CalendarDays, path: "/timetable" },
        { id: "marks", label: "Marks & Grades", icon: ClipboardList, path: "/marks" },
        { id: "finance", label: "Fee Management", icon: CreditCard, path: "/finance" },
        { id: "library", label: "Library", icon: Library, path: "/library" },
        { id: "reports", label: "Reports", icon: FileText, path: "/reports" },
        { id: "leaveRequests", label: "Leave Requests", icon: CalendarOff, path: "/leave-requests" },
        { id: "feedback-reports", label: "Feedback Reports", icon: Star, path: "/feedback-reports" },
        { id: "notices", label: "Notice Board", icon: Bell, path: "/notices" },
        { id: "messages", label: "Messages", icon: MessageCircle, path: "/messages" },
        { id: "grievances", label: "Grievances", icon: MessageSquareWarning, path: "/grievances" },
        { id: "documents", label: "Document Center", icon: CreditCard, path: "/documents" },
      ],
    },
    {
      groupId: "system", label: "System",
      items: [
        { id: "settings", label: "Settings", icon: Settings, path: "/settings" },
        { id: "security", label: "Security", icon: ShieldCheck, path: "/security" },
      ],
    },
  ],
  SUPER_ADMIN: [
    {
      groupId: "core", label: "Overview",
      items: [
        { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
        { id: "notifications", label: "Notifications", icon: Bell, path: "/notifications" },
      ],
    },
    {
      groupId: "management", label: "Management",
      items: [
        { id: "users", label: "User Management", icon: ShieldCheck, path: "/users" },
        { id: "students", label: "Students", icon: Users, path: "/students" },
        { id: "faculty", label: "Faculty", icon: GraduationCap, path: "/faculty" },
        { id: "courses", label: "Courses", icon: BookOpen, path: "/courses" },
        { id: "rooms", label: "Rooms", icon: Building2, path: "/rooms" },
      ],
    },
    {
      groupId: "operations", label: "Operations",
      items: [
        { id: "attendance", label: "Attendance", icon: UserCheck, path: "/attendance" },
        { id: "exams", label: "Examinations", icon: ClipboardList, path: "/examinations" },
        { id: "finance", label: "Finance", icon: CreditCard, path: "/finance" },
        { id: "library", label: "Library", icon: Library, path: "/library" },
        { id: "reports", label: "Reports", icon: FileText, path: "/reports" },
      ],
    },
    {
      groupId: "system", label: "System",
      items: [
        { id: "settings", label: "Settings", icon: Settings, path: "/settings" },
        { id: "security", label: "Security", icon: ShieldCheck, path: "/security" },
      ],
    },
  ],
};

const buildMenuForRole = (role) => MENU_CONFIG[role] ?? MENU_CONFIG["STUDENT"];

// ─────────────────────────────────────────────────────────────────────────────
// TOOLTIP
// ─────────────────────────────────────────────────────────────────────────────

const SidebarTooltip = ({ label, enabled, children }) => {
  if (!enabled) return <>{children}</>;
  return (
    <div className="relative group/tooltip">
      {children}
      <div
        aria-hidden="true"
        className="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 px-2.5 py-1.5 rounded-lg
          bg-slate-900 text-white text-xs font-medium whitespace-nowrap shadow-xl
          pointer-events-none select-none opacity-0 scale-95 translate-x-[-4px]
          group-hover/tooltip:opacity-100 group-hover/tooltip:scale-100 group-hover/tooltip:translate-x-0
          transition-all duration-200 origin-left"
      >
        {label}
        <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900" />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// BADGE — the only "warm" color in the whole sidebar, so it pops
// ─────────────────────────────────────────────────────────────────────────────

const NavBadge = ({ count }) => {
  if (!count) return null;
  return (
    <span className="ml-auto flex-shrink-0 min-w-[19px] h-[19px] px-1.5 flex items-center justify-center
      rounded-full text-[10px] font-bold text-white
      bg-gradient-to-br from-rose-500 to-rose-600 shadow-[0_2px_6px_-1px_rgba(225,29,72,0.5)] select-none">
      {count > 99 ? "99+" : count}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// NAV ITEM — sliding gradient active-pill via framer-motion layoutId
// ─────────────────────────────────────────────────────────────────────────────

const NavItem = ({ item, isCollapsed }) => {
  const Icon = item.icon;

  return (
    <SidebarTooltip label={item.label} enabled={isCollapsed}>
      <NavLink
        to={item.path}
        end={item.path === "/dashboard"}
        className="relative flex items-center gap-3 w-full rounded-xl text-sm font-medium
          px-3 py-2.5 transition-colors duration-150 group/item
          focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
        aria-label={item.label}
      >
        {({ isActive }) => (
          <>
            {isActive && (
              <motion.span
                layoutId="active-nav-pill"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
                className="absolute inset-0 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 shadow-[0_4px_14px_-2px_rgba(79,70,229,0.45)]"
              />
            )}
            {!isActive && (
              <span className="absolute inset-0 rounded-xl bg-brand-50/0 group-hover/item:bg-brand-50/70 transition-colors duration-150" />
            )}

            <span
              className={`relative z-10 flex-shrink-0 transition-transform duration-150 group-hover/item:scale-110 ${
                isActive ? "text-white" : "text-slate-400 group-hover/item:text-brand-600"
              }`}
            >
              <Icon size={17.5} strokeWidth={isActive ? 2.4 : 2} />
            </span>

            {!isCollapsed && (
              <span className={`relative z-10 flex-1 truncate ${isActive ? "text-white font-semibold" : "text-slate-600 group-hover/item:text-slate-900"}`}>
                {item.label}
              </span>
            )}

            {!isCollapsed && item.badge > 0 && (
              <span className="relative z-10"><NavBadge count={item.badge} /></span>
            )}
          </>
        )}
      </NavLink>
    </SidebarTooltip>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// NAV GROUP
// ─────────────────────────────────────────────────────────────────────────────

const NavGroup = ({ group, isCollapsed, index }) => (
  <li role="none">
    <div className="mb-2 px-3">
      {isCollapsed ? (
        <div className="w-6 h-px mx-auto bg-slate-200" aria-hidden="true" />
      ) : (
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 select-none">
          {group.label}
        </p>
      )}
    </div>
    <ul className="space-y-1" role="list">
      {group.items.map((item, i) => (
        <motion.li
          key={item.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: (index * 0.03) + i * 0.02, duration: 0.25 }}
        >
          <NavItem item={item} isCollapsed={isCollapsed} />
        </motion.li>
      ))}
    </ul>
  </li>
);

// ─────────────────────────────────────────────────────────────────────────────
// BRAND HEADER
// ─────────────────────────────────────────────────────────────────────────────

const SidebarBrand = ({ isCollapsed }) => (
  <div className={`flex items-center h-16 flex-shrink-0 px-4 border-b border-slate-100 ${isCollapsed ? "justify-center px-0" : "gap-3"}`}
    aria-label="Smart Campus ERP">
    <motion.div
      whileHover={{ rotate: -6, scale: 1.05 }}
      transition={{ type: "spring", stiffness: 300 }}
      className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-2xl
        bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700
        shadow-[0_6px_16px_-4px_rgba(79,70,229,0.55)]"
      aria-hidden="true"
    >
      <BookOpen size={19} className="text-white" strokeWidth={2.2} />
    </motion.div>

    <AnimatePresence initial={false}>
      {!isCollapsed && (
        <motion.div
          key="brand-label"
          initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }} exit={{ opacity: 0, width: 0 }}
          transition={{ duration: 0.2 }} className="overflow-hidden whitespace-nowrap">
          <p className="text-sm font-bold text-slate-800 leading-none">
            Smart<span className="bg-gradient-to-r from-brand-600 to-brand-500 bg-clip-text text-transparent">Campus</span>
          </p>
          <p className="text-[10px] text-slate-400 mt-1 font-medium tracking-wide">ERP System</p>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// FOOTER — photo-aware, gradient fallback, online dot
// ─────────────────────────────────────────────────────────────────────────────

const SidebarFooter = ({ isCollapsed }) => {
  const { user: authUser } = useAuth();
  const name = authUser?.name ?? "User";
  const role = authUser?.role ?? "STUDENT";
  const initials = name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  const user = { name, role, initials, photoUrl: authUser?.photoUrl ?? null };

  return (
    <div className="flex-shrink-0 p-3 border-t border-slate-100">
      <SidebarTooltip label={`${user.name} · ${user.role}`} enabled={isCollapsed}>
        <motion.div
          whileHover={{ scale: 1.02 }}
          className={`flex items-center gap-2.5 rounded-xl p-2 bg-slate-50 hover:bg-brand-50
            cursor-default transition-colors duration-200 ${isCollapsed ? "justify-center" : ""}`}
        >
          <div className="relative flex-shrink-0">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-brand-500 to-brand-700
              flex items-center justify-center text-white text-xs font-bold select-none ring-2 ring-white shadow-md">
              {user.photoUrl ? (
                <img src={photoUrl(user.photoUrl)} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                user.initials
              )}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-white" />
          </div>

          <AnimatePresence initial={false}>
            {!isCollapsed && (
              <motion.div
                key="footer-label"
                initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }} exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }} className="overflow-hidden min-w-0">
                <p className="text-xs font-semibold text-slate-700 truncate">{user.name}</p>
                <p className="text-[10px] bg-gradient-to-r from-brand-600 to-brand-500 bg-clip-text text-transparent font-bold uppercase tracking-wider">
                  {user.role}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </SidebarTooltip>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SIDEBAR — main export
// ─────────────────────────────────────────────────────────────────────────────

const Sidebar = () => {
  const { isSidebarOpen } = useLayout();
  const { user } = useAuth();
  const isCollapsed = !isSidebarOpen;

  const CURRENT_ROLE = (user?.role ?? "STUDENT").toUpperCase();
  const menuGroups = useMemo(() => buildMenuForRole(CURRENT_ROLE), [CURRENT_ROLE]);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-white">
      <SidebarBrand isCollapsed={isCollapsed} />
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2.5 space-y-6" aria-label="Main navigation">
        <ul className="space-y-6" role="list">
          {menuGroups.map((group, i) => (
            <NavGroup key={group.groupId} group={group} isCollapsed={isCollapsed} index={i} />
          ))}
        </ul>
      </nav>
      <SidebarFooter isCollapsed={isCollapsed} />
    </div>
  );
};

export default Sidebar;