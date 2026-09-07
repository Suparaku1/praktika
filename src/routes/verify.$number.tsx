import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Award, Loader2, ShieldCheck, ShieldX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";

export const Route = createFileRoute("/verify/$number")({
  component: VerifyPage,
  head: ({ params }) => ({
    meta: [
      { title: `Verifiko certifikatën ${params.number} — Zemër & Praktike` },
      { name: "description", content: "Verifiko autenticitetin e një certifikate praktike të lëshuar nëpërmjet platformës." },
    ],
  }),
});

function VerifyPage() {
  const { number } = Route.useParams();
  const [loading, setLoading] = useState(true);
  const [cert, setCert] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("verify_certificate", { _number: number });
      setCert((data as any[])?.[0] ?? null);
      setLoading(false);
    })();
  }, [number]);

  return (
    <div className="min-h-screen bg-secondary/30">
      <main className="container mx-auto max-w-2xl px-4 py-16">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="mt-3 text-2xl font-bold">Verifikim i certifikatës</h1>
          <p className="mt-1 text-sm text-muted-foreground font-mono">{number}</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : !cert ? (
          <Card>
            <CardContent className="py-10 text-center">
              <ShieldX className="mx-auto h-10 w-10 text-destructive" />
              <p className="mt-3 font-semibold">Certifikata nuk u gjet</p>
              <p className="mt-1 text-sm text-muted-foreground">Numri i certifikatës është i pavlefshëm ose është anuluar.</p>
              <Button asChild variant="outline" className="mt-6"><Link to="/">Kthehu në faqen kryesore</Link></Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Award className="h-5 w-5" /></div>
              {cert.revoked_at ? (
                <Badge variant="destructive" className="mx-auto mt-3 w-fit">E anuluar</Badge>
              ) : (
                <Badge className="mx-auto mt-3 w-fit gap-1"><ShieldCheck className="h-3 w-3" /> E vlefshme</Badge>
              )}
              <CardTitle className="mt-3 text-xl">{cert.title}</CardTitle>
              <CardDescription>Lëshuar më {new Date(cert.issued_at).toLocaleDateString("sq-AL")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Nxënësi" value={cert.student_name || "—"} />
              <Row label="Biznesi" value={cert.company_name || "—"} />
              {cert.teacher_name && <Row label="Mësuesi i praktikës" value={cert.teacher_name} />}
              {cert.hours_completed != null && <Row label="Orë" value={String(cert.hours_completed)} />}
              {cert.final_grade != null && <Row label="Notë" value={String(cert.final_grade)} />}
              {cert.skills?.length > 0 && (
                <Row label="Aftësitë" value={cert.skills.join(", ")} />
              )}
              {cert.revoked_at && <Row label="Arsye anulimi" value={cert.revoked_reason ?? "—"} />}
              <div className="flex justify-center pt-4">
                <div className="rounded-lg bg-white p-3 ring-1 ring-border">
                  <QRCodeSVG value={`${typeof window !== "undefined" ? window.location.origin : ""}/verify/${number}`} size={128} level="M" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border/60 pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}