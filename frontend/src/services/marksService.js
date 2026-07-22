import api from "./api";
import { currentAcademicYear } from "./courseService";
export { currentAcademicYear };

export const EXAM_TYPES = [
  { value: "INTERNAL_1", label: "Internal 1",  defaultMax: 30  },
  { value: "INTERNAL_2", label: "Internal 2",  defaultMax: 30  },
  { value: "MID_TERM",   label: "Mid Term",    defaultMax: 50  },
  { value: "END_TERM",   label: "End Term",    defaultMax: 100 },
  { value: "PRACTICAL",  label: "Practical",   defaultMax: 50  },
  { value: "ASSIGNMENT", label: "Assignment",  defaultMax: 20  },
  { value: "PROJECT",    label: "Project",     defaultMax: 50  },
];

export const GRADE_COLORS = {
  O:    "bg-emerald-100 text-emerald-700",
  "A+": "bg-green-100  text-green-700",
  A:    "bg-blue-100   text-blue-700",
  "B+": "bg-indigo-100 text-indigo-700",
  B:    "bg-violet-100 text-violet-700",
  C:    "bg-amber-100  text-amber-700",
  D:    "bg-orange-100 text-orange-700",
  F:    "bg-red-100    text-red-700",
};

export const RESULT_COLORS = {
  PASS:       "bg-green-100  text-green-700",
  FAIL:       "bg-red-100    text-red-700",
  INCOMPLETE: "bg-amber-100  text-amber-700",
};

export const marksService = {
  // Components
  getComponents:     (sectionId, academicYear) =>
    api.get("/marks/components", { params: { sectionId, academicYear } }),
  getForSubject:     (sectionId, subjectId, academicYear) =>
    api.get("/marks/components/subject", { params: { sectionId, subjectId, academicYear } }),
  createComponent:   (data) => api.post("/marks/components", data),
  togglePublish:     (id)   => api.patch(`/marks/components/${id}/toggle-publish`),
  deleteComponent:   (id)   => api.delete(`/marks/components/${id}`),

  // Marks
  getMarks:   (componentId) => api.get(`/marks/components/${componentId}/marks`),
  enterMarks: (data)        => api.post("/marks/enter", data),

  // Result
  getResult: (sectionId, academicYear) =>
    api.get("/marks/result", { params: { sectionId, academicYear } }),


  getPendingExams:     (sectionId, academicYear) =>
    api.get("/marks/pending-exams", { params: { sectionId, academicYear } }),
  createFromExam:      (examScheduleId, weightage = 0) =>
    api.post(`/marks/components/from-exam/${examScheduleId}`, null, { params: { weightage } }),
};