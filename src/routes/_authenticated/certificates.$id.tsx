import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Award, ArrowLeft, Loader2, Printer, ShieldCheck, XCircle, Copy, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";
import { downloadCertificatePdf } from "@/lib/export";

export const Route = createFileRoute("/_authenticated/certificates/$id")({
  head: () => ({
    meta: [
      { title: "Certifikata · Zemër & Praktikë" },
      { name: "description", content: "Shiko dhe printo certifikatën e praktikës profesionale." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Certifikata · Zemër & Praktikë" },
      { property: "og:description", content: "Shiko dhe printo certifikatën e praktikës profesionale." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CertificateDetailPage,
});

function CertificateDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [cert, setCert] = useState<any>(null);
  const [parties, setParties] = useState<{ student?: any; business?: any; teacher?: any }>({});
  const [company, setCompany] = useState<any>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
      const { data, error } = await supabase.from("certificates").select("*").eq("id", id).maybeSingle();
      if (error || !data) { toast.error("Certifikata nuk u gjet"); navigate({ to: "/certificates" }); return; }
      setCert(data);
      const ids = [data.student_id, data.business_id, ...(data.teacher_id ? [data.teacher_id] : [])];
      const { data: profs } = await supabase.from("profiles").select("id, full_name, email, organization").in("id", ids);
      const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
      setParties({
        student: map.get(data.student_id),
        business: map.get(data.business_id),
        teacher: data.teacher_id ? map.get(data.teacher_id) : undefined,
      });
      const { data: bp } = await supabase
        .from("business_profiles")
        .select("company_name, logo_url, city")
        .eq("user_id", data.business_id)
        .maybeSingle();
      if (bp) {
        setCompany(bp);
        if (bp.logo_url) {
          if (/^https?:\/\//.test(bp.logo_url)) setLogoUrl(bp.logo_url);
          else {
            const { data: signed } = await supabase.storage.from("logos").createSignedUrl(bp.logo_url, 3600);
            if (signed?.signedUrl) setLogoUrl(signed.signedUrl);
          }
        }
      }
      // Fallback: RLS may hide other parties' profiles — use the public verification view for names.
      const { data: pub } = await supabase.rpc("verify_certificate", { _number: data.certificate_number });
      const v = (pub as any[])?.[0];
      if (v) {
        setParties((prev) => ({
          student: prev.student ?? { full_name: v.student_name },
          business: prev.business ?? { full_name: v.company_name, organization: v.company_name },
          teacher: prev.teacher ?? (v.teacher_name ? { full_name: v.teacher_name } : undefined),
        }));
        if (!bp && v.company_name) setCompany({ company_name: v.company_name });
      }
      setLoading(false);
    })();
  }, [id, navigate]);

  if (loading || !cert) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const verifyUrl = `${window.location.origin}/verify/${cert.certificate_number}`;
  const canRevoke = userId === cert.issued_by && !cert.revoked_at;

  const handleDownloadPdf = () => {
    const canvas = document.getElementById("cert-qr-canvas") as HTMLCanvasElement | null;
    downloadCertificatePdf({
      title: cert.title,
      studentName: parties.student?.full_name || parties.student?.email || "—",
      companyName: company?.company_name || parties.business?.organization || parties.business?.full_name || "—",
      description: cert.description,
      hours: cert.hours_completed,
      grade: cert.final_grade,
      issuedAt: cert.issued_at,
      number: cert.certificate_number,
      skills: cert.skills,
      businessSigner: parties.business?.full_name || parties.business?.email,
      teacherSigner: parties.teacher?.full_name || parties.teacher?.email,
      verifyUrl,
      qrDataUrl: canvas ? canvas.toDataURL("image/png") : null,
      revokedAt: cert.revoked_at,
    });
    toast.success("Certifikata u shkarkua si PDF");
  };

  const revoke = async () => {
    const reason = prompt("Arsyeja e anulimit?");
    if (!reason) return;
    const { error } = await supabase.from("certificates").update({ revoked_at: new Date().toISOString(), revoked_reason: reason }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Certifikata u anulua");
    setCert({ ...cert, revoked_at: new Date().toISOString(), revoked_reason: reason });
  };

  return (
    <div className="min-h-screen bg-secondary/30 print:bg-white">
      <main className="container mx-auto max-w-4xl px-4 py-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link to="/certificates" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Certifikatat
          </Link>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(verifyUrl); toast.success("Linku u kopjua"); }}>
              <Copy className="h-4 w-4" /> Kopjo linkun
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4" /> Printo</Button>
            <Button size="sm" onClick={handleDownloadPdf}><Download className="h-4 w-4" /> Shkarko PDF</Button>
            {canRevoke && <Button size="sm" variant="ghost" className="text-destructive" onClick={revoke}><XCircle className="h-4 w-4" /> Anulo</Button>}
          </div>
        </div>

        <Card className="overflow-hidden border-2 border-primary/20 shadow-[var(--shadow-elegant)] print:border-primary print:shadow-none">
          <div className="bg-gradient-to-br from-primary to-primary/70 p-1" />
          <CardContent className="p-10 sm:p-14">
            <div className="text-center">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={`Logo e ${company?.company_name ?? "biznesit"}`}
                  className="mx-auto h-16 w-auto max-w-[180px] object-contain"
                />
              ) : (
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Award className="h-8 w-8" />
                </div>
              )}
              <div className="mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Certifikatë e Përfundimit të Praktikës</div>
              <h1 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">{cert.title}</h1>
              {cert.revoked_at ? (
                <Badge variant="destructive" className="mt-4 gap-1"><XCircle className="h-3 w-3" /> E anuluar</Badge>
              ) : (
                <Badge className="mt-4 gap-1"><ShieldCheck className="h-3 w-3" /> E vlefshme</Badge>
              )}
            </div>

            <div className="my-10 text-center text-base leading-relaxed text-foreground/90">
              <p>Kjo certifikatë i jepet</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{parties.student?.full_name || parties.student?.email}</p>
              <p className="mt-4">për përfundimin me sukses të praktikës profesionale pranë</p>
              <p className="mt-2 text-xl font-semibold text-primary">
                {company?.company_name || parties.business?.organization || parties.business?.full_name}
              </p>
            </div>

            {cert.description && (
              <p className="mb-8 text-center text-sm italic text-muted-foreground">{cert.description}</p>
            )}

            <div className="grid grid-cols-2 gap-6 border-t border-border pt-6 text-center sm:grid-cols-4">
              {cert.hours_completed != null && <Stat label="Orë" value={String(cert.hours_completed)} />}
              {cert.final_grade != null && <Stat label="Notë" value={String(cert.final_grade)} />}
              <Stat label="Lëshuar" value={new Date(cert.issued_at).toLocaleDateString("sq-AL")} />
              <Stat label="Numri" value={cert.certificate_number} mono />
            </div>

            {cert.skills && cert.skills.length > 0 && (
              <div className="mt-8">
                <div className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">Aftësitë e fituara</div>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {cert.skills.map((s: string) => <Badge key={s} variant="secondary">{s}</Badge>)}
                </div>
              </div>
            )}

            <div className="mt-10 grid gap-8 border-t border-border pt-8 sm:grid-cols-2">
              <div className="text-center">
                <div className="mx-auto h-px w-40 bg-border" />
                <div className="mt-2 text-sm font-semibold">{parties.business?.full_name || parties.business?.email || "—"}</div>
                <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  Administratori · {company?.company_name || parties.business?.organization || "Biznesi"}
                </div>
              </div>
              <div className="text-center">
                <div className="mx-auto h-px w-40 bg-border" />
                <div className="mt-2 text-sm font-semibold">{parties.teacher?.full_name || parties.teacher?.email || "—"}</div>
                <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Mësuesi i praktikës</div>
              </div>
            </div>

            <div className="mt-10 border-t border-border pt-6 text-center text-xs text-muted-foreground">
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-6">
                <div className="rounded-lg bg-white p-2 ring-1 ring-border">
                  <QRCodeSVG value={verifyUrl} size={96} level="M" />
                  <div className="hidden">
                    <QRCodeCanvas id="cert-qr-canvas" value={verifyUrl} size={256} level="M" />
                  </div>
                </div>
                <div className="text-center sm:text-left">
                  <div>Skano për të verifikuar</div>
                  <div className="mt-1 font-mono text-foreground break-all">{verifyUrl}</div>
                </div>
              </div>
            </div>

            {cert.revoked_at && (
              <div className="mt-6 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-center text-sm text-destructive">
                Anuluar më {new Date(cert.revoked_at).toLocaleDateString("sq-AL")} — {cert.revoked_reason}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`mt-1 text-sm font-semibold ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}