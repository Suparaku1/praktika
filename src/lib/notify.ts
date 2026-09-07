import { supabase } from "@/integrations/supabase/client";
import { sendEmail } from "@/lib/email/send.functions";

export type AppNotification = {
  user_id: string;
  type: string;
  title: string;
  message?: string | null;
  link?: string | null;
};

/**
 * Inserts in-app notifications and mirrors each one as an email to the
 * recipient. Email failures never block the in-app notification.
 */
export async function notifyAndEmail(notes: AppNotification[]) {
  if (notes.length === 0) return;
  const { error } = await supabase.from("notifications").insert(notes);
  if (error) console.error("[notify] insert failed", error.message);

  try {
    const ids = Array.from(new Set(notes.map((n) => n.user_id)));
    const { data: profiles } = await supabase.from("profiles").select("id, email").in("id", ids);
    const emails = new Map((profiles ?? []).map((p) => [p.id, p.email]));
    const origin = typeof window !== "undefined" ? window.location.origin : "";

    await Promise.all(
      notes.map(async (n) => {
        const to = emails.get(n.user_id);
        if (!to) return;
        await sendEmail({
          data: {
            to,
            template: {
              kind: "generic",
              title: n.title,
              message: n.message ?? "",
              ...(n.link ? { ctaLabel: "Hape në platformë", ctaUrl: `${origin}${n.link}` } : {}),
            },
          },
        });
      }),
    );
  } catch (err) {
    console.error("[notify] email failed", err);
  }
}