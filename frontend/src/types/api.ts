export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export type EmailStatus = 'scheduled' | 'processing' | 'sent' | 'failed';

export interface EmailItem {
  id: string;
  recipient: string;
  subject: string;
  body?: string;
  status: EmailStatus;
  scheduledAt: string;
  sentAt: string | null;
  senderEmail: string;
  isStarred?: boolean;
  createdAt?: string;
}

export interface EmailPage {
  items: EmailItem[];
  page: number;
  limit: number;
  total: number;
}

export interface ScheduleInput {
  subject: string;
  body: string;
  recipients: string[];
  startTime: string;
  delayBetweenMs: number;
  hourlyLimit: number;
}

export interface ScheduleResult {
  batchId: string;
  total: number;
  firstSendAt: string;
  lastSendAt: string;
}

export interface SlackStatus {
  connected: boolean;
  team: string | null;
  channel: string | null;
}
