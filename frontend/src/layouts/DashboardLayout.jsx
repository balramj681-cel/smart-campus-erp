/**
 * @file DashboardLayout.jsx
 * @location src/layouts/DashboardLayout.jsx
 *
 * @description
 * The primary authenticated shell for the Smart Campus ERP system.
 * All protected routes (Dashboard, Students, Faculty, Finance, etc.)
 * render INSIDE this layout via React Router's <Outlet />.
 *
 * Architecture Pattern: Shell + Slot (used by Microsoft Admin Center, SAP Fiori)
 *
 *   DashboardLayout
 *   ├── Navbar        ← top slot  (receives layout controls via LayoutContext)
 *   ├── Sidebar       ← left slot (receives open/close state via LayoutContext)
 *   └── <Outlet />    ← content slot (every sub-page renders here)
 *
 * Why LayoutContext?
 *   Sidebar open/close state is needed by both Navbar (toggle button) and
 *   Sidebar (to know whether to expand or collapse). Instead of prop-drilling
 *   through every future component, we expose a shared LayoutContext here.
 *   Any child — however deeply nested — can consume it without coupling.
 *
 * Scalability:
 *   - Add role-based shells by composing a new layout that imports <Navbar />
 *     and <Sidebar /> independently with different menu configs.
 *   - Dark mode is class-ready via Tailwind's `dark:` prefix on the root div.
 *   - Mobile overlay is handled here so Sidebar stays a pure display component.
 *
 * @exports DashboardLayout   - default export (used in DashboardRoutes.jsx)
 * @exports useLayout         - named export (consumed by Navbar, Sidebar, any child)
 */

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Navbar from "../components/layout/Navbar";
import Sidebar from "../components/layout/Sidebar";

// ---------------------------------------------------------------------------
// LayoutContext
// Provides sidebar state and controls to ALL descendants without prop-drilling.
// ---------------------------------------------------------------------------

const LayoutContext = createContext(null);

/**
 * useLayout
 * Custom hook to consume LayoutContext.
 * Throws a descriptive error if used outside of DashboardLayout —
 * prevents silent failures during development.
 *
 * @returns {{ isSidebarOpen: boolean, toggleSidebar: function, closeSidebar: function }}
 */
export const useLayout = () => {
    const context = useContext(LayoutContext);
    if (!context) {
        throw new Error(
            "[useLayout] must be used within <DashboardLayout />. " +
            "Ensure your route is wrapped inside the dashboard layout shell."
        );
    }
    return context;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Tailwind width class for the expanded sidebar */
const SIDEBAR_WIDTH_EXPANDED = "w-64";   // 256px

/** Tailwind width class for the collapsed sidebar (icon-only) */
const SIDEBAR_WIDTH_COLLAPSED = "w-20";  // 80px

/** Breakpoint (px) below which sidebar becomes a mobile overlay drawer */
const MOBILE_BREAKPOINT = 768;

// ---------------------------------------------------------------------------
// DashboardLayout Component
// ---------------------------------------------------------------------------

/**
 * DashboardLayout
 *
 * The top-level shell for all authenticated ERP pages.
 * Manages sidebar open/collapse state and exposes it via LayoutContext.
 *
 * Responsive behaviour:
 *   ≥ 768px (md)  → Sidebar is persistent, collapsible to icon-only strip.
 *   <  768px      → Sidebar becomes a full-height overlay drawer with a
 *                   semi-transparent backdrop. Closes on route change.
 *
 * @component
 */
const DashboardLayout = () => {
    // ── State ────────────────────────────────────────────────────────────────

    /**
     * Controls whether the sidebar is open (expanded) or closed (collapsed).
     * On desktop: toggles between 256px and 80px.
     * On mobile:  toggles between full overlay and hidden.
     */
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    /**
     * Tracks whether the viewport is in mobile range.
     * Derived on mount and updated on window resize.
     */
    const [isMobile, setIsMobile] = useState(
        () => window.innerWidth < MOBILE_BREAKPOINT
    );

    // Current route — used to auto-close mobile sidebar on navigation.
    const location = useLocation();

    // ── Side Effects ─────────────────────────────────────────────────────────

    /**
     * Responsive handler.
     * On mobile: sidebar starts closed (overlay mode).
     * On desktop: sidebar starts open (persistent mode).
     * Uses ResizeObserver pattern via window resize for broad compatibility.
     */
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < MOBILE_BREAKPOINT;
            setIsMobile(mobile);

            // Automatically collapse sidebar when resizing to mobile,
            // and expand when returning to desktop.
            setIsSidebarOpen(!mobile);
        };

        window.addEventListener("resize", handleResize);

        // Set correct initial state on first render.
        handleResize();

        return () => window.removeEventListener("resize", handleResize);
    }, []);

    /**
     * Route change handler.
     * On mobile, close the sidebar overlay whenever the user navigates
     * to a new page — mirrors the behaviour of mobile nav in Gmail, Outlook.
     */
    useEffect(() => {
        if (isMobile) {
            setIsSidebarOpen(false);
        }
    }, [location.pathname, isMobile]);

    // ── Sidebar Controls ─────────────────────────────────────────────────────

    /** Toggles sidebar between open and closed states. */
    const toggleSidebar = useCallback(() => {
        setIsSidebarOpen((prev) => !prev);
    }, []);

    /** Explicitly closes the sidebar. Used by mobile backdrop click. */
    const closeSidebar = useCallback(() => {
        setIsSidebarOpen(false);
    }, []);

    // ── Context Value ─────────────────────────────────────────────────────────

    const layoutContextValue = {
        isSidebarOpen,
        isMobile,
        toggleSidebar,
        closeSidebar,
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <LayoutContext.Provider value={layoutContextValue}>
            {/*
       * Root shell — full viewport height, slate background.
       * `dark:bg-slate-950` is ready for dark mode toggle (add `dark` class to <html>).
       */}
            <div className="flex h-screen w-screen overflow-hidden bg-slate-100 dark:bg-slate-950">

                {/* ── Mobile Backdrop Overlay ───────────────────────────────────────
         * Rendered only on mobile when sidebar is open.
         * Clicking it closes the sidebar drawer.
         * AnimatePresence enables the fade-in/out animation.
         */}
                <AnimatePresence>
                    {isMobile && isSidebarOpen && (
                        <motion.div
                            key="backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={closeSidebar}
                            className="fixed inset-0 z-20 bg-slate-900/50 backdrop-blur-sm md:hidden"
                            aria-hidden="true"
                        />
                    )}
                </AnimatePresence>

                {/* ── Sidebar Slot ──────────────────────────────────────────────────
         * On desktop: persistent, transitions between w-64 and w-20.
         * On mobile:  fixed overlay, slides in from the left via translateX.
         *
         * NOTE: The actual <Sidebar /> component is imported here once
         * it's generated. The placeholder div below will be replaced.
         *
         * The outer wrapper owns the width/position/transition CSS so that
         * Sidebar itself stays a pure "display" component with no layout concerns.
         */}
                <aside
                    className={[
                        // ── Shared styles (desktop + mobile) ──
                        "flex-shrink-0 h-full z-30",
                        "transition-all duration-300 ease-in-out",
                        "bg-white dark:bg-slate-900",
                        "border-r border-slate-200 dark:border-slate-700",

                        // ── Desktop layout (md and above) ──
                        // Sidebar is part of the normal document flow, not fixed.
                        "relative hidden md:flex md:flex-col",
                        isSidebarOpen ? SIDEBAR_WIDTH_EXPANDED : SIDEBAR_WIDTH_COLLAPSED,
                    ].join(" ")}
                    aria-label="Main navigation sidebar"
                >
                    {/*
           * TODO (File 3): Replace this placeholder with <Sidebar />
           * <Sidebar />
           */}
                    <div className="flex items-center justify-center h-full text-slate-400 text-xs select-none">
                        {/* Sidebar renders here */}
                        <Sidebar />
                    </div>
                </aside>

                {/* ── Mobile Sidebar Drawer ─────────────────────────────────────────
         * Separate fixed element for mobile — slides in over the content.
         * Hidden on md+ screens.
         */}
                <AnimatePresence>
                    {isMobile && isSidebarOpen && (
                        <motion.aside
                            key="mobile-sidebar"
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className={[
                                "fixed top-0 left-0 h-full z-30",
                                "w-64 flex flex-col",
                                "bg-white dark:bg-slate-900",
                                "border-r border-slate-200 dark:border-slate-700",
                                "shadow-2xl md:hidden",
                            ].join(" ")}
                            aria-label="Mobile navigation sidebar"
                        >
                            {/*
               * TODO (File 3): Replace this placeholder with <Sidebar />
               * <Sidebar />
               */}
                            <div className="flex items-center justify-center h-full text-slate-400 text-xs select-none">
                                {/* Mobile Sidebar renders here */}
                                <Sidebar />
                            </div>
                        </motion.aside>
                    )}
                </AnimatePresence>

                {/* ── Main Content Column ───────────────────────────────────────────
         * Takes remaining horizontal space after the sidebar.
         * `min-w-0` prevents content from pushing the sidebar out on flex overflow.
         */}
                <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">

                    {/* ── Navbar Slot ─────────────────────────────────────────────────
           * Sticky top bar — fixed height, full width of remaining space.
           * NOTE: Replace placeholder with <Navbar /> once generated (File 2).
           */}
                    <header
                        className="flex-shrink-0 w-full h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-sm z-10"
                        aria-label="Top navigation bar"
                    >
                        <Navbar />
                    </header>

                    {/* ── Page Content Slot (<Outlet />) ───────────────────────────────
           * This is where every child page (Dashboard, Students, Finance…)
           * renders. The `overflow-y-auto` makes this the only scroll region,
           * keeping Navbar and Sidebar always visible.
           *
           * Framer Motion animates page transitions on route change.
           */}
                    <main
                        className="flex-1 overflow-y-auto overflow-x-hidden"
                        aria-label="Main content area"
                    >
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={location.pathname}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.2, ease: "easeInOut" }}
                                className="h-full"
                            >
                                {/*
                 * React Router renders the matched child route here.
                 * Every protected page in the ERP system renders inside this Outlet.
                 */}
                                <Outlet />
                            </motion.div>
                        </AnimatePresence>
                    </main>

                </div>
            </div>
        </LayoutContext.Provider>
    );
};

export default DashboardLayout;