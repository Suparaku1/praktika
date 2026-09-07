import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { FEEDBACK_QUESTIONS, PASS_THRESHOLD } from "@/lib/practice/questions";

const CONTRACT_TEMPLATE = `KONTRATË PRAKTIKE PROFESIONALE

1. OBJEKTI
Nxënësi do të kryejë praktikën profesionale pranë biznesit sipas pozicionit të shpallur.

2. KOHËZGJATJA & ORARI
Periudha dhe orët javore përcaktohen nga palët dhe ndiqen nga mësuesi i praktikës.

3. DETYRIMET E PALËVE
Biznesi: ofron mentorim, mjedis të sigurt pune dhe vlerësim përfundimtar.
Nxënësi: respekton orarin, ruan konfidencialitetin dhe ndjek udhëzimet.
Mësuesi i praktikës: ndjek ecurinë dhe përgatit dokumentacionin.

4. PËRFUNDIMI
Në fund të afatit, biznesi plotëson vlerësimin e ecurisë së nxënësit.
`;

function requestOrigin(): string {
  return getRequestHeader("origin") ?? "";
}

/* ------------------------------------------------------------------ */
/* Confirm the winning candidate of a job posting                      */
/* ------------------------------------------------------------------ */

const confirmWinnerSchema = z.object({
  jobId: z.string().uuid(),
  applicationId: z.string().uuid(),
});

export const confirmWinner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.input<typeof confirmWinnerSchema>) => confirmWinnerSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { notifyAndEmailServer } = await import("./notify.server");

    const { data: job, error: jobErr } = await supabase
      .from("jobs")
      .select("id, title, city, deadline, business_id")
      .eq("id", data.jobId)
      .maybeSingle();
    if (jobErr) throw new Error(jobErr.message);
    if (!job) throw new Error("Shpallja nuk u gjet");
    if (job.business_id !== userId) throw new Error("Vetëm biznesi pronar mund të konfirmojë fituesin");

    const { data: existing } = await supabase
      .from("contracts")
      .select("id")
      .eq("job_id", job.id)
      .not("winner_confirmed_at", "is", null)
      .maybeSingle();
    if (existing) throw new Error("Fituesi është konfirmuar tashmë për këtë shpallje");

    const { data: app } = await supabase
      .from("applications")
      .select("id, student_id, job_id")
      .eq("id", data.applicationId)
      .maybeSingle();
    if (!app || app.job_id !== job.id) throw new Error("Aplikimi nuk i përket kësaj shpalljeje");

    const { data: shortlist } = await supabase
      .from("application_shortlists")
      .select("teacher_id")
      .eq("application_id", app.id)
      .maybeSingle();
    if (!shortlist) throw new Error("Kandidati nuk është përzgjedhur nga mësuesi i praktikës");

    const { error: accErr } = await supabase
      .from("applications")
      .update({ status: "accepted", reviewed_at: new Date().toISOString() })
      .eq("id", app.id);
    if (accErr) throw new Error(accErr.message);

    const { data: others } = await supabase
      .from("applications")
      .select("id")
      .eq("job_id", job.id)
      .neq("id", app.id);
    const otherIds = (others ?? []).map((o) => o.id);
    if (otherIds.length) {
      await supabase.from("applications").update({ status: "rejected" }).in("id", otherIds);
    }

    const { data: contract, error: cErr } = await supabase
      .from("contracts")
      .insert({
        business_id: userId,
        student_id: app.student_id,
        job_id: job.id,
        application_id: app.id,
        teacher_id: shortlist.teacher_id,
        title: `Praktikë profesionale — ${job.title}`,
        content: CONTRACT_TEMPLATE,
        location: job.city ?? null,
        end_date: job.deadline ?? null,
        status: "draft",
        winner_confirmed_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (cErr) throw new Error(cErr.message);

    await notifyAndEmailServer(
      supabase,
      [
        {
          user_id: app.student_id,
          type: "winner",
          title: "Urime! Je zgjedhur për praktikën",
          message: `Biznesi të konfirmoi si fitues për "${job.title}".`,
          link: `/contracts/${contract.id}`,
        },
        ...(shortlist.teacher_id
          ? [
              {
                user_id: shortlist.teacher_id,
                type: "winner",
                title: "Fituesi u konfirmua",
                message: `Biznesi konfirmoi fituesin për "${job.title}". Përgatit dokumentacionin.`,
                link: `/contracts/${contract.id}`,
              },
            ]
          : []),
      ],
      requestOrigin(),
    );

    return { contractId: contract.id };
  });

/* ------------------------------------------------------------------ */
/* Issue a certificate manually                                        */
/* ------------------------------------------------------------------ */

const issueCertificateSchema = z.object({
  contractId: z.string().uuid(),
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  hoursCompleted: z.number().int().min(0).max(10000).optional().nullable(),
  finalGrade: z.number().min(1).max(10).optional().nullable(),
  skills: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
});

export const issueCertificate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.input<typeof issueCertificateSchema>) => issueCertificateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { notifyAndEmailServer } = await import("./notify.server");

    const { data: contract } = await supabase
      .from("contracts")
      .select("id, business_id, student_id, teacher_id, title")
      .eq("id", data.contractId)
      .maybeSingle();
    if (!contract) throw new Error("Kontrata nuk u gjet");
    if (contract.business_id !== userId) throw new Error("Vetëm biznesi i kontratës mund të lëshojë certifikatë");

    const { data: dupe } = await supabase
      .from("certificates")
      .select("id")
      .eq("contract_id", contract.id)
      .maybeSingle();
    if (dupe) return { certificateId: dupe.id, alreadyExisted: true };

    const { data: number, error: numErr } = await supabase.rpc("generate_certificate_number");
    if (numErr || !number) throw new Error("Gabim në gjenerimin e numrit të certifikatës");

    const { data: cert, error } = await supabase
      .from("certificates")
      .insert({
        contract_id: contract.id,
        student_id: contract.student_id,
        business_id: contract.business_id,
        teacher_id: contract.teacher_id,
        certificate_number: number,
        title: data.title,
        description: data.description || null,
        hours_completed: data.hoursCompleted ?? null,
        final_grade: data.finalGrade ?? null,
        skills: data.skills?.length ? data.skills : null,
        issued_by: userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    await notifyAndEmailServer(
      supabase,
      [
        {
          user_id: contract.student_id,
          type: "certificate_issued",
          title: "U lëshua certifikatë",
          message: data.title,
          link: `/certificates/${cert.id}`,
        },
      ],
      requestOrigin(),
    );

    return { certificateId: cert.id, alreadyExisted: false };
  });

/* ------------------------------------------------------------------ */
/* Submit the 10-category practice feedback (auto-certification)       */
/* ------------------------------------------------------------------ */

const QUESTION_IDS = FEEDBACK_QUESTIONS.map((q) => q.id) as [string, ...string[]];

const feedbackSchema = z.object({
  contractId: z.string().uuid(),
  answers: z.record(z.enum(QUESTION_IDS), z.boolean()),
  comment: z.string().trim().max(2000).optional().nullable(),
});

export const submitPracticeFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.input<typeof feedbackSchema>) => feedbackSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { notifyAndEmailServer } = await import("./notify.server");

    const { data: contract } = await supabase
      .from("contracts")
      .select("id, business_id, student_id, teacher_id, title")
      .eq("id", data.contractId)
      .maybeSingle();
    if (!contract) throw new Error("Kontrata nuk u gjet");
    if (contract.business_id !== userId) throw new Error("Vetëm biznesi mund të plotësojë vlerësimin");

    const { data: already } = await supabase
      .from("practice_feedback")
      .select("id")
      .eq("contract_id", contract.id)
      .maybeSingle();
    if (already) throw new Error("Vlerësimi është dorëzuar tashmë");

    // Score is computed server-side — the client cannot influence it.
    const answers = data.answers as Record<string, boolean>;
    const score = FEEDBACK_QUESTIONS.filter((q) => answers[q.id] === true).length;
    const passed = score >= PASS_THRESHOLD;
    const comment = data.comment?.trim() || null;

    const { data: feedback, error } = await supabase
      .from("practice_feedback")
      .insert({
        contract_id: contract.id,
        student_id: contract.student_id,
        business_id: contract.business_id,
        teacher_id: contract.teacher_id,
        answers: answers as never,
        score,
        passed,
        comment,
        submitted_at: new Date().toISOString(),
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    let certificateId: string | null = null;
    if (passed) {
      const { data: existingCert } = await supabase
        .from("certificates")
        .select("id")
        .eq("contract_id", contract.id)
        .maybeSingle();
      if (existingCert) {
        certificateId = existingCert.id;
      } else {
        const { data: number } = await supabase.rpc("generate_certificate_number");
        if (number) {
          const { data: cert } = await supabase
            .from("certificates")
            .insert({
              contract_id: contract.id,
              student_id: contract.student_id,
              business_id: contract.business_id,
              teacher_id: contract.teacher_id,
              feedback_id: feedback.id,
              certificate_number: number,
              title: `Certifikatë pjesëmarrjeje — ${contract.title}`,
              description: comment,
              final_grade: score,
              issued_by: contract.business_id,
            })
            .select("id")
            .maybeSingle();
          if (cert) certificateId = cert.id;
        }
      }
    }

    const notes = [
      {
        user_id: contract.student_id,
        type: "practice_feedback",
        title: passed ? "Vlerësimi u përfundua — kalove!" : "Vlerësimi u përfundua",
        message: `Rezultati: ${score}/10 për "${contract.title}".`,
        link: `/feedback/${contract.id}`,
      },
      ...(certificateId
        ? [
            {
              user_id: contract.student_id,
              type: "certificate_issued",
              title: "Certifikata u lëshua automatikisht",
              message: `Certifikatë pjesëmarrjeje për "${contract.title}".`,
              link: `/certificates/${certificateId}`,
            },
          ]
        : []),
      ...(contract.teacher_id
        ? [
            {
              user_id: contract.teacher_id,
              type: "practice_feedback",
              title: "Biznesi dërgoi vlerësimin",
              message: `Vlerësimi për "${contract.title}" — ${score}/10.`,
              link: `/feedback/${contract.id}`,
            },
          ]
        : []),
    ];
    await notifyAndEmailServer(supabase, notes, requestOrigin());

    return { feedback, score, passed, certificateId };
  });
