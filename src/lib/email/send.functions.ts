import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { EmailTemplate } from "./templates";

const inputSchema = z.object({
  to: z.string().email(),
  template: z.any(),
});

export const sendEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { to: string; template: EmailTemplate }) => inputSchema.parse(d))
  .handler(async ({ data }) => {
    // Only signed-in users may send, and only to people registered on the platform.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rcpt } = await supabaseAdmin.from("profiles").select("id").ilike("email", data.to).maybeSingle();
    if (!rcpt) return { ok: false, error: "recipient_not_registered" };
    const { sendEmailNow } = await import("./send.server");
    return sendEmailNow(data.to, data.template as EmailTemplate);
  });
