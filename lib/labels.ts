import type { Channel, ScamType } from "./types";

export const SCAM_TYPE_LABEL: Record<ScamType, string> = {
  kyc: "Fake KYC update",
  "upi-collect": "UPI “receive money” trick",
  "fake-care": "Fake customer care",
  "digital-arrest": "“Digital arrest” call",
  electricity: "Power cut threat",
  "job-task": "Job and task scam",
  "parcel-fee": "Parcel fee scam",
  lottery: "Lottery and prize",
  "screen-share": "Screen-sharing app",
  "otp-request": "OTP request",
  investment: "Fake investment group",
  genuine: "Genuine messages",
};

export const CHANNEL_LABEL: Record<Channel, string> = {
  sms: "SMS",
  whatsapp: "WhatsApp",
  upi: "UPI request",
  email: "Email",
  call: "Phone call",
};

/** Indian digit grouping: 125000 → "1,25,000". */
export function formatRupees(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}
