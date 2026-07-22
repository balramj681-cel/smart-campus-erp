import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft, ChevronRight, Eye, EyeOff,
  Loader2, Plus, Trash2, X,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  calendarService, EVENT_TYPE_CONFIG, EVENT_TYPES,
  MONTH_NAMES, DAY_NAMES_SHORT,
  buildCalendarGrid, eventOnDate, isToday,
} from "../../services/calendarService";
import { useAuth } from "../../hooks/useAuth";
import { currentAcademicYear } from "../../services/courseService";

// ─── Constants ────────────────────────────────────────────────────────────────
const ACADEMIC_YEARS = (() => {
  const y = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => {
    const yr = y - i;
    return `${yr}-${String(yr + 1).slice(-2)}`;
  });
})();

const inputCls = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500";

const EMPTY_FORM = {
  title: "", description: "", eventType: "GENERAL",
  startDate: "", endDate: "", academicYear: currentAcademicYear(),
  published: true, isHoliday: false,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

function Modal({ open, title, onClose, children }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 overflow-y-auto">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 8 }}
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X size={16} />
              </button>
            </div>
            <div className="px-5 py-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function EventDot({ color }) {
  return <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }}/>;
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AcademicCalendarPage() {
  const { user } = useAuth();
  const role = (user?.role ?? "").toLowerCase();
  const canManage = ["admin","super_admin","hod"].includes(role);

  const now = new Date();
  const [viewYear,    setViewYear]    = useState(now.getFullYear());
  const [viewMonth,   setViewMonth]   = useState(now.getMonth() + 1);
  const [academicYear,setAcademicYear]= useState(currentAcademicYear());
  const [events,      setEvents]      = useState([]);
  const [loading,     setLoading]     = useState(true);

  // Selected day for detail panel
  const [selectedDate, setSelectedDate] = useState(null);

  // Modals
  const [createOpen,  setCreateOpen]  = useState(false);
  const [editEvent,   setEditEvent]   = useState(null);
  const [deleteTarget,setDeleteTarget]= useState(null);

  const [form,   setForm]   = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const grid = buildCalendarGrid(viewYear, viewMonth);

  // ── Load events ─────────────────────────────────────────────────────────────
  useEffect(() => {
    loadEvents();
  }, [viewYear, viewMonth, academicYear]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const data = await calendarService.getMonth(viewYear, viewMonth, academicYear);
      setEvents(Array.isArray(data) ? data : []);
    } catch { toast.error("Calendar events load nahi hue"); }
    finally   { setLoading(false); }
  };

  // ── Navigation ──────────────────────────────────────────────────────────────
  const prevMonth = () => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
    setSelectedDate(null);
  };
  const nextMonth = () => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
    setSelectedDate(null);
  };
  const goToday = () => {
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth() + 1);
    setSelectedDate(null);
  };

  // ── Events for a specific date ───────────────────────────────────────────────
  const getEventsForDate = (date) =>
    events.filter(e => eventOnDate(e, date));

  // ── Events for selected day ──────────────────────────────────────────────────
  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  // ── CRUD ─────────────────────────────────────────────────────────────────────
  const openCreate = (date = null) => {
    setForm({
      ...EMPTY_FORM,
      startDate: date ? date.toISOString().slice(0,10) : "",
      endDate:   date ? date.toISOString().slice(0,10) : "",
      academicYear,
    });
    setCreateOpen(true);
  };

  const openEdit = (event) => {
    setForm({
      title:        event.title,
      description:  event.description ?? "",
      eventType:    event.eventType,
      startDate:    event.startDate,
      endDate:      event.endDate,
      academicYear: event.academicYear ?? "",
      published:    event.published,
      isHoliday:    event.isHoliday,
    });
    setEditEvent(event);
  };

  const handleCreate = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await calendarService.create({
        ...form,
        academicYear: form.academicYear || undefined,
      });
      toast.success("Event added!");
      setCreateOpen(false); loadEvents();
    } catch (err) { toast.error(err?.response?.data?.message ?? "Error"); }
    finally { setSaving(false); }
  };

  const handleEdit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await calendarService.update(editEvent.id, {
        ...form, academicYear: form.academicYear || undefined,
      });
      toast.success("Event updated!");
      setEditEvent(null); loadEvents();
    } catch (err) { toast.error(err?.response?.data?.message ?? "Update failed"); }
    finally { setSaving(false); }
  };

  const handleTogglePublish = async (event) => {
    try {
      await calendarService.togglePublish(event.id);
      toast.success(event.published ? "Unpublished." : "Published!");
      loadEvents();
    } catch { toast.error("Failed."); }
  };

  const handleDelete = async () => {
    try {
      await calendarService.delete(deleteTarget.id);
      toast.success("Deleted!"); setDeleteTarget(null); loadEvents();
    } catch { toast.error("Delete failed."); }
  };

  const EventForm = ({ onSubmit, isEdit }) => (
    <form onSubmit={onSubmit} className="space-y-3">
      <Field label="Title">
        <input value={form.title} onChange={e => sf("title", e.target.value)}
          required placeholder="e.g. Diwali Holiday" className={inputCls} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Event Type">
          <select value={form.eventType} onChange={e => sf("eventType", e.target.value)} className={inputCls}>
            {EVENT_TYPES.map(t => (
              <option key={t} value={t}>
                {EVENT_TYPE_CONFIG[t].emoji} {EVENT_TYPE_CONFIG[t].label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Academic Year (optional)">
          <select value={form.academicYear} onChange={e => sf("academicYear", e.target.value)} className={inputCls}>
            <option value="">All Years</option>
            {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </Field>
        <Field label="Start Date">
          <input type="date" value={form.startDate}
            onChange={e => { sf("startDate", e.target.value); if (!form.endDate) sf("endDate", e.target.value); }}
            required className={inputCls} />
        </Field>
        <Field label="End Date">
          <input type="date" value={form.endDate}
            onChange={e => sf("endDate", e.target.value)} required
            min={form.startDate} className={inputCls} />
        </Field>
      </div>
      <Field label="Description (optional)">
        <textarea value={form.description} onChange={e => sf("description", e.target.value)}
          rows={2} placeholder="Brief description..." className={inputCls} />
      </Field>
      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
          <input type="checkbox" checked={form.published}
            onChange={e => sf("published", e.target.checked)}
            className="w-4 h-4 rounded accent-indigo-500" />
          Publish (visible to all)
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
          <input type="checkbox" checked={form.isHoliday}
            onChange={e => sf("isHoliday", e.target.checked)}
            className="w-4 h-4 rounded accent-red-500" />
          Mark as Holiday
        </label>
      </div>
      <button type="submit" disabled={saving}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
        {saving && <Loader2 size={14} className="animate-spin" />}
        {isEdit ? "Update Event" : "Add Event"}
      </button>
    </form>
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Academic Calendar</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {events.filter(e => e.isHoliday).length} holidays · {events.length} total events this month
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select value={academicYear} onChange={e => setAcademicYear(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none">
            <option value="">All Years</option>
            {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {canManage && (
            <button onClick={() => openCreate()}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg">
              <Plus size={15} /> Add Event
            </button>
          )}
        </div>
      </div>

      {/* Event type legend */}
      <div className="flex flex-wrap gap-2">
        {EVENT_TYPES.map(t => (
          <span key={t} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${EVENT_TYPE_CONFIG[t].bg}`}>
            <span>{EVENT_TYPE_CONFIG[t].emoji}</span> {EVENT_TYPE_CONFIG[t].label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Main Calendar ── */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">

          {/* Month navigation */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <button onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
              <ChevronLeft size={18} />
            </button>
            <div className="text-center">
              <h2 className="text-base font-bold text-slate-800">
                {MONTH_NAMES[viewMonth - 1]} {viewYear}
              </h2>
              {(viewYear !== now.getFullYear() || viewMonth !== now.getMonth() + 1) && (
                <button onClick={goToday} className="text-xs text-indigo-600 hover:underline mt-0.5">
                  Back to Today
                </button>
              )}
            </div>
            <button onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-slate-100">
            {DAY_NAMES_SHORT.map(d => (
              <div key={d} className={`py-2 text-center text-xs font-semibold ${d === "Sun" ? "text-red-500" : "text-slate-500"}`}>
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          {loading ? (
            <div className="flex items-center justify-center h-64 text-slate-400">
              <Loader2 size={24} className="animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-7">
              {grid.map((cell, idx) => {
                const cellEvents  = getEventsForDate(cell.date);
                const isTodayDate = isToday(cell.date);
                const isSelected  = selectedDate
                  && cell.date.toDateString() === selectedDate.toDateString();
                const isSunday    = cell.date.getDay() === 0;
                const hasHoliday  = cellEvents.some(e => e.isHoliday);

                return (
                  <motion.div
                    key={idx}
                    whileHover={{ scale: cell.current ? 1.02 : 1 }}
                    onClick={() => cell.current && setSelectedDate(
                      isSelected ? null : cell.date
                    )}
                    className={[
                      "min-h-[80px] border-b border-r border-slate-100 p-1.5 transition-colors",
                      cell.current ? "cursor-pointer hover:bg-indigo-50/40" : "opacity-35",
                      isSelected  ? "bg-indigo-50 ring-2 ring-inset ring-indigo-400" : "",
                      hasHoliday  ? "bg-red-50/30" : "",
                    ].join(" ")}>
                    {/* Date number */}
                    <div className="flex items-center justify-between mb-1">
                      <span className={[
                        "flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium",
                        isTodayDate ? "bg-indigo-600 text-white" :
                        isSunday   ? "text-red-500" : "text-slate-700",
                      ].join(" ")}>
                        {cell.date.getDate()}
                      </span>
                      {cell.current && canManage && (
                        <button
                          onClick={e => { e.stopPropagation(); openCreate(cell.date); }}
                          className="opacity-0 group-hover:opacity-100 hover:opacity-100 p-0.5 rounded text-slate-400 hover:text-indigo-600 transition-all">
                          <Plus size={11} />
                        </button>
                      )}
                    </div>

                    {/* Event dots/chips */}
                    <div className="space-y-0.5">
                      {cellEvents.slice(0, 3).map((event, i) => (
                        <div key={i}
                          className="flex items-center gap-1 px-1 py-0.5 rounded text-[10px] font-medium leading-tight truncate"
                          style={{ backgroundColor: event.color + "22", color: event.color }}>
                          <EventDot color={event.color} />
                          <span className="truncate">{event.title}</span>
                        </div>
                      ))}
                      {cellEvents.length > 3 && (
                        <div className="text-[10px] text-slate-400 px-1">
                          +{cellEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Right Panel ── */}
        <div className="space-y-4">

          {/* Selected Day Events */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
              <p className="text-sm font-semibold text-slate-800">
                {selectedDate
                  ? selectedDate.toLocaleDateString("en-IN", { weekday:"long", day:"2-digit", month:"long" })
                  : "Select a date"}
              </p>
              {selectedDate && canManage && (
                <button onClick={() => openCreate(selectedDate)}
                  className="text-xs text-indigo-600 hover:underline mt-0.5">
                  + Add event on this day
                </button>
              )}
            </div>

            {!selectedDate ? (
              <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
                Calendar mein koi date click karo
              </div>
            ) : selectedDateEvents.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
                Koi event nahi hai
              </div>
            ) : (
              <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
                {selectedDateEvents.map(event => (
                  <div key={event.id} className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <span className="text-lg flex-shrink-0">{event.emoji}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 leading-tight">{event.title}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{event.eventTypeDisplay}</p>
                          {event.multiDay && (
                            <p className="text-xs text-slate-400">
                              {new Date(event.startDate).toLocaleDateString("en-IN", { day:"2-digit", month:"short" })} –{" "}
                              {new Date(event.endDate).toLocaleDateString("en-IN", { day:"2-digit", month:"short" })}
                              {" "}({event.durationDays} days)
                            </p>
                          )}
                          {event.description && (
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{event.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1.5">
                            {event.isHoliday && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-600 rounded-full font-medium">
                                Holiday
                              </span>
                            )}
                            {!event.published && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                                Draft
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      {canManage && (
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => handleTogglePublish(event)}
                            className="p-1 rounded hover:bg-slate-100 text-slate-400"
                            title={event.published ? "Unpublish" : "Publish"}>
                            {event.published ? <EyeOff size={13}/> : <Eye size={13}/>}
                          </button>
                          <button onClick={() => openEdit(event)}
                            className="px-2 py-0.5 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-600 rounded">
                            Edit
                          </button>
                          <button onClick={() => setDeleteTarget(event)}
                            className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600">
                            <Trash2 size={13}/>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Events */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
              <p className="text-sm font-semibold text-slate-800">This Month's Events</p>
            </div>
            {events.length === 0 ? (
              <div className="flex items-center justify-center h-24 text-slate-400 text-xs">
                Koi event nahi
              </div>
            ) : (
              <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
                {events.map(event => {
                  const start = new Date(event.startDate);
                  const isPast = new Date(event.endDate) < new Date();
                  return (
                    <div
                      key={event.id}
                      className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors ${isPast ? "opacity-50" : ""}`}
                      onClick={() => setSelectedDate(start)}>
                      <div className="w-1 h-10 rounded-full flex-shrink-0"
                        style={{ backgroundColor: event.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-800 truncate">{event.title}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {start.toLocaleDateString("en-IN", { day:"2-digit", month:"short" })}
                          {event.multiDay && ` – ${new Date(event.endDate).toLocaleDateString("en-IN", { day:"2-digit", month:"short" })}`}
                        </p>
                      </div>
                      <span className="text-[10px]">{event.emoji}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Modal */}
      <Modal open={createOpen} title="Add Calendar Event" onClose={() => setCreateOpen(false)}>
        <EventForm onSubmit={handleCreate} isEdit={false} />
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editEvent} title="Edit Event" onClose={() => setEditEvent(null)}>
        <EventForm onSubmit={handleEdit} isEdit={true} />
      </Modal>

      {/* Delete Modal */}
      <Modal open={!!deleteTarget} title="Delete Event" onClose={() => setDeleteTarget(null)}>
        <p className="text-sm text-slate-600 mb-6">
          <span className="font-semibold">"{deleteTarget?.title}"</span> ko permanently delete karna chahte ho?
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
      </Modal>
    </div>
  );
}