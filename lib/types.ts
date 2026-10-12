export type Channel = "sms" | "whatsapp" | "upi" | "email" | "call";

export type ScamType =
  | "kyc"
  | "upi-collect"
  | "fake-care"
  | "digital-arrest"
  | "electricity"
  | "job-task"
  | "parcel-fee"
  | "lottery"
  | "screen-share"
  | "otp-request"
  | "investment"
  | "genuine";

/** 1 = easy, 2 = medium, 3 = hard */
export type Difficulty = 1 | 2 | 3;

export type Locale = "en" | "hi";

/**
 * A highlighted part of the message. `text` must appear verbatim in the
 * scenario body (checked by a unit test). For scams these are red flags;
 * for genuine messages they are the reasons it is safe.
 */
export interface Flag {
  text: string;
  why: string;
}

export interface Scenario {
  id: string;
  channel: Channel;
  isScam: boolean;
  scamType: ScamType;
  difficulty: Difficulty;
  /** Who it appears to come from: a sender ID, a contact name or a number. */
  sender: string;
  /** Optional note about the sender, shown at reveal. */
  senderNote?: string;
  /** Email only. */
  subject?: string;
  /** UPI only, in rupees. */
  amount?: number;
  /**
   * The message itself. Conventions per channel:
   * - sms / whatsapp: blank line (\n\n) separates bubbles
   * - call: one line per turn, starting "Caller:" or "You:"
   * - upi: the note attached to the request
   */
  body: string;
  flags: Flag[];
  takeaway: string;
}

export interface Answer {
  id: string;
  scamType: ScamType;
  isScam: boolean;
  /** What the player chose; null when the timer ran out. */
  choseScam: boolean | null;
  correct: boolean;
  /** Milliseconds the player took. */
  ms: number;
  points: number;
}

export type Mode = "daily" | "practice";
