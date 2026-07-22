/**
 * @file useNotifications.js
 * @description Combines the REST notification inbox with a live WebSocket
 * subscription. On mount (once authenticated): loads the recent inbox +
 * unread count over REST, opens a STOMP connection, and subscribes to
 * both the user's private queue (personal notifications) and the shared
 * notice topic (campus-wide notice board pushes).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import useAuth from "./useAuth";
import { notificationService } from "../services/notificationService";
import { connectWebSocket, disconnectWebSocket, subscribe } from "../services/websocket";

export function useNotifications() {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const unsubscribers = useRef([]);

  const loadInbox = useCallback(async () => {
    setLoading(true);
    try {
      const [listData, count] = await Promise.all([
        notificationService.getMyNotifications({ page: 0, size: 20 }),
        notificationService.getUnreadCount(),
      ]);
      setNotifications(listData.content ?? []);
      setUnreadCount(count ?? 0);
    } catch {
      // Inbox failing to load shouldn't break the rest of the app.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    loadInbox();
    connectWebSocket();

    // Personal notification push — new row, unread count goes up.
    const unsubPersonal = subscribe("/user/queue/notifications", (dto) => {
      setNotifications((prev) => [dto, ...prev].slice(0, 50));
      setUnreadCount((prev) => prev + 1);
      toast(`${dto.typeEmoji ?? "🔔"} ${dto.title}`, { duration: 4000 });
    });

    // Campus-wide notice board push — surfaced as a toast, doesn't touch
    // the personal unread counter (it isn't a persisted per-user row).
    const unsubNotice = subscribe("/topic/notices", (notice) => {
      toast(`📢 New notice: ${notice.title}`, { duration: 4000 });
    });

    unsubscribers.current = [unsubPersonal, unsubNotice];

    return () => {
      unsubscribers.current.forEach((unsub) => unsub());
      disconnectWebSocket();
    };
  }, [isAuthenticated, loadInbox]);

  const markRead = useCallback(async (id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try { await notificationService.markRead(id); } catch { /* optimistic — ignore */ }
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try { await notificationService.markAllRead(); } catch { /* optimistic — ignore */ }
  }, []);

  return { notifications, unreadCount, loading, markRead, markAllRead, refresh: loadInbox };
}

export default useNotifications;