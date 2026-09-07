const BRAND = "Praktika";
const PRIMARY = "#2563eb";

function layout(title: string, bodyHtml: string, cta?: { label: string; url: string }) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f7fb;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
        <tr><td style="background:${PRIMARY};padding:20px 28px;color:#ffffff;font-size:18px;font-weight:700;">${BRAND}</td></tr>
        <tr><td style="padding:28px;">
          <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;">${title}</h1>
          <div style="font-size:15px;line-height:1.6;color:#334155;">${bodyHtml}</div>
          ${cta ? `<div style="margin-top:24px;"><a href="${cta.url}" style="display:inline-block;background:${PRIMARY};color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">${cta.label}</a></div>` : ""}
        </td></tr>
        <tr><td style="padding:20px 28px;border-top:1px solid #e5e7eb;font-size:12px;color:#64748b;">Ky email u dërgua nga ${BRAND}. Nëse nuk e prisnit, mund ta injoroni.</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export type EmailTemplate =
  | { kind: "welcome"; name: string }
  | { kind: "application_status"; jobTitle: string; status: string; appUrl: string }
  | { kind: "certificate_issued"; title: string; certUrl: string }
  | { kind: "new_application"; jobTitle: string; studentName: string; appUrl: string }
  | { kind: "generic"; title: string; message: string; ctaLabel?: string; ctaUrl?: string };

const STATUS_LABEL: Record<string, string> = {
  pending: "Në pritje",
  reviewing: "Në shqyrtim",
  accepted: "Pranuar",
  rejected: "Refuzuar",
  withdrawn: "Tërhequr",
};

export function renderTemplate(t: EmailTemplate): { subject: string; html: string } {
  switch (t.kind) {
    case "welcome":
      return {
        subject: `Mirë se erdhe në ${BRAND}!`,
        html: layout(`Mirë se erdhe, ${t.name}!`, `<p>Faleminderit që iu bashkove ${BRAND}. Tani mund të zbulosh praktikat, të aplikosh dhe të menaxhosh kontratat tua.</p>`),
      };
    case "application_status":
      return {
        subject: `Statusi i aplikimit: ${STATUS_LABEL[t.status] ?? t.status}`,
        html: layout(
          `Aplikimi yt u përditësua`,
          `<p>Aplikimi yt për <strong>${t.jobTitle}</strong> tani është: <strong>${STATUS_LABEL[t.status] ?? t.status}</strong>.</p>`,
          { label: "Shiko aplikimin", url: t.appUrl },
        ),
      };
    case "certificate_issued":
      return {
        subject: `Të është lëshuar një certifikatë`,
        html: layout(
          `Urime! Të është lëshuar një certifikatë`,
          `<p><strong>${t.title}</strong></p><p>Mund ta shikosh, shkarkosh dhe verifikosh në çdo kohë.</p>`,
          { label: "Shiko certifikatën", url: t.certUrl },
        ),
      };
    case "new_application":
      return {
        subject: `Aplikim i ri për ${t.jobTitle}`,
        html: layout(
          `Ke marrë një aplikim të ri`,
          `<p><strong>${t.studentName}</strong> aplikoi për <strong>${t.jobTitle}</strong>.</p>`,
          { label: "Shiko aplikimin", url: t.appUrl },
        ),
      };
    case "generic":
      return {
        subject: t.title,
        html: layout(
          t.title,
          `<p>${t.message}</p>`,
          t.ctaUrl ? { label: t.ctaLabel ?? "Hape në platformë", url: t.ctaUrl } : undefined,
        ),
      };
  }
}