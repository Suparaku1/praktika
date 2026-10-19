import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { sendEmailNow } from "@/lib/email/send.server";

export type ServerNotification = {
  user_id: string;
  type: string;
  title: string;
  message?: string | null;
  link?: string | null;
};

/**
 * Server-side notification fan-out: inserts in-app notifications with the
 * service client (after the caller was authorised) and mirrors each as an email. Failures are
 * logged, never thrown — notifications must not break the workflow.
 */
export async function notifyAndEmailServer(
  supabase: SupabaseClient<Database>,
  notes: ServerNotification[],
  origin: string,
) {
  if (!notes.length) return;
  // Callers have already authorised the action; recipients are other users, so
  // the insert must bypass the caller's RLS (users may only insert their own rows).
  void supabase;
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const { error } = await db.from("notifications").insert(notes);
  if (error) console.error("[notify] insert failed", error.message);

  try {
    const ids = Array.from(new Set(notes.map((n) => n.user_id)));
    const { data: profiles } = await db.from("profiles").select("id, email").in("id", ids);
    const emails = new Map((profiles ?? []).map((p) => [p.id, p.email]));
    await Promise.all(
      notes.map(async (n) => {
        const to = emails.get(n.user_id);
        if (!to) return;
        await sendEmailNow(to, {
          kind: "generic",
          title: n.title,
          message: n.message ?? "",
          ...(n.link ? { ctaLabel: "Hape në platformë", ctaUrl: `${origin}${n.link}` } : {}),
        });
      }),
    );
  } catch (err) {
    console.error("[notify] email failed", err);
  }
}
