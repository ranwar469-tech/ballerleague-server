import { Resend } from 'resend';
import { EmailSubscription } from '../models/email-subscription.model.js';

let resendClient = null;

function getResendClient() {
  if (resendClient) {
    return resendClient;
  }

  if (!process.env.RESEND_API_KEY) {
    return null;
  }

  resendClient = new Resend(process.env.RESEND_API_KEY);
  return resendClient;
}

function formatKickoff(isoValue) {
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) {
    return 'TBD';
  }

  return date.toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function toMatchSummary(match) {
  return {
    matchup: `${match.home_team_name || 'Home Team'} vs ${match.away_team_name || 'Away Team'}`,
    kickoff: formatKickoff(match.kickoff_at),
    venue: match.venue || 'Venue TBA',
    status: match.status || 'scheduled'
  };
}

async function listSubscribedEmails() {
  const rows = await EmailSubscription.find({ subscribed: true }, { _id: 0, email: 1 }).lean();
  return rows.map((row) => row.email).filter(Boolean);
}

async function sendMatchUpdateEmail({ subject, summary, reason }) {
  const resend = getResendClient();
  const from = process.env.EMAIL_FROM;

  if (!resend || !from) {
    return { sent: false, skipped: true };
  }

  const to = await listSubscribedEmails();
  if (to.length === 0) {
    return { sent: false, skipped: true };
  }

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
      <h2 style="margin: 0 0 12px;">Baller League Match Update</h2>
      <p style="margin: 0 0 12px;">${reason}</p>
      <ul style="margin: 0; padding-left: 18px;">
        <li><strong>Match:</strong> ${summary.matchup}</li>
        <li><strong>Kickoff:</strong> ${summary.kickoff}</li>
        <li><strong>Venue:</strong> ${summary.venue}</li>
        <li><strong>Status:</strong> ${summary.status}</li>
      </ul>
    </div>
  `;

  const text = [
    'Baller League Match Update',
    reason,
    `Match: ${summary.matchup}`,
    `Kickoff: ${summary.kickoff}`,
    `Venue: ${summary.venue}`,
    `Status: ${summary.status}`
  ].join('\n');

  await resend.emails.send({
    from,
    to,
    subject,
    html,
    text
  });

  return { sent: true };
}

async function trySend(payload) {
  try {
    await sendMatchUpdateEmail(payload);
  } catch (error) {
    // Notification failures should not block match operations.
    console.error('Failed to send match notification email', error);
  }
}

export async function notifyMatchCreated(match) {
  const summary = toMatchSummary(match);
  return trySend({
    subject: `New Match Added: ${summary.matchup}`,
    summary,
    reason: 'A new match has been created in the schedule.'
  });
}

export async function notifyMatchUpdated(match) {
  const summary = toMatchSummary(match);
  return trySend({
    subject: `Match Updated: ${summary.matchup}`,
    summary,
    reason: 'A match date/time or venue has been updated.'
  });
}

export async function notifyMatchDeleted(match) {
  const summary = toMatchSummary(match);
  return trySend({
    subject: `Match Deleted: ${summary.matchup}`,
    summary,
    reason: 'A scheduled match has been removed from the fixture list.'
  });
}
