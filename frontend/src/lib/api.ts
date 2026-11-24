import type { User, EmailPage, EmailItem, ScheduleInput, ScheduleResult, SlackStatus } from '@/types/api';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: 'same-origin', ...init });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText })) as Record<string, unknown>;
    throw new ApiError(res.status, (body.message ?? body.error ?? res.statusText) as string);
  }
  return res.json() as Promise<T>;
}

function post<T>(url: string, body: unknown): Promise<T> {
  return request<T>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function fetchMe(): Promise<User> {
  return request<User>('/api/me');
}

export function logout(): Promise<void> {
  return request('/auth/logout', { method: 'POST' });
}

export function fetchEmails(status: 'scheduled' | 'sent', page: number, limit = 20): Promise<EmailPage> {
  return request<EmailPage>(`/api/emails?status=${status}&page=${page}&limit=${limit}`);
}

export function searchEmails(q: string, status?: 'scheduled' | 'sent'): Promise<{ items: EmailItem[] }> {
  const params = new URLSearchParams({ q });
  if (status) params.set('status', status);
  return request<{ items: EmailItem[] }>(`/api/emails/search?${params}`);
}

export function scheduleEmails(input: ScheduleInput): Promise<ScheduleResult> {
  return post<ScheduleResult>('/api/emails/schedule', input);
}

export function fetchSlackStatus(): Promise<SlackStatus> {
  return request<SlackStatus>('/api/slack/status');
}

export function connectSlack(): Promise<{ url: string }> {
  return request<{ url: string }>('/api/slack/connect');
}

export function disconnectSlack(): Promise<void> {
  return request('/api/slack', { method: 'DELETE' });
}
