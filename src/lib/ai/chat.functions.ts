import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
});

export const askAi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      messages: z.array(MessageSchema).min(1).max(30),
    }),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY mungon");

    const system = {
      role: "system" as const,
      content:
        "Ti je asistenti i platformës 'Zemër & Praktike' — një ERP për praktikat profesionale në Shqipëri që lidh nxënës, mësues dhe biznese. Përgjigju gjithmonë në shqip, shkurt dhe qartë. Ndihmo përdoruesit të kuptojnë si të shpallin punë, aplikojnë, menaxhojnë kontrata, lëshojnë certifikata dhe verifikojnë ato. Kur nuk je i sigurt, sugjero seksionin e duhur (Punët, Aplikimet, Kontratat, Certifikatat, Klasat, Mesazhet).",
    };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [system, ...data.messages],
      }),
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`AI gateway ${res.status}: ${t.slice(0, 200)}`);
    }
    const json: any = await res.json();
    const reply: string =
      json?.choices?.[0]?.message?.content ?? "Më vjen keq, nuk arrita të përgjigjem.";
    return { reply };
  });