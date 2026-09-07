import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Save, Upload, FileText, X, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { z } from "zod";

type AppRole = "super_admin" | "teacher" | "student" | "business";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profili im · Zemër & Praktikë" },
      { name: "description", content: "Plotëso profilin tënd në Zemër & Praktikë." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Profili im · Zemër & Praktikë" },
      { property: "og:description", content: "Plotëso profilin tënd në Zemër & Praktikë." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

const baseSchema = z.object({
  full_name: z.string().trim().min(2, "Të paktën 2 karaktere").max(120),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
});

const studentSchema = z.object({
  city: z.string().trim().max(80).optional().or(z.literal("")),
  school_name: z.string().trim().max(160).optional().or(z.literal("")),
  professional_program: z.string().trim().max(160).optional().or(z.literal("")),
  study_year: z.string().optional(),
  bio: z.string().trim().max(1000).optional().or(z.literal("")),
  experience: z.string().trim().max(2000).optional().or(z.literal("")),
  education: z.string().trim().max(2000).optional().or(z.literal("")),
  linkedin_url: z.string().trim().url("URL e pavlefshme").optional().or(z.literal("")),
  portfolio_url: z.string().trim().url("URL e pavlefshme").optional().or(z.literal("")),
  looking_for: z.string().trim().max(200).optional().or(z.literal("")),
});

const businessSchema = z.object({
  company_name: z.string().trim().min(2, "Emri i kompanisë është i detyrueshëm").max(160),
  nipt: z.string().trim().max(20).regex(/^[A-Za-z0-9]*$/, "Vetëm shkronja dhe numra").optional().or(z.literal("")),
  sector: z.string().trim().max(120).optional().or(z.literal("")),
  company_size: z.string().trim().max(40).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  website: z.string().trim().url("URL e pavlefshme").optional().or(z.literal("")),
  contact_email: z.string().trim().email("Email i pavlefshëm").optional().or(z.literal("")),
  contact_phone: z.string().trim().max(40).optional().or(z.literal("")),
  founded_year: z.string().optional(),
});

const teacherSchema = z.object({
  school_name: z.string().trim().max(160).optional().or(z.literal("")),
  subject: z.string().trim().max(120).optional().or(z.literal("")),
  years_experience: z.string().optional(),
  work_phone: z.string().trim().max(40).optional().or(z.literal("")),
  bio: z.string().trim().max(1000).optional().or(z.literal("")),
});

function ProfilePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [role, setRole] = useState<AppRole>("student");
  const [base, setBase] = useState({ full_name: "", phone: "", email: "" });

  // Student
  const [student, setStudent] = useState({
    city: "", school_name: "", professional_program: "", study_year: "",
    bio: "", experience: "", education: "", linkedin_url: "", portfolio_url: "", looking_for: "",
    skills: [] as string[], languages: [] as string[], cv_url: "" as string | null,
  });
  const [skillInput, setSkillInput] = useState("");
  const [langInput, setLangInput] = useState("");
  const [cvUploading, setCvUploading] = useState(false);

  // Business
  const [business, setBusiness] = useState({
    company_name: "", nipt: "", sector: "", company_size: "", city: "", address: "",
    description: "", website: "", contact_email: "", contact_phone: "", founded_year: "",
    verified: false,
  });

  // Teacher
  const [teacher, setTeacher] = useState({
    school_name: "", subject: "", years_experience: "", work_phone: "", bio: "",
  });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const [{ data: prof }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("full_name, phone, email").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);

      setBase({
        full_name: prof?.full_name ?? "",
        phone: prof?.phone ?? "",
        email: prof?.email ?? user.email ?? "",
      });

      const priority: AppRole[] = ["super_admin", "teacher", "business", "student"];
      const userRoles = (roles ?? []).map((r) => r.role as AppRole);
      const resolved = priority.find((p) => userRoles.includes(p)) ?? "student";
      setRole(resolved);

      if (resolved === "student") {
        const { data } = await supabase.from("student_profiles").select("*").eq("user_id", user.id).maybeSingle();
        if (data) {
          setStudent({
            city: data.city ?? "", school_name: data.school_name ?? "",
            professional_program: data.professional_program ?? "",
            study_year: data.study_year?.toString() ?? "",
            bio: data.bio ?? "", experience: data.experience ?? "", education: data.education ?? "",
            linkedin_url: data.linkedin_url ?? "", portfolio_url: data.portfolio_url ?? "",
            looking_for: data.looking_for ?? "",
            skills: data.skills ?? [], languages: data.languages ?? [],
            cv_url: data.cv_url ?? null,
          });
        }
      } else if (resolved === "business") {
        const { data } = await supabase.from("business_profiles").select("*").eq("user_id", user.id).maybeSingle();
        if (data) {
          setBusiness({
            company_name: data.company_name ?? "", nipt: data.nipt ?? "",
            sector: data.sector ?? "", company_size: data.company_size ?? "",
            city: data.city ?? "", address: data.address ?? "",
            description: data.description ?? "", website: data.website ?? "",
            contact_email: data.contact_email ?? "", contact_phone: data.contact_phone ?? "",
            founded_year: data.founded_year?.toString() ?? "",
            verified: data.verified ?? false,
          });
        } else {
          setBusiness((b) => ({ ...b, company_name: prof?.full_name ?? "", contact_email: prof?.email ?? user.email ?? "" }));
        }
      } else if (resolved === "teacher") {
        const { data } = await supabase.from("teacher_profiles").select("*").eq("user_id", user.id).maybeSingle();
        if (data) {
          setTeacher({
            school_name: data.school_name ?? "", subject: data.subject ?? "",
            years_experience: data.years_experience?.toString() ?? "",
            work_phone: data.work_phone ?? "", bio: data.bio ?? "",
          });
        }
      }
      setLoading(false);
    })();
  }, []);

  const addChip = (kind: "skills" | "languages", input: string) => {
    const v = input.trim();
    if (!v) return;
    setStudent((s) => ({ ...s, [kind]: Array.from(new Set([...(s[kind] as string[]), v])).slice(0, 30) }));
    if (kind === "skills") setSkillInput("");
    else setLangInput("");
  };

  const removeChip = (kind: "skills" | "languages", value: string) => {
    setStudent((s) => ({ ...s, [kind]: (s[kind] as string[]).filter((v) => v !== value) }));
  };

  const onUploadCV = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Madhësia maksimale: 5 MB");
      return;
    }
    if (!["application/pdf"].includes(file.type)) {
      toast.error("Vetëm skedarë PDF lejohen");
      return;
    }
    setCvUploading(true);
    const path = `${userId}/cv-${Date.now()}.pdf`;
    const { error } = await supabase.storage.from("cvs").upload(path, file, { upsert: true, contentType: "application/pdf" });
    if (error) {
      toast.error("Ngarkimi dështoi: " + error.message);
    } else {
      setStudent((s) => ({ ...s, cv_url: path }));
      toast.success("CV u ngarkua. Ruaj profilin për ta aplikuar.");
    }
    setCvUploading(false);
  };

  const onSave = async () => {
    setSaving(true);
    try {
      const baseParsed = baseSchema.parse({ full_name: base.full_name, phone: base.phone });
      const { error: pe } = await supabase.from("profiles").upsert({
        id: userId, email: base.email,
        full_name: baseParsed.full_name, phone: baseParsed.phone || null,
      });
      if (pe) throw pe;

      if (role === "student") {
        const s = studentSchema.parse(student);
        const { error } = await supabase.from("student_profiles").upsert({
          user_id: userId,
          city: s.city || null,
          school_name: s.school_name || null,
          professional_program: s.professional_program || null,
          study_year: s.study_year ? parseInt(s.study_year, 10) : null,
          bio: s.bio || null,
          experience: s.experience || null,
          education: s.education || null,
          linkedin_url: s.linkedin_url || null,
          portfolio_url: s.portfolio_url || null,
          looking_for: s.looking_for || null,
          skills: student.skills,
          languages: student.languages,
          cv_url: student.cv_url,
        });
        if (error) throw error;
      } else if (role === "business") {
        const b = businessSchema.parse(business);
        const { error } = await supabase.from("business_profiles").upsert({
          user_id: userId,
          company_name: b.company_name,
          nipt: b.nipt || null,
          sector: b.sector || null,
          company_size: b.company_size || null,
          city: b.city || null,
          address: b.address || null,
          description: b.description || null,
          website: b.website || null,
          contact_email: b.contact_email || null,
          contact_phone: b.contact_phone || null,
          founded_year: b.founded_year ? parseInt(b.founded_year, 10) : null,
        });
        if (error) throw error;
      } else if (role === "teacher") {
        const t = teacherSchema.parse(teacher);
        const { error } = await supabase.from("teacher_profiles").upsert({
          user_id: userId,
          school_name: t.school_name || null,
          subject: t.subject || null,
          years_experience: t.years_experience ? parseInt(t.years_experience, 10) : null,
          work_phone: t.work_phone || null,
          bio: t.bio || null,
        });
        if (error) throw error;
      }
      toast.success("Profili u ruajt me sukses");
      navigate({ to: "/dashboard" });
    } catch (err) {
      const msg = err instanceof z.ZodError ? err.issues[0]?.message ?? "Të dhëna të pavlefshme" : (err as Error).message;
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary/30">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="border-b border-border bg-background">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Mbrapa në Dashboard
          </Link>
          <Button onClick={onSave} disabled={saving} size="sm">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Ruaj profilin
          </Button>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl space-y-6 px-4 py-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profili im</h1>
          <p className="mt-1 text-muted-foreground">
            {role === "student" && "Plotëso CV-në tënde që bizneset të të zgjedhin."}
            {role === "business" && "Plotëso të dhënat e biznesit për të krijuar besim."}
            {role === "teacher" && "Profili i mësuesit të praktikës."}
            {role === "super_admin" && "Profili i administratorit."}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Të dhënat bazë</CardTitle>
            <CardDescription>Informacioni i përgjithshëm i llogarisë</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="full_name">Emër Mbiemër *</Label>
              <Input id="full_name" value={base.full_name} onChange={(e) => setBase({ ...base, full_name: e.target.value })} maxLength={120} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={base.email} disabled />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="phone">Telefoni</Label>
              <Input id="phone" value={base.phone} onChange={(e) => setBase({ ...base, phone: e.target.value })} maxLength={40} placeholder="+355 ..." />
            </div>
          </CardContent>
        </Card>

        {role === "student" && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Shkolla dhe Programi</CardTitle>
                <CardDescription>Të dhënat e shkollës profesionale</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Qyteti</Label>
                  <Input value={student.city} onChange={(e) => setStudent({ ...student, city: e.target.value })} maxLength={80} />
                </div>
                <div className="space-y-2">
                  <Label>Viti i studimit</Label>
                  <Input type="number" min="1" max="5" value={student.study_year} onChange={(e) => setStudent({ ...student, study_year: e.target.value })} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Shkolla</Label>
                  <Input value={student.school_name} onChange={(e) => setStudent({ ...student, school_name: e.target.value })} maxLength={160} placeholder="p.sh. SHMP «Hermann Gmeiner»" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Profili profesional</Label>
                  <Input value={student.professional_program} onChange={(e) => setStudent({ ...student, professional_program: e.target.value })} maxLength={160} placeholder="p.sh. TIK, Mekatronikë, Hoteleri" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>CV dhe Aftësi</CardTitle>
                <CardDescription>Tregoju bizneseve çfarë di të bësh</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label>Përshkrim i shkurtër (Bio)</Label>
                  <Textarea value={student.bio} onChange={(e) => setStudent({ ...student, bio: e.target.value })} rows={3} maxLength={1000} placeholder="Kush je dhe çfarë kërkon..." />
                </div>
                <div className="space-y-2">
                  <Label>Aftësi (skills)</Label>
                  <div className="flex gap-2">
                    <Input value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addChip("skills", skillInput); } }} placeholder="p.sh. JavaScript" maxLength={40} />
                    <Button type="button" variant="outline" onClick={() => addChip("skills", skillInput)}>Shto</Button>
                  </div>
                  {student.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {student.skills.map((s) => (
                        <Badge key={s} variant="secondary" className="gap-1">
                          {s}
                          <button type="button" onClick={() => removeChip("skills", s)} className="ml-0.5 hover:text-destructive"><X className="h-3 w-3" /></button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Gjuhët</Label>
                  <div className="flex gap-2">
                    <Input value={langInput} onChange={(e) => setLangInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addChip("languages", langInput); } }} placeholder="p.sh. Anglisht – Mesatare" maxLength={60} />
                    <Button type="button" variant="outline" onClick={() => addChip("languages", langInput)}>Shto</Button>
                  </div>
                  {student.languages.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {student.languages.map((s) => (
                        <Badge key={s} variant="secondary" className="gap-1">
                          {s}
                          <button type="button" onClick={() => removeChip("languages", s)} className="ml-0.5 hover:text-destructive"><X className="h-3 w-3" /></button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>Përvoja</Label>
                  <Textarea value={student.experience} onChange={(e) => setStudent({ ...student, experience: e.target.value })} rows={3} maxLength={2000} placeholder="Praktika, projekte, vullnetarizëm..." />
                </div>
                <div className="space-y-2">
                  <Label>Edukimi</Label>
                  <Textarea value={student.education} onChange={(e) => setStudent({ ...student, education: e.target.value })} rows={3} maxLength={2000} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>LinkedIn</Label>
                    <Input value={student.linkedin_url} onChange={(e) => setStudent({ ...student, linkedin_url: e.target.value })} placeholder="https://linkedin.com/in/..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Portfolio / Website</Label>
                    <Input value={student.portfolio_url} onChange={(e) => setStudent({ ...student, portfolio_url: e.target.value })} placeholder="https://..." />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Çfarë kërkoj</Label>
                  <Input value={student.looking_for} onChange={(e) => setStudent({ ...student, looking_for: e.target.value })} maxLength={200} placeholder="p.sh. Praktikë verore në web development" />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>CV (PDF, max 5MB)</Label>
                  <div className="flex items-center gap-3">
                    <Button type="button" variant="outline" disabled={cvUploading} asChild>
                      <label className="cursor-pointer">
                        {cvUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        Ngarko CV
                        <input type="file" accept="application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadCV(f); }} />
                      </label>
                    </Button>
                    {student.cv_url && (
                      <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        <span>CV e ngarkuar</span>
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {role === "business" && (
          <Card>
            <CardHeader>
              <CardTitle>Të dhënat e biznesit</CardTitle>
              <CardDescription>
                {business.verified
                  ? <span className="inline-flex items-center gap-1 text-primary"><CheckCircle2 className="h-4 w-4" /> Biznes i verifikuar</span>
                  : "Plotëso me kujdes – do verifikohet nga admin."}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Emri i kompanisë *</Label>
                <Input value={business.company_name} onChange={(e) => setBusiness({ ...business, company_name: e.target.value })} maxLength={160} />
              </div>
              <div className="space-y-2">
                <Label>NIPT</Label>
                <Input value={business.nipt} onChange={(e) => setBusiness({ ...business, nipt: e.target.value.toUpperCase() })} maxLength={20} placeholder="p.sh. L12345678A" />
              </div>
              <div className="space-y-2">
                <Label>Sektori</Label>
                <Input value={business.sector} onChange={(e) => setBusiness({ ...business, sector: e.target.value })} maxLength={120} placeholder="p.sh. IT, Turizëm, Ndërtim" />
              </div>
              <div className="space-y-2">
                <Label>Madhësia</Label>
                <Input value={business.company_size} onChange={(e) => setBusiness({ ...business, company_size: e.target.value })} maxLength={40} placeholder="1-10, 11-50, 51-200..." />
              </div>
              <div className="space-y-2">
                <Label>Viti i themelimit</Label>
                <Input type="number" min="1900" max={new Date().getFullYear()} value={business.founded_year} onChange={(e) => setBusiness({ ...business, founded_year: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Qyteti</Label>
                <Input value={business.city} onChange={(e) => setBusiness({ ...business, city: e.target.value })} maxLength={80} />
              </div>
              <div className="space-y-2">
                <Label>Faqja web</Label>
                <Input value={business.website} onChange={(e) => setBusiness({ ...business, website: e.target.value })} placeholder="https://..." />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Adresa</Label>
                <Input value={business.address} onChange={(e) => setBusiness({ ...business, address: e.target.value })} maxLength={200} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Përshkrimi</Label>
                <Textarea value={business.description} onChange={(e) => setBusiness({ ...business, description: e.target.value })} rows={4} maxLength={2000} placeholder="Çfarë bën kompania, kulturës, vlerat..." />
              </div>
              <div className="space-y-2">
                <Label>Email kontakti</Label>
                <Input type="email" value={business.contact_email} onChange={(e) => setBusiness({ ...business, contact_email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Telefoni i kontaktit</Label>
                <Input value={business.contact_phone} onChange={(e) => setBusiness({ ...business, contact_phone: e.target.value })} maxLength={40} />
              </div>
            </CardContent>
          </Card>
        )}

        {role === "teacher" && (
          <Card>
            <CardHeader>
              <CardTitle>Profili i mësuesit</CardTitle>
              <CardDescription>Të dhënat e shkollës dhe lëndës</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Shkolla</Label>
                <Input value={teacher.school_name} onChange={(e) => setTeacher({ ...teacher, school_name: e.target.value })} maxLength={160} />
              </div>
              <div className="space-y-2">
                <Label>Lënda / Profili</Label>
                <Input value={teacher.subject} onChange={(e) => setTeacher({ ...teacher, subject: e.target.value })} maxLength={120} />
              </div>
              <div className="space-y-2">
                <Label>Vite përvojë</Label>
                <Input type="number" min="0" max="60" value={teacher.years_experience} onChange={(e) => setTeacher({ ...teacher, years_experience: e.target.value })} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Telefoni i punës</Label>
                <Input value={teacher.work_phone} onChange={(e) => setTeacher({ ...teacher, work_phone: e.target.value })} maxLength={40} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Përshkrim</Label>
                <Textarea value={teacher.bio} onChange={(e) => setTeacher({ ...teacher, bio: e.target.value })} rows={4} maxLength={1000} />
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end">
          <Button onClick={onSave} disabled={saving} size="lg">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Ruaj profilin
          </Button>
        </div>
      </main>
    </div>
  );
}