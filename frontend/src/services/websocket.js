/**
 * @file websocket.js
 * @description Singleton STOMP-over-SockJS client for real-time push
 * (notifications, live notice board updates). One connection is shared
 * across the whole app via useNotifications() — components don't create
 * their own client.
 */
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { getAccessToken } from "../utils/storage";

const WS_BASE_URL =
  import.meta.env.VITE_WS_BASE_URL ?? "http://10.212.45.8:8080/ws";

let stompClient = null;

/**
 * Connects (or reuses an existing connection) and returns the STOMP client.
 * The JWT is sent as a native STOMP header on CONNECT — read by
 * StompAuthChannelInterceptor on the backend to authenticate the session.
 *
 * @param {Object} handlers
 * @param {Function} [handlers.onConnect]
 * @param {Function} [handlers.onDisconnect]
 */
export function connectWebSocket({ onConnect, onDisconnect } = {}) {
  if (stompClient?.active) return stompClient;

  const token = getAccessToken();
  if (!token) return null;

  stompClient = new Client({
    webSocketFactory: () => new SockJS(WS_BASE_URL),
    connectHeaders: { Authorization: `Bearer ${token}` },
    reconnectDelay: 5000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    onConnect: () => onConnect?.(),
    onDisconnect: () => onDisconnect?.(),
    onStompError: (frame) => {
      console.error("[WS] STOMP error:", frame.headers?.message);
    },
  });

  stompClient.activate();
  return stompClient;
}

export function disconnectWebSocket() {
  if (stompClient?.active) {
    stompClient.deactivate();
  }
  stompClient = null;
}

/**
 * Subscribes to a destination once the client is connected. Safe to call
 * immediately after connectWebSocket() — queues via the client's own
 * onConnect if not yet active.
 *
 * @returns {Function} unsubscribe function
 */
export function subscribe(destination, callback) {
  if (!stompClient) return () => {};

  let subscription = null;
  const doSubscribe = () => {
    subscription = stompClient.subscribe(destination, (message) => {
      try {
        callback(JSON.parse(message.body));
      } catch {
        callback(message.body);
      }
    });
  };

  if (stompClient.connected) {
    doSubscribe();
  } else {
    stompClient.onConnect = ((prev) => () => {
      prev?.();
      doSubscribe();
    })(stompClient.onConnect);
  }

  return () => subscription?.unsubscribe();
}

export function getStompClient() {
  return stompClient;
}