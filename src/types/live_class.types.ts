export type LiveClassStatus = 'upcoming' | 'live' | 'ended';

export interface LMSLiveClass {
  name: string;
  title: string;
  description?: string;
  batch_name: string;
  batch_title?: string;
  course_title?: string;
  date: string;              // YYYY-MM-DD
  formatted_date?: string;   // e.g. "Oct 25, 2026"
  time: string;              // HH:mm (24h)
  formatted_time?: string;   // e.g. "03:00 PM"
  duration: number;          // in minutes
  timezone: string;
  conferencing_provider: 'Zoom' | 'Google Meet' | 'Custom';
  host: string;
  host_name?: string;
  host_image?: string | null;
  status: LiveClassStatus;
  is_live: boolean;
  is_upcoming: boolean;
  is_ended: boolean;
  can_join: boolean;         // True if today and class hasn't ended
  join_url: string;
  start_url?: string;        // Present for instructors/admins
  attendees?: number;
  zoom_account?: string;
  google_meet_account?: string;
  meeting_id?: string;
  password?: string;
  auto_recording?: 'No Recording' | 'Local' | 'Cloud';
  invite_status?: '' | 'Retrying' | 'Failed';
  invite_attempts?: number;
  created_by?: string;
  creation?: string;
  modified?: string;
  my_attendance?: LMSLiveClassParticipant | null;
  is_attended?: boolean;
  attendance_duration?: number;
}

export interface LMSLiveClassParticipant {
  name: string;
  live_class?: string;
  member: string; // User email
  member_name: string;
  member_image: string | null;
  member_username?: string;
  joined_at: string;
  left_at: string;
  duration: number; // In minutes
  formatted_joined_at?: string;
  formatted_left_at?: string;
}

export interface EnrolledRosterStudent {
  member: string;
  member_name: string;
  member_image: string | null;
  is_present: boolean;
  participant_name: string | null;
  duration: number;
  joined_at: string | null;
  formatted_joined_at: string | null;
}

export interface LiveClassAttendanceData {
  live_class: string;
  title: string;
  date: string;
  time: string;
  duration: number;
  conferencing_provider: string;
  total_attendees: number;
  total_enrolled: number;
  attendance_rate: number; // e.g. 75.0
  participants: LMSLiveClassParticipant[];
  enrolled_roster: EnrolledRosterStudent[];
  my_attendance: LMSLiveClassParticipant | null;
  is_instructor: boolean;
}

export interface RecordJoinResponse {
  participant: string;
  already_recorded: boolean;
  join_url: string;
  live_class: string;
}

export interface ConferencingSettings {
  zoom_accounts: Array<{
    name: string;
    account_name: string;
    member?: string;
    member_name?: string;
    enabled: number;
  }>;
  google_meet_accounts: Array<{
    name: string;
    account_name: string;
    google_calendar?: string;
    enabled: number;
  }>;
  providers: string[];
}

export interface CreateLiveClassPayload {
  batch_name: string;
  title: string;
  date: string;
  time: string;
  duration: number;
  timezone: string;
  description?: string;
  conferencing_provider?: 'Zoom' | 'Google Meet' | 'Custom';
  zoom_account?: string;
  google_meet_account?: string;
  auto_recording?: 'No Recording' | 'Local' | 'Cloud';
  join_url?: string;
}

export interface UpdateLiveClassPayload {
  name: string;
  title?: string;
  description?: string;
  date?: string;
  time?: string;
  duration?: number;
  timezone?: string;
  auto_recording?: string;
  join_url?: string;
}
