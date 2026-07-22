import api from "./api";
import { currentAcademicYear } from "./courseService";
export { currentAcademicYear };

export const FEE_STATUS_CONFIG = {
  PENDING:  { label: "Pending",  color: "bg-amber-100  text-amber-700"  },
  PARTIAL:  { label: "Partial",  color: "bg-blue-100   text-blue-700"   },
  PAID:     { label: "Paid",     color: "bg-green-100  text-green-700"  },
  OVERDUE:  { label: "Overdue",  color: "bg-red-100    text-red-700"    },
  WAIVED:   { label: "Waived",   color: "bg-slate-100  text-slate-500"  },
};

export const PAYMENT_MODES = [
  { value: "CASH",         label: "Cash"           },
  { value: "ONLINE",       label: "Online Transfer" },
  { value: "CHEQUE",       label: "Cheque"          },
  { value: "DEMAND_DRAFT", label: "Demand Draft"    },
  { value: "UPI",          label: "UPI"             },
];

export const FEE_CATEGORIES = [
  "TUITION", "HOSTEL", "EXAM", "LIBRARY",
  "SPORTS", "DEVELOPMENT", "LABORATORY", "TRANSPORT", "MISCELLANEOUS",
];

export const feeService = {
  // Structures
  getStructures:  ()       => api.get("/fees/structures"),
  getStructure:   (id)     => api.get(`/fees/structures/${id}`),
  createStructure:(data)   => api.post("/fees/structures", data),
  deleteStructure:(id)     => api.delete(`/fees/structures/${id}`),

  // Assign
  assignFee: (data) => api.post("/fees/assign", data),

  // Records
  getRecords: (params = {}) => api.get("/fees/records", { params }),
  getRecord:  (id)          => api.get(`/fees/records/${id}`),

  // Payments
  getPayments:   (recordId) => api.get(`/fees/records/${recordId}/payments`),
  recordPayment: (data)     => api.post("/fees/payments", data),
  deletePayment: (id)       => api.delete(`/fees/payments/${id}`),
};