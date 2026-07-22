import api from "./api";
import { currentAcademicYear } from "./courseService";
export { currentAcademicYear };

export const EXAM_STATUS_CONFIG = {
  SCHEDULED: { label: "Scheduled", color: "bg-blue-100   text-blue-700",   dot: "bg-blue-500"   },
  ONGOING:   { label: "Ongoing",   color: "bg-amber-100  text-amber-700",  dot: "bg-amber-500"  },
  COMPLETED: { label: "Completed", color: "bg-green-100  text-green-700",  dot: "bg-green-500"  },
  POSTPONED: { label: "Postponed", color: "bg-orange-100 text-orange-700", dot: "bg-orange-500" },
  CANCELLED: { label: "Cancelled", color: "bg-red-100    text-red-700",    dot: "bg-red-500"    },
};

export const EXAM_TYPE_OPTIONS = [
  { value: "INTERNAL_1", label: "Internal 1"  },
  { value: "INTERNAL_2", label: "Internal 2"  },
  { value: "MID_TERM",   label: "Mid Term"    },
  { value: "END_TERM",   label: "End Term"    },
  { value: "PRACTICAL",  label: "Practical"   },
  { value: "ASSIGNMENT", label: "Assignment"  },
  { value: "PROJECT",    label: "Project"     },
];

export const EXAM_STATUSES = Object.keys(EXAM_STATUS_CONFIG);

export const examService = {
  getAll:       (params = {})      => api.get("/exams",                { params }),
  getForSection:(sectionId, year)  => api.get(`/exams/section/${sectionId}`, { params: { academicYear: year } }),
  getForDate:   (sectionId, date, year) =>
    api.get("/exams/by-date", { params: { sectionId, date, academicYear: year } }),
  create:       (data)             => api.post("/exams",               data),
  update:       (id, data)         => api.put(`/exams/${id}`,          data),
  updateStatus: (id, status)       => api.patch(`/exams/${id}/status`, null, { params: { status } }),
  delete:       (id)               => api.delete(`/exams/${id}`),
  getHallTickets: (sectionId, academicYear, examType) =>
    api.get("/exams/hall-tickets", { params: { sectionId, academicYear, examType } }),
};