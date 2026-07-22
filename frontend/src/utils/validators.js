/**
 * @file validators.js
 * @description Centralised, pure-function validation library for Smart Campus ERP.
 *
 * ─── ARCHITECTURE PHILOSOPHY ──────────────────────────────────────────────────
 *
 *   Every validator in this file is a PURE FUNCTION:
 *     - No side effects
 *     - No React imports
 *     - No API calls
 *     - Same input always produces the same output
 *
 *   This makes them trivially unit-testable and usable anywhere:
 *   React components, AuthContext, API middleware, even Node.js scripts.
 *
 * ─── THREE LAYERS OF VALIDATION ──────────────────────────────────────────────
 *
 *   1. PRIMITIVES  — Single-value validators. Return { valid, message }.
 *                    Composable building blocks for everything above them.
 *
 *   2. FIELD RULES — Named rule sets for specific fields (email, phone, etc.).
 *                    Each rule set is an array of primitives in priority order.
 *                    The first failing rule's message is shown to the user.
 *
 *   3. FORM SCHEMAS — Whole-form validators used by React forms.
 *                    Return { errors, isValid } where errors mirrors the
 *                    form's field shape. Plug directly into useState.
 *
 * ─── USAGE EXAMPLES ──────────────────────────────────────────────────────────
 *
 *   // Single field (real-time, on blur)
 *   const result = validateEmail("bad-email");
 *   // → { valid: false, message: "Enter a valid email address." }
 *
 *   // Whole form (on submit)
 *   const { errors, isValid } = validateLoginForm({ email, password });
 *   if (!isValid) { setErrors(errors); return; }
 *
 *   // Custom rule composition
 *   const result = runRules("abc", [required(), minLength(6), noSpaces()]);
 */

// ─── 1. Result Helpers ────────────────────────────────────────────────────────

/**
 * Construct a passing validation result.
 * @returns {{ valid: true, message: null }}
 */
const pass = () => ({ valid: true, message: null });

/**
 * Construct a failing validation result.
 * @param {string} message - User-facing error message.
 * @returns {{ valid: false, message: string }}
 */
const fail = (message) => ({ valid: false, message });

// ─── 2. Primitive Rule Factories ──────────────────────────────────────────────
//
//  Each factory returns a RULE FUNCTION: (value) => { valid, message }
//  Rules are designed to be composed via runRules() below.
//  Keep each rule focused on ONE thing — no multi-responsibility rules.

/**
 * Fail if the value is empty (null, undefined, empty string, whitespace-only).
 *
 * @param {string} [label="This field"] - Field name for the error message.
 * @returns {RuleFn}
 */
export const required = (label = "This field") =>
  (value) => {
    const trimmed = typeof value === "string" ? value.trim() : value;
    return trimmed !== null && trimmed !== undefined && trimmed !== ""
      ? pass()
      : fail(`${label} is required.`);
  };

/**
 * Fail if the string is shorter than `min` characters (after trimming).
 *
 * @param {number} min
 * @param {string} [label="This field"]
 * @returns {RuleFn}
 */
export const minLength = (min, label = "This field") =>
  (value) =>
    String(value ?? "").trim().length >= min
      ? pass()
      : fail(`${label} must be at least ${min} characters.`);

/**
 * Fail if the string is longer than `max` characters.
 *
 * @param {number} max
 * @param {string} [label="This field"]
 * @returns {RuleFn}
 */
export const maxLength = (max, label = "This field") =>
  (value) =>
    String(value ?? "").trim().length <= max
      ? pass()
      : fail(`${label} must be ${max} characters or fewer.`);

/**
 * Fail if the string length is not exactly `len` characters.
 *
 * @param {number} len
 * @param {string} [label="This field"]
 * @returns {RuleFn}
 */
export const exactLength = (len, label = "This field") =>
  (value) =>
    String(value ?? "").trim().length === len
      ? pass()
      : fail(`${label} must be exactly ${len} characters.`);

/**
 * Fail if the value does not match the given regular expression.
 *
 * @param {RegExp} regex
 * @param {string} message - Custom error message (regex errors are rarely self-explanatory).
 * @returns {RuleFn}
 */
export const matches = (regex, message) =>
  (value) =>
    regex.test(String(value ?? ""))
      ? pass()
      : fail(message);

/**
 * Fail if the value does NOT equal `other`.
 * Use for "Confirm Password" fields.
 *
 * @param {*}      other   - The value to compare against.
 * @param {string} message - Custom error message.
 * @returns {RuleFn}
 */
export const equals = (other, message) =>
  (value) =>
    value === other
      ? pass()
      : fail(message);

/**
 * Fail if the numeric value is less than `min`.
 *
 * @param {number} min
 * @param {string} [label="Value"]
 * @returns {RuleFn}
 */
export const minValue = (min, label = "Value") =>
  (value) =>
    Number(value) >= min
      ? pass()
      : fail(`${label} must be at least ${min}.`);

/**
 * Fail if the numeric value is greater than `max`.
 *
 * @param {number} max
 * @param {string} [label="Value"]
 * @returns {RuleFn}
 */
export const maxValue = (max, label = "Value") =>
  (value) =>
    Number(value) <= max
      ? pass()
      : fail(`${label} must be no more than ${max}.`);

/**
 * Fail if the value contains any whitespace characters.
 * Useful for usernames, IDs, roll numbers.
 *
 * @param {string} [label="This field"]
 * @returns {RuleFn}
 */
export const noSpaces = (label = "This field") =>
  (value) =>
    !/\s/.test(String(value ?? ""))
      ? pass()
      : fail(`${label} must not contain spaces.`);

/**
 * Fail if the value is not a valid number (after coercion).
 *
 * @param {string} [label="This field"]
 * @returns {RuleFn}
 */
export const isNumeric = (label = "This field") =>
  (value) =>
    !isNaN(Number(value)) && String(value).trim() !== ""
      ? pass()
      : fail(`${label} must be a number.`);

/**
 * Fail if the value is not a valid integer.
 *
 * @param {string} [label="This field"]
 * @returns {RuleFn}
 */
export const isInteger = (label = "This field") =>
  (value) =>
    Number.isInteger(Number(value))
      ? pass()
      : fail(`${label} must be a whole number.`);

/**
 * Fail if the value is not a positive number (> 0).
 *
 * @param {string} [label="This field"]
 * @returns {RuleFn}
 */
export const isPositive = (label = "This field") =>
  (value) =>
    Number(value) > 0
      ? pass()
      : fail(`${label} must be a positive number.`);

// ─── 3. Rule Runner ───────────────────────────────────────────────────────────

/**
 * Run an ordered array of rule functions against a value.
 * Stops at the FIRST failing rule (short-circuit evaluation) so the user
 * sees one actionable error at a time, not a wall of text.
 *
 * @param {*}        value  - The value to validate.
 * @param {RuleFn[]} rules  - Ordered array of rule functions.
 * @returns {{ valid: boolean, message: string | null }}
 *
 * @example
 * const result = runRules("hi", [required("Name"), minLength(3, "Name")]);
 * // → { valid: false, message: "Name must be at least 3 characters." }
 */
export function runRules(value, rules) {
  for (const rule of rules) {
    const result = rule(value);
    if (!result.valid) return result;
  }
  return pass();
}

// ─── 4. Field-Level Validators ────────────────────────────────────────────────
//
//  These are the named, ready-to-use validators for specific ERP fields.
//  Each runs a curated set of rules and returns { valid, message }.
//  Call these directly in onChange handlers for real-time validation.

/**
 * Validate an email address.
 * Accepts standard addresses including subdomains and + aliases.
 *
 * @param {string} value
 * @returns {{ valid: boolean, message: string | null }}
 *
 * @example
 * validateEmail("admin@smartcampus.edu") // → { valid: true, message: null }
 * validateEmail("not-an-email")          // → { valid: false, message: "Enter a valid email address." }
 */
export function validateEmail(value) {
  return runRules(value, [
    required("Email address"),
    // RFC 5322-inspired regex — strict enough for real email, loose enough
    // for all valid university addresses (subdomain, plus-addressing, etc.)
    matches(
      /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/,
      "Enter a valid email address."
    ),
    maxLength(254, "Email address"), // RFC 5321 maximum
  ]);
}

/**
 * Validate a login password (less strict — just format, not strength).
 * For CREATE password (signup/reset), use validateNewPassword() instead.
 *
 * @param {string} value
 * @returns {{ valid: boolean, message: string | null }}
 */
export function validatePassword(value) {
  return runRules(value, [
    required("Password"),
    minLength(8, "Password"),
    maxLength(128, "Password"), // Prevent DoS via enormous bcrypt input
  ]);
}

/**
 * Validate a NEW password (signup / reset password forms).
 * Enforces the institution's password policy:
 *   - 8–128 characters
 *   - At least one uppercase letter
 *   - At least one lowercase letter
 *   - At least one digit
 *   - At least one special character
 *
 * @param {string} value
 * @returns {{ valid: boolean, message: string | null }}
 */
export function validateNewPassword(value) {
  return runRules(value, [
    required("Password"),
    minLength(8,  "Password"),
    maxLength(128,"Password"),
    matches(/[A-Z]/, "Password must contain at least one uppercase letter."),
    matches(/[a-z]/, "Password must contain at least one lowercase letter."),
    matches(/[0-9]/, "Password must contain at least one number."),
    matches(
      /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
      "Password must contain at least one special character (!@#$%^&* etc.)."
    ),
  ]);
}

/**
 * Validate a "Confirm Password" field against the original password.
 *
 * @param {string} value         - The confirm password field value.
 * @param {string} originalValue - The original password field value.
 * @returns {{ valid: boolean, message: string | null }}
 */
export function validateConfirmPassword(value, originalValue) {
  return runRules(value, [
    required("Confirm password"),
    equals(originalValue, "Passwords do not match."),
  ]);
}

/**
 * Validate a person's full name.
 * Accepts letters, spaces, hyphens, and apostrophes (for names like
 * "Mary-Jane" and "O'Brien").
 *
 * @param {string} value
 * @returns {{ valid: boolean, message: string | null }}
 */
export function validateFullName(value) {
  return runRules(value, [
    required("Full name"),
    minLength(2,  "Full name"),
    maxLength(100,"Full name"),
    matches(
      /^[a-zA-Z\u00C0-\u024F\s'\-\.]+$/,
      "Full name may only contain letters, spaces, hyphens, and apostrophes."
    ),
  ]);
}

/**
 * Validate an Indian mobile number.
 * Accepts 10-digit numbers, optionally prefixed with +91 or 0.
 *
 * @param {string} value
 * @returns {{ valid: boolean, message: string | null }}
 */
export function validatePhone(value) {
  return runRules(value, [
    required("Phone number"),
    matches(
      /^(\+91|0)?[6-9]\d{9}$/,
      "Enter a valid 10-digit Indian mobile number."
    ),
  ]);
}

/**
 * Validate a student/employee roll number or ID.
 * Format: 2-4 uppercase letters followed by 4-8 digits (e.g. "CS2021001").
 * Adjust the regex to match your institution's ID scheme.
 *
 * @param {string} value
 * @returns {{ valid: boolean, message: string | null }}
 */
export function validateRollNumber(value) {
  return runRules(value, [
    required("Roll number"),
    noSpaces("Roll number"),
    matches(
      /^[A-Z]{2,4}\d{4,8}$/,
      "Roll number format must be 2-4 letters followed by 4-8 digits (e.g. CS2021001)."
    ),
  ]);
}

/**
 * Validate a date of birth.
 * Must be a real date, not in the future, and the person must be
 * between 15 and 80 years old.
 *
 * @param {string} value - ISO date string or any Date-parseable string.
 * @returns {{ valid: boolean, message: string | null }}
 */
export function validateDateOfBirth(value) {
  if (!value?.trim()) return fail("Date of birth is required.");

  const date = new Date(value);
  if (isNaN(date.getTime())) return fail("Enter a valid date.");

  const today = new Date();
  if (date > today) return fail("Date of birth cannot be in the future.");

  const age = Math.floor((today - date) / (365.25 * 24 * 60 * 60 * 1000));
  if (age < 15) return fail("Age must be at least 15 years.");
  if (age > 80) return fail("Enter a valid date of birth.");

  return pass();
}

/**
 * Validate an Aadhaar number (12 digits, no spaces).
 * Runs the Verhoeff checksum algorithm used by UIDAI for real validation.
 *
 * @param {string} value
 * @returns {{ valid: boolean, message: string | null }}
 */
export function validateAadhaar(value) {
  const cleaned = String(value ?? "").replace(/\s/g, "");

  const basicCheck = runRules(cleaned, [
    required("Aadhaar number"),
    exactLength(12, "Aadhaar number"),
    matches(/^\d{12}$/, "Aadhaar number must contain exactly 12 digits."),
  ]);
  if (!basicCheck.valid) return basicCheck;

  // Verhoeff algorithm
  return verhoeffCheck(cleaned)
    ? pass()
    : fail("Enter a valid Aadhaar number.");
}

/**
 * Validate a fee amount — must be a positive number with up to 2 decimal places.
 *
 * @param {string|number} value
 * @returns {{ valid: boolean, message: string | null }}
 */
export function validateFeeAmount(value) {
  return runRules(value, [
    required("Amount"),
    isNumeric("Amount"),
    isPositive("Amount"),
    maxValue(1_000_000, "Amount"),
    matches(
      /^\d+(\.\d{1,2})?$/,
      "Amount must have at most 2 decimal places."
    ),
  ]);
}

/**
 * Validate a percentage mark / grade (0–100).
 *
 * @param {string|number} value
 * @returns {{ valid: boolean, message: string | null }}
 */
export function validatePercentage(value) {
  return runRules(value, [
    required("Percentage"),
    isNumeric("Percentage"),
    minValue(0,   "Percentage"),
    maxValue(100, "Percentage"),
  ]);
}

/**
 * Validate a URL (http or https).
 *
 * @param {string} value
 * @param {boolean} [optional=false] - If true, empty value passes.
 * @returns {{ valid: boolean, message: string | null }}
 */
export function validateUrl(value, optional = false) {
  if (optional && !value?.trim()) return pass();
  return runRules(value, [
    required("URL"),
    matches(
      /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/,
      "Enter a valid URL starting with http:// or https://"
    ),
  ]);
}

/**
 * Validate a short title or label (course name, notice title, etc.).
 *
 * @param {string} value
 * @param {string} [label="Title"]
 * @returns {{ valid: boolean, message: string | null }}
 */
export function validateTitle(value, label = "Title") {
  return runRules(value, [
    required(label),
    minLength(3,  label),
    maxLength(150, label),
  ]);
}

/**
 * Validate a longer free-text description or body.
 *
 * @param {string}  value
 * @param {string}  [label="Description"]
 * @param {boolean} [optional=false] - If true, empty value passes.
 * @returns {{ valid: boolean, message: string | null }}
 */
export function validateDescription(value, label = "Description", optional = false) {
  if (optional && !value?.trim()) return pass();
  return runRules(value, [
    required(label),
    minLength(10,  label),
    maxLength(2000, label),
  ]);
}

/**
 * Validate a PIN code (Indian 6-digit postal code).
 *
 * @param {string} value
 * @returns {{ valid: boolean, message: string | null }}
 */
export function validatePinCode(value) {
  return runRules(value, [
    required("PIN code"),
    matches(/^[1-9][0-9]{5}$/, "Enter a valid 6-digit PIN code."),
  ]);
}

// ─── 5. Form Schema Validators ────────────────────────────────────────────────
//
//  These validate an entire form object at once.
//  Used on form submit: const { errors, isValid } = validateLoginForm(formState)
//
//  Return shape:
//  {
//    errors:  { [fieldName]: string | null },  // mirrors your form state shape
//    isValid: boolean,                          // false if any field has an error
//  }

/**
 * Build a standard form validation result from a field-keyed errors object.
 * Cleans up null values and sets isValid.
 *
 * @param {Object} rawErrors - { fieldName: string | null }
 * @returns {{ errors: Object, isValid: boolean }}
 */
function buildFormResult(rawErrors) {
  const errors = {};
  let isValid = true;

  for (const [field, message] of Object.entries(rawErrors)) {
    // Only keep non-null error messages
    errors[field] = message ?? null;
    if (message) isValid = false;
  }

  return { errors, isValid };
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate the Login form.
 *
 * @param {{ email: string, password: string }} form
 * @returns {{ errors: { email: string|null, password: string|null }, isValid: boolean }}
 *
 * @example
 * const { errors, isValid } = validateLoginForm({ email: "x", password: "short" });
 * // errors.email    → "Enter a valid email address."
 * // errors.password → "Password must be at least 8 characters."
 * // isValid         → false
 */
export function validateLoginForm({ email, password }) {
  return buildFormResult({
    email:    validateEmail(email).message,
    password: validatePassword(password).message,
  });
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate the Forgot Password form (email only).
 *
 * @param {{ email: string }} form
 * @returns {{ errors: { email: string|null }, isValid: boolean }}
 */
export function validateForgotPasswordForm({ email }) {
  return buildFormResult({
    email: validateEmail(email).message,
  });
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate the Reset Password form.
 *
 * @param {{ password: string, confirmPassword: string }} form
 * @returns {{ errors: { password: string|null, confirmPassword: string|null }, isValid: boolean }}
 */
export function validateResetPasswordForm({ password, confirmPassword }) {
  return buildFormResult({
    password:        validateNewPassword(password).message,
    confirmPassword: validateConfirmPassword(confirmPassword, password).message,
  });
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate the Sign Up / Registration form.
 *
 * @param {{ name: string, email: string, password: string, confirmPassword: string, phone: string }} form
 * @returns {{ errors: Object, isValid: boolean }}
 */
export function validateSignUpForm({ name, email, password, confirmPassword, phone }) {
  return buildFormResult({
    name:            validateFullName(name).message,
    email:           validateEmail(email).message,
    password:        validateNewPassword(password).message,
    confirmPassword: validateConfirmPassword(confirmPassword, password).message,
    phone:           validatePhone(phone).message,
  });
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate the Student Profile form.
 *
 * @param {Object} form
 * @returns {{ errors: Object, isValid: boolean }}
 */
export function validateStudentProfileForm({ name, email, phone, rollNumber, dateOfBirth }) {
  return buildFormResult({
    name:        validateFullName(name).message,
    email:       validateEmail(email).message,
    phone:       validatePhone(phone).message,
    rollNumber:  validateRollNumber(rollNumber).message,
    dateOfBirth: validateDateOfBirth(dateOfBirth).message,
  });
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate a Change Password form (requires current password verification).
 *
 * @param {{ currentPassword: string, newPassword: string, confirmPassword: string }} form
 * @returns {{ errors: Object, isValid: boolean }}
 */
export function validateChangePasswordForm({ currentPassword, newPassword, confirmPassword }) {
  // New password must be different from the current one
  const sameAsCurrent = newPassword && newPassword === currentPassword
    ? "New password must be different from your current password."
    : null;

  return buildFormResult({
    currentPassword: validatePassword(currentPassword).message,
    newPassword:     sameAsCurrent ?? validateNewPassword(newPassword).message,
    confirmPassword: validateConfirmPassword(confirmPassword, newPassword).message,
  });
}

// ─── 6. Real-time Field Validator ─────────────────────────────────────────────

/**
 * Get the validator function for a named field.
 * Used by Input components for real-time (onChange / onBlur) validation
 * without coupling the component to this file's internals.
 *
 * Usage in a form component:
 *   const error = validateField("email", inputValue);
 *
 * @param {string} fieldName - The field's `name` attribute value.
 * @param {*}      value     - Current field value.
 * @param {Object} [context] - Extra data needed for cross-field rules
 *                             (e.g. { password } for confirmPassword).
 * @returns {string|null} Error message, or null if valid.
 */
export function validateField(fieldName, value, context = {}) {
  const validators = {
    email:           () => validateEmail(value),
    password:        () => validatePassword(value),
    newPassword:     () => validateNewPassword(value),
    confirmPassword: () => validateConfirmPassword(value, context.password ?? ""),
    name:            () => validateFullName(value),
    fullName:        () => validateFullName(value),
    phone:           () => validatePhone(value),
    rollNumber:      () => validateRollNumber(value),
    dateOfBirth:     () => validateDateOfBirth(value),
    amount:          () => validateFeeAmount(value),
    percentage:      () => validatePercentage(value),
    pinCode:         () => validatePinCode(value),
    title:           () => validateTitle(value),
    description:     () => validateDescription(value),
    aadhaar:         () => validateAadhaar(value),
  };

  const fn = validators[fieldName];
  if (!fn) return null; // Unknown field — don't validate (don't block)

  return fn().message;
}

// ─── 7. Password Strength Meter ───────────────────────────────────────────────

/**
 * Calculate a password strength score and label for UI feedback.
 * Used by the signup/reset password forms to show a strength indicator.
 *
 * Score breakdown (0–5):
 *   +1  8+ characters
 *   +1  12+ characters
 *   +1  Lowercase letter
 *   +1  Uppercase letter
 *   +1  Number
 *   +1  Special character
 *
 * @param {string} password
 * @returns {{ score: number, label: string, color: string }}
 *
 * @example
 * getPasswordStrength("Hello1!")
 * // → { score: 3, label: "Fair", color: "text-yellow-500" }
 *
 * getPasswordStrength("C0mpl3x!Pass#2024")
 * // → { score: 5, label: "Strong", color: "text-emerald-500" }
 */
export function getPasswordStrength(password) {
  if (!password) return { score: 0, label: "Too short", color: "text-slate-400" };

  let score = 0;
  if (password.length >= 8)  score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  const levels = [
    { score: 0, label: "Too short",   color: "text-slate-400"  },
    { score: 1, label: "Very weak",   color: "text-red-500"    },
    { score: 2, label: "Weak",        color: "text-orange-500" },
    { score: 3, label: "Fair",        color: "text-yellow-500" },
    { score: 4, label: "Good",        color: "text-blue-500"   },
    { score: 5, label: "Strong",      color: "text-emerald-500"},
    { score: 6, label: "Very strong", color: "text-emerald-600"},
  ];

  return levels[Math.min(score, 6)];
}

// ─── 8. Verhoeff Algorithm (Aadhaar checksum) ─────────────────────────────────

/**
 * Verhoeff checksum validation.
 * Used exclusively by validateAadhaar() — not exported.
 * Reference: https://en.wikipedia.org/wiki/Verhoeff_algorithm
 *
 * @param {string} numStr - String of digits.
 * @returns {boolean} true if the number passes the checksum.
 */
function verhoeffCheck(numStr) {
  // Multiplication table d
  const d = [
    [0,1,2,3,4,5,6,7,8,9],
    [1,2,3,4,0,6,7,8,9,5],
    [2,3,4,0,1,7,8,9,5,6],
    [3,4,0,1,2,8,9,5,6,7],
    [4,0,1,2,3,9,5,6,7,8],
    [5,9,8,7,6,0,4,3,2,1],
    [6,5,9,8,7,1,0,4,3,2],
    [7,6,5,9,8,2,1,0,4,3],
    [8,7,6,5,9,3,2,1,0,4],
    [9,8,7,6,5,4,3,2,1,0],
  ];

  // Permutation table p
  const p = [
    [0,1,2,3,4,5,6,7,8,9],
    [1,5,7,6,2,8,3,0,9,4],
    [5,8,0,3,7,9,6,1,4,2],
    [8,9,1,6,0,4,3,5,2,7],
    [9,4,5,3,1,2,6,8,7,0],
    [4,2,8,6,5,7,3,9,0,1],
    [2,7,9,3,8,0,6,4,1,5],
    [7,0,4,6,9,1,3,2,5,8],
  ];

  // Inverse table inv
  const inv = [0,4,3,2,1,9,8,7,6,5];

  let c = 0;
  const digits = numStr.split("").reverse();

  for (let i = 0; i < digits.length; i++) {
    c = d[c][p[i % 8][parseInt(digits[i], 10)]];
  }

  return inv[c] === 0;
}