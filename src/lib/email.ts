import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM ?? "Dienstplan <onboarding@resend.dev>";

/** true, wenn E-Mail-Versand konfiguriert ist. */
export const emailConfigured = Boolean(apiKey);

type SendResult =
  | { ok: true }
  | { ok: false; skipped: true }
  | { ok: false; error: string };

async function sendMail(
  to: string,
  subject: string,
  html: string,
  text: string,
): Promise<SendResult> {
  if (!apiKey) return { ok: false, skipped: true };
  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({ from, to, subject, html, text });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unbekannt" };
  }
}

export function sendInviteEmail(params: {
  to: string;
  name: string;
  url: string;
}): Promise<SendResult> {
  const { to, name, url } = params;
  const subject = "Dein Zugang zum Dienstplan";
  const text = `Hallo ${name},

du wurdest zum Dienstplan eingeladen. Über diesen Link legst du dein Passwort fest:
${url}

Der Link ist 7 Tage gültig.`;
  const html = `<p>Hallo ${escapeHtml(name)},</p>
<p>du wurdest zum Dienstplan eingeladen. Über diesen Link legst du dein Passwort fest:</p>
<p><a href="${url}">${url}</a></p>
<p>Der Link ist 7 Tage gültig.</p>`;
  return sendMail(to, subject, html, text);
}

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c] as string,
  );
}
