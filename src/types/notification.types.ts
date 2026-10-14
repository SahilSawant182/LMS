export interface FromUserDetails {
  full_name: string;
  user_image: string | null;
  username: string;
}

export interface LMSNotification {
  name: string;
  subject: string;
  email_content?: string;
  document_type: string;
  document_name?: string;
  from_user: string;
  type: string;
  read: number; // 0 = unread, 1 = read
  link?: string | null;
  creation: string;
  from_user_details?: FromUserDetails;
}

export interface NotificationPagination {
  page: number;
  page_size: number;
  total: number;
  unread_count: number;
  total_pages: number;
}

export interface GetNotificationsResponse {
  notifications: LMSNotification[];
  pagination: NotificationPagination;
}

export interface GetNotificationsParams {
  page?: number;
  page_size?: number;
  unread_only?: boolean | number;
}

export interface MarkNotificationReadResponse {
  success: boolean;
  name: string;
}

export interface MarkAllNotificationsReadResponse {
  success: boolean;
  marked_count: number;
}
