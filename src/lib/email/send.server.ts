import { renderTemplate, type EmailTemplate } from "./templates";

const SENDER_NAME = "Praktika — Shkolla Teknike Elektrike \"Gjergj Canco\"";
const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";

function toBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function buildRawEmail(from: string, to: string, subject: string, html: string): string {
  const encodedSubject = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
  const lines = [
    `From: ${SENDER_NAME} <${from}>`,
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    html,
  ];
  return toBase64Url(lines.join("\r\n"));
}

export type SendEmailResult = { ok: boolean; id?: string; error?: string };

/** Server-only Gmail sender. Never throws — email failures must not break workflows. */
export async function sendEmailNow(to: string, template: EmailTemplate): Promise<SendEmailResult> {
  const lovableKey = process.env['LOVABLE_API_KEY'];
  const gmailKey = process.env['GOOGLE_MAIL_API_KEY'];
  if (!lovableKey || !gmailKey) {
    console.error("[email] LOVABLE_API_KEY or GOOGLE_MAIL_API_KEY not configured");
    return { ok: false, error: "not_configured" };
  }
  const { subject, html } = renderTemplate(template);
  try {
    const profileRes = await fetch(`${GATEWAY_URL}/users/me/profile`, {
      headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": gmailKey },
    });
    if (!profileRes.ok) {
      console.error(`[email] gmail profile ${profileRes.status}: ${await profileRes.text()}`);
      return { ok: false, error: `profile_http_${profileRes.status}` };
    }
    const profile = (await profileRes.json()) as { emailAddress?: string };
    const from = profile.emailAddress;
    if (!from) return { ok: false, error: "no_sender_address" };

    const raw = buildRawEmail(from, to, subject, html);
    const res = await fetch(`${GATEWAY_URL}/users/me/messages/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": gmailKey,
      },
      body: JSON.stringify({ raw }),
    });
    if (!res.ok) {
      console.error(`[email] gmail send ${res.status}: ${await res.text()}`);
      return { ok: false, error: `http_${res.status}` };
    }
    const json = (await res.json()) as { id?: string };
    return { ok: true, ...(json.id ? { id: json.id } : {}) };
  } catch (err) {
    console.error("[email] send failed", err);
    return { ok: false, error: "exception" };
  }
}
