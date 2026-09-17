export interface ErpAuthPayload {
  erpId: string;
  erpPassword?: string;
  name: string;
}

export interface ErpAuthResponse {
  account?: string;
  id?: number | string;
  key: string;
  name?: string;
  message?: string;
}

export interface ApiKeyItem {
  id: string;
  name: string;
  prefix: string;
  created_at: string;
  status: "active" | "revoked" | "ACTIVE" | "REVOKED";
  lastChars?: string;
  /** Real backend key ID from api.handlebid.lol — present only after a backend sync. */
  backendId?: string;
  /** SHA-256 of the raw secret — lets us update our own Supabase row without the secret. */
  keyHash?: string;
}

/** One stored live secret. Raw secret at rest — owner-RLS only. See migration. */
export interface KeySecretRow {
  key_hash: string;
  raw_key: string;
  user_id: string;
  created_at?: string;
}

export interface StudentAttendance {
  present: number;
  absent: number;
  total: number;
  percentage: number;
  status: "safe" | "warning" | "critical";
  safe_margin_bunks?: number;
}

export interface TodayClass {
  time: string;
  subject: string;
  room: string;
  instructor?: string;
}

export interface TodaySchedule {
  date: string;
  total_sessions?: number;
  classes: TodayClass[];
}

export interface TimetableResponse {
  semester: number;
  section: string;
  week: Record<string, string[]>;
}

export interface StudentMarks {
  records: Array<{
    subject: string;
    midsem: number;
    max: number;
    grade: string;
  }>;
}

export interface NoticeItem {
  id: string;
  title: string;
  date: string;
  tag?: string;
}

export interface StudentProfile {
  name: string;
  roll_number: string;
  degree: string;
  batch: string;
  semester: number;
  email: string;
  academic_advisor?: string;
}
