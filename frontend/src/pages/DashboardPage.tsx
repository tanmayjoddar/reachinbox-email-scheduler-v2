import { EmailList } from '@/components/emails/EmailList';

export function ScheduledPage() {
  return <EmailList tab="scheduled" />;
}

export function SentPage() {
  return <EmailList tab="sent" />;
}
