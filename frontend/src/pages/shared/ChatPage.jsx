import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MessageCircle, Search, Send, Trash2, X, User as UserIcon, Check, CheckCheck, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { chatService } from "../../services/chatService";
import { useAuth } from "../../hooks/useAuth";
import { connectWebSocket, subscribe } from "../../services/websocket";
import { photoUrl as resolvePhotoUrl } from "../../services/profileService";

const MESSAGE_POLL_MS = 4000;
const CONVERSATION_POLL_MS = 8000;

function timeShort(dateStr) {
    return new Date(dateStr).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function initials(name) {
    return (name ?? "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

function Avatar({ name, photo, size = 36 }) {
    const [imgError, setImgError] = useState(false);
    const src = photo ? resolvePhotoUrl(photo) : null;

    if (src && !imgError) {
        return (
            <img
                src={src}
                alt={name ?? "User"}
                onError={() => setImgError(true)}
                className="flex-shrink-0 rounded-full object-cover"
                style={{ width: size, height: size }}
            />
        );
    }

    return (
        <div className="flex-shrink-0 rounded-full bg-indigo-100 text-indigo-600 font-semibold flex items-center justify-center"
            style={{ width: size, height: size, fontSize: size * 0.38 }}>
            {initials(name)}
        </div>
    );
}

export default function ChatPage() {
    const { user } = useAuth();
    const [conversations, setConversations] = useState([]);
    const [active, setActive] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loadingConvos, setLoadingConvos] = useState(true);
    const [loadingMsgs, setLoadingMsgs] = useState(false);
    const [draft, setDraft] = useState("");
    const [sending, setSending] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const [showDirectory, setShowDirectory] = useState(false);
    const [dirQuery, setDirQuery] = useState("");
    const [dirResults, setDirResults] = useState([]);

    const bottomRef = useRef(null);
    const activeRef = useRef(null);
    activeRef.current = active;
    const messagesRef = useRef([]);
    messagesRef.current = messages;

    const loadConversations = useCallback(async (silent = false) => {
        if (!silent) setLoadingConvos(true);
        try {
            const data = await chatService.getConversations();
            setConversations(Array.isArray(data) ? data : []);
        } catch { if (!silent) toast.error("Conversations load nahi hui"); }
        finally { if (!silent) setLoadingConvos(false); }
    }, []);

    useEffect(() => { loadConversations(); }, [loadConversations]);

    // ── Real-time incoming messages via existing STOMP infra (instant path) ──
    /*
    useEffect(() => {
        connectWebSocket();
        const unsub = subscribe("/user/queue/messages", (msg) => {
            if (activeRef.current?.id === msg.conversationId) {
                setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
                chatService.markRead(msg.conversationId).catch(() => { });
            }
            loadConversations(true);
        });
        return unsub;
    }, [loadConversations]);


    // Read receipt — jab doosra banda humari conversation open karta hai,
    // hamare bheje messages turant blue tick ho jaate hain
    useEffect(() => {
        const unsub = subscribe("/user/queue/message-read", ({ conversationId }) => {
            if (activeRef.current?.id === conversationId) {
                setMessages(prev => prev.map(m => ({ ...m, read: true })));
            }
        });
        return unsub;
    }, []);
    */
    // ── Real-time: naya message + read-receipt — dono ek hi connect ke baad
    //    subscribe hote hain, taaki kisi race/order issue se koi push miss na ho ──
    useEffect(() => {
        const client = connectWebSocket({
            onConnect: () => {
                // Reconnect hone par bhi ye onConnect dobara fire hota hai,
                // isliye subscriptions yahin fresh ho jaati hain.
            },
        });
        if (!client) return;

        const unsubMessages = subscribe("/user/queue/messages", (msg) => {
            if (activeRef.current?.id === msg.conversationId) {
                setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
                chatService.markRead(msg.conversationId).catch(() => { });
            }
            loadConversations(true);
        });

        const unsubRead = subscribe("/user/queue/message-read", ({ conversationId }) => {
            if (activeRef.current?.id === conversationId) {
                setMessages(prev => prev.map(m => ({ ...m, read: true })));
            }
        });

        return () => { unsubMessages(); unsubRead(); };
    }, [loadConversations]);





    // ── Polling safety-net — guarantees new messages show up without a
    //    manual page reload even if a WS push is ever missed ──────────────

    /**  
     useEffect(() => {
         const interval = setInterval(async () => {
             const convo = activeRef.current;
             if (!convo) return;
             try {
                 const data = await chatService.getMessages(convo.id, { page: 0, size: 30 });
                 const fresh = (data.content ?? []).slice().reverse();
                 const current = messagesRef.current;
                 const changed = fresh.length !== current.length
                     || fresh[fresh.length - 1]?.id !== current[current.length - 1]?.id;
                 if (changed) {
                     setMessages(fresh);
                     chatService.markRead(convo.id).catch(() => { });
                 }
             } catch {  }
         }, MESSAGE_POLL_MS);
         return () => clearInterval(interval);
     }, []);
 
     */

    useEffect(() => {
        const interval = setInterval(async () => {
            const convo = activeRef.current;
            if (!convo) return;
            try {
                const data = await chatService.getMessages(convo.id, { page: 0, size: 30 });
                const fresh = (data.content ?? []).slice().reverse();
                const current = messagesRef.current;

                const lengthChanged = fresh.length !== current.length;
                const lastIdChanged = fresh[fresh.length - 1]?.id !== current[current.length - 1]?.id;
                // Naya: koi message ka read flag flip hua ho to bhi update karo —
                // isi se blue tick reload ke bina apne aap turant reflect ho jaata hai.
                const readStatusChanged = !lengthChanged && fresh.some((m, i) => m.read !== current[i]?.read);

                if (lengthChanged || lastIdChanged || readStatusChanged) {
                    setMessages(fresh);
                    if (lengthChanged || lastIdChanged) chatService.markRead(convo.id).catch(() => { });
                }
            } catch { /* silent — next tick retries */ }
        }, MESSAGE_POLL_MS);
        return () => clearInterval(interval);
    }, []);





    useEffect(() => {
        const interval = setInterval(() => loadConversations(true), CONVERSATION_POLL_MS);
        return () => clearInterval(interval);
    }, [loadConversations]);

    const openConversation = async (convo) => {
        setActive(convo);
        setLoadingMsgs(true);
        try {
            const data = await chatService.getMessages(convo.id, { page: 0, size: 30 });
            setMessages((data.content ?? []).slice().reverse());
            await chatService.markRead(convo.id);
            setConversations(prev => prev.map(c => c.id === convo.id ? { ...c, unreadCount: 0 } : c));
        } catch { toast.error("Messages load nahi hue"); }
        finally { setLoadingMsgs(false); }
    };

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!draft.trim() || !active) return;
        setSending(true);
        const content = draft.trim();
        setDraft("");
        try {
            const msg = await chatService.sendMessage(active.id, content);
            setMessages(prev => [...prev, msg]);
            loadConversations(true);
        } catch { toast.error("Message send nahi hua"); setDraft(content); }
        finally { setSending(false); }
    };

    const searchDirectory = async (q) => {
        setDirQuery(q);
        try {
            const data = await chatService.searchUsers(q);
            setDirResults(Array.isArray(data) ? data : []);
        } catch { /* ignore */ }
    };

    const startChat = async (otherUser) => {
        try {
            const convo = await chatService.startConversation(otherUser.id);
            setShowDirectory(false);
            await loadConversations();
            openConversation(convo);
        } catch { toast.error("Chat start nahi hui"); }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await chatService.deleteConversation(deleteTarget.id);
            setConversations(prev => prev.filter(c => c.id !== deleteTarget.id));
            if (active?.id === deleteTarget.id) { setActive(null); setMessages([]); }
            toast.success("Chat delete ho gayi.");
        } catch { toast.error("Delete nahi hua"); }
        finally { setDeleteTarget(null); }
    };

    return (
        <div className="flex h-[calc(100vh-4rem)] bg-white">
            {/* ── Conversation list ─────────────────────────────────────────── */}
            <div className={`${active ? "hidden sm:flex" : "flex"} w-full sm:w-80 flex-shrink-0 border-r border-slate-200 flex-col`}>
                <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100">
                    <h1 className="text-base font-semibold text-slate-800">Messages</h1>
                    <button onClick={() => setShowDirectory(true)}
                        className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition-colors">
                        <UserIcon size={16} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loadingConvos ? (
                        <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-slate-400" /></div>
                    ) : conversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2 px-4 text-center">
                            <MessageCircle size={28} className="opacity-30" />
                            <p className="text-sm">Koi conversation nahi. Naya chat start karein.</p>
                        </div>
                    ) : (
                        conversations.map(c => (
                            <div key={c.id}
                                className={`group flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 cursor-pointer ${active?.id === c.id ? "bg-indigo-50" : ""}`}
                                onClick={() => openConversation(c)}>
                                <Avatar name={c.otherUserName} photo={c.otherUserPhotoUrl} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium text-slate-800 truncate">{c.otherUserName}</p>
                                        {c.lastMessageAt && <span className="text-[11px] text-slate-400 flex-shrink-0">{timeShort(c.lastMessageAt)}</span>}
                                    </div>
                                    <p className="text-xs text-slate-500 truncate mt-0.5">{c.lastMessagePreview ?? "No messages yet"}</p>
                                </div>
                                {c.unreadCount > 0 && (
                                    <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-indigo-600 text-white text-[10px] font-semibold rounded-full">
                                        {c.unreadCount}
                                    </span>
                                )}
                                <button
                                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(c); }}
                                    className="flex-shrink-0 p-1.5 rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* ── Active thread ──────────────────────────────────────────────── */}
            <div className={`${active ? "flex" : "hidden sm:flex"} flex-1 flex-col`}>
                {!active ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-300 gap-2">
                        <MessageCircle size={40} />
                        <p className="text-sm text-slate-400">Ek conversation select karein</p>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setActive(null)}
                                    className="sm:hidden -ml-1 p-1.5 rounded-lg text-slate-500 hover:bg-slate-100">
                                    <ArrowLeft size={18} />
                                </button>
                                <Avatar name={active.otherUserName} photo={active.otherUserPhotoUrl} size={32} />
                                <div>
                                    <p className="text-sm font-semibold text-slate-800">{active.otherUserName}</p>
                                    <p className="text-xs text-slate-400">{active.otherUserRole}</p>
                                </div>
                            </div>
                            <button onClick={() => setDeleteTarget(active)}
                                className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                                <Trash2 size={16} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-slate-50">
                            {loadingMsgs ? (
                                <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-slate-400" /></div>
                            ) : (
                                messages.map(m => {
                                    const mine = m.senderId === user?.id;
                                    return (
                                        <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                                            <div className={`max-w-[70%] px-3.5 py-2 rounded-2xl text-sm ${mine ? "bg-indigo-600 text-white rounded-br-sm" : "bg-white border border-slate-200 text-slate-700 rounded-bl-sm"}`}>
                                                <p className="whitespace-pre-wrap break-words">{m.content}</p>
                                                <div className={`flex items-center gap-1 mt-1 ${mine ? "justify-end" : ""}`}>
                                                    <span className={`text-[10px] ${mine ? "text-indigo-200" : "text-slate-400"}`}>{timeShort(m.createdAt)}</span>
                                                    {mine && (
                                                        m.read
                                                            ? <CheckCheck size={13} className="text-sky-300" />
                                                            : <Check size={13} className="text-indigo-200" />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={bottomRef} />
                        </div>

                        <form onSubmit={handleSend} className="flex items-center gap-2 px-4 py-3 border-t border-slate-100">
                            <input value={draft} onChange={e => setDraft(e.target.value)}
                                placeholder="Message likhein…"
                                className="flex-1 px-3.5 py-2 text-sm bg-slate-100 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                            <button type="submit" disabled={sending || !draft.trim()}
                                className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-full transition-colors">
                                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                            </button>
                        </form>
                    </>
                )}
            </div>

            {/* ── New chat directory ────────────────────────────────────────── */}
            {showDirectory && (
                <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16">
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowDirectory(false)} />
                    <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                            <h2 className="text-sm font-semibold text-slate-800">New Conversation</h2>
                            <button onClick={() => setShowDirectory(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-4">
                            <div className="relative mb-3">
                                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input value={dirQuery} onChange={e => searchDirectory(e.target.value)}
                                    placeholder="Naam se search karein…" autoFocus
                                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div className="max-h-72 overflow-y-auto space-y-1">
                                {dirResults.map(u => (
                                    <button key={u.id} onClick={() => startChat(u)}
                                        className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-50 text-left transition-colors">
                                        <Avatar name={u.name} photo={u.photoUrl} size={32} />
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-slate-800 truncate">{u.name}</p>
                                            <p className="text-xs text-slate-400 truncate">{u.role} · {u.email}</p>
                                        </div>
                                    </button>
                                ))}
                                {dirQuery && dirResults.length === 0 && (
                                    <p className="text-xs text-slate-400 text-center py-6">Koi user nahi mila</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete confirmation ──────────────────────────────────────── */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-24">
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
                    <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl p-5">
                        <h2 className="text-sm font-semibold text-slate-800 mb-2">Delete conversation?</h2>
                        <p className="text-sm text-slate-500 mb-5">
                            <span className="font-medium">{deleteTarget.otherUserName}</span> ke saath poori chat history permanently delete ho jaayegi.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteTarget(null)}
                                className="flex-1 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">
                                Cancel
                            </button>
                            <button onClick={handleDelete}
                                className="flex-1 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg">
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}