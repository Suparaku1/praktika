import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("job_published"), jobId: z.string().uuid() }),
  z.object({ kind: z.literal("application_submitted"), applicationId: z.string().uuid() }),
  z.object({ kind: z.literal("application_status"), applicationId: z.string().uuid() }),
  z.object({ kind: z.literal("contract_status"), contractId: z.string().uuid() }),
  z.object({ kind: z.literal("evaluation_added"), evaluationId: z.string().uuid() }),
]);

const CSTATUS: Record<string, string> = {
  draft: "Draft", sent: "Dërguar për nënshkrim", signed_student: "Nënshkruar nga nxënësi",
  signed_business: "Nënshkruar nga biznesi", active: "Aktive", completed: "Përfunduar", cancelled: "Anuluar",
};

const STATUS: Record<string, string> = {
  pending: "Në pritje", reviewing: "Në shqyrtim", accepted: "Pranuar", rejected: "Refuzuar", withdrawn: "Tërhequr",
};

type Note = { user_id: string; type: string; title: string; message: string; link: string };

/** Notifies every involved party (in-app + Gmail) about a workflow event. Verifies the caller first. */
export const notifyEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.input<typeof schema>) => schema.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { sendEmailNow } = await import("@/lib/email/send.server");
    const origin = getRequestHeader("origin") ?? "";
    const notes: Note[] = [];

    const roleUsers = async (roles: string[]) => {
      const { data: r } = await db.from("user_roles").select("user_id, role").in("role", roles as never);
      return Array.from(new Set((r ?? []).map((x) => x.user_id)));
    };
    const name = async (id: string) =>
      (await db.from("profiles").select("full_name").eq("id", id).maybeSingle()).data?.full_name || "Një përdorues";

    if (data.kind === "job_published") {
      const { data: job } = await db.from("jobs").select("id, title, business_id, status").eq("id", data.jobId).maybeSingle();
      if (!job || job.business_id !== userId || job.status !== "published") return { sent: 0 };
      const biz = await name(job.business_id);
      const link = `/jobs/${job.id}`;
      notes.push({ user_id: job.business_id, type: "job_published", title: "Shpallja u publikua", message: `"${job.title}" është tani publike.`, link });
      for (const u of await roleUsers(["teacher"])) {
        if (u === job.business_id) continue;
        notes.push({ user_id: u, type: "job_published", title: "Shpallje e re praktike", message: `${biz} publikoi "${job.title}".`, link });
      }
    } else if (data.kind === "contract_status") {
      const { data: c } = await db.from("contracts").select("id, title, status, student_id, business_id, teacher_id").eq("id", data.contractId).maybeSingle();
      if (!c || ![c.student_id, c.business_id, c.teacher_id].includes(userId)) return { sent: 0 };
      const label = CSTATUS[c.status] ?? c.status;
      const link = `/contracts/${c.id}`;
      for (const u of [c.student_id, c.business_id, c.teacher_id]) {
        if (!u) continue;
        notes.push({ user_id: u, type: "contract", title: `Kontrata: ${label}`, message: `Kontrata "${c.title}" tani është: ${label}.`, link });
      }
    } else if (data.kind === "evaluation_added") {
      const { data: e } = await db.from("practice_evaluations").select("id, score, student_id, teacher_id, contract_id").eq("id", data.evaluationId).maybeSingle();
      if (!e || e.teacher_id !== userId) return { sent: 0 };
      notes.push({ user_id: e.student_id, type: "evaluation", title: "Vlerësim i ri nga mësuesi", message: `Mësuesi shtoi një vlerësim periodik${e.score != null ? ` — nota ${e.score}/10` : ""}.`, link: "/history" });
      if (e.contract_id) {
        const { data: c } = await db.from("contracts").select("business_id").eq("id", e.contract_id).maybeSingle();
        if (c) notes.push({ user_id: c.business_id, type: "evaluation", title: "Vlerësim periodik i nxënësit", message: `${await name(e.student_id)} mori një vlerësim nga mësuesi.`, link: `/contracts/${e.contract_id}` });
      }
    } else {
      const { data: app } = await db.from("applications").select("id, status, student_id, job_id").eq("id", data.applicationId).maybeSingle();
      if (!app) return { sent: 0 };
      const { data: job } = await db.from("jobs").select("id, title, business_id").eq("id", app.job_id).maybeSingle();
      if (!job) return { sent: 0 };
      const student = await name(app.student_id);
      const teachers = await roleUsers(["teacher"]);
      if (data.kind === "application_submitted") {
        if (app.student_id !== userId) return { sent: 0 };
        notes.push({ user_id: app.student_id, type: "application", title: "Aplikimi u dërgua", message: `Aplikimi yt për "${job.title}" u regjistrua.`, link: "/applications" });
        notes.push({ user_id: job.business_id, type: "new_application", title: "Aplikim i ri", message: `${student} aplikoi për "${job.title}".`, link: "/applications" });
        for (const t of teachers) notes.push({ user_id: t, type: "new_application", title: "Aplikim i ri nga nxënësi", message: `${student} aplikoi për "${job.title}".`, link: `/shortlist/${job.id}` });
      } else {
        if (job.business_id !== userId && app.student_id !== userId) return { sent: 0 };
        const label = STATUS[app.status] ?? app.status;
        notes.push({ user_id: app.student_id, type: "application_status", title: `Aplikimi: ${label}`, message: `Aplikimi yt për "${job.title}" tani është: ${label}.`, link: "/applications" });
        notes.push({ user_id: job.business_id, type: "application_status", title: `Statusi u ndryshua: ${label}`, message: `${student} — "${job.title}".`, link: "/applications" });
        if (app.status === "accepted")
          for (const t of teachers) notes.push({ user_id: t, type: "application_status", title: "Nxënës i pranuar", message: `${student} u pranua për "${job.title}".`, link: "/applications" });
      }
    }

    if (!notes.length) return { sent: 0 };
    await db.from("notifications").insert(notes);
    const ids = Array.from(new Set(notes.map((n) => n.user_id)));
    const { data: profiles } = await db.from("profiles").select("id, email").in("id", ids);
    const emails = new Map((profiles ?? []).map((p) => [p.id, p.email]));
    let sent = 0;
    for (const n of notes) {
      const to = emails.get(n.user_id);
      if (!to) continue;
      const r = await sendEmailNow(to, { kind: "generic", title: n.title, message: n.message, ctaLabel: "Hape në platformë", ctaUrl: `${origin}${n.link}` });
      if (r.ok) sent++;
    }
    return { sent };
  });
