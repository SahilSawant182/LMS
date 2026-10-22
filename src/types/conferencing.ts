export interface ZoomSetting {
  name: string;
  account_name: string;
  member: string;
  account_id: string;
  client_id: string;
  enabled: number | boolean;
  is_owner?: boolean;
}

export interface SaveZoomSettingPayload {
  account_name: string;
  account_id: string;
  client_id: string;
  client_secret?: string;
  enabled?: number;
  name?: string;
  test_connection?: number;
}

export interface TestZoomCredentialsPayload {
  account_id: string;
  client_id: string;
  client_secret: string;
}

export interface GoogleMeetStatus {
  configured: boolean;
  enabled: boolean;
  client_id?: string;
  is_admin: boolean;
  frontend_url?: string;
}

export interface GoogleMeetSetting {
  name: string;
  account_name: string;
  member: string;
  member_name?: string;
  member_image?: string | null;
  google_calendar: string;
  enabled: number | boolean;
  is_authorized?: boolean;
  is_owner?: boolean;
}

export interface GoogleMeetAuthUrlResponse {
  auth_url: string;
  account_name: string;
  state: string;
}

export interface ConferencingSettingsResponse {
  zoom: ZoomSetting[];
  google_meet: GoogleMeetSetting[];
}
