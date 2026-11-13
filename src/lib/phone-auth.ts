/** Accounts sign in with a mobile number + password. The auth system needs an email,
 * so each number maps to a fixed private address that never receives mail. */
export const PHONE_RE = /^\+[1-9]\d{7,14}$/;

export function fullPhone(code: string, number: string) {
  const c = code.trim().startsWith("+") ? code.trim() : `+${code.trim()}`;
  return `${c.replace(/[^\d+]/g, "")}${number.replace(/\D/g, "")}`;
}

export function phoneToEmail(phone: string) {
  return `${phone.replace(/\D/g, "")}@phone.luki.app`;
}

/** Wake/night times picked on sign-up, applied once the new account has loaded. */
export const PENDING_SETUP_KEY = "luki-pending-setup";
