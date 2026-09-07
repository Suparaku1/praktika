import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const schema = z.object({
  title: z.string().min(3, "Të paktën 3 karaktere").max(120),
  description: z.string().min(30, "Të paktën 30 karaktere"),
  job_type: z.enum(["internship", "apprenticeship", "full_time", "part_time"]),
  work_mode: z.enum(["onsite", "hybrid", "remote"]),
  category: z.string().max(80).optional().or(z.literal("")),
  city: z.string().max(80).optional().or(z.literal("")),
  requirements: z.string().optional().or(z.literal("")),
  benefits: z.string().optional().or(z.literal("")),
  positions: z.coerce.number().int().min(1).max(100),
  salary_min: z.coerce.number().nonnegative().optional().or(z.nan()),
  salary_max: z.coerce.number().nonnegative().optional().or(z.nan()),
  deadline: z.string().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

export const Route = createFileRoute("/_authenticated/jobs/new")({
  head: () => ({
    meta: [
      { title: "Shpallje e re · Zemër & Praktikë" },
      { name: "description", content: "Publiko një pozicion pune ose praktike për nxënësit." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Shpallje e re · Zemër & Praktikë" },
      { property: "og:description", content: "Publiko një pozicion pune ose praktike për nxënësit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NewJobPage,
});

function NewJobPage() {
  const navigate = useNavigate();
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [saving, setSaving] = useState<"draft" | "publish" | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      job_type: "internship",
      work_mode: "onsite",
      category: "",
      city: "",
      requirements: "",
      benefits: "",
      positions: 1,
    },
  });

  const addSkill = () => {
    const v = skillInput.trim();
    if (v && !skills.includes(v) && skills.length < 15) {
      setSkills([...skills, v]);
      setSkillInput("");
    }
  };

  const submit = async (values: FormValues, status: "draft" | "published") => {
    setSaving(status === "published" ? "publish" : "draft");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      business_id: user.id,
      title: values.title,
      description: values.description,
      job_type: values.job_type,
      work_mode: values.work_mode,
      category: values.category || null,
      city: values.city || null,
      requirements: values.requirements || null,
      benefits: values.benefits || null,
      positions: values.positions,
      salary_min: Number.isFinite(values.salary_min as number) ? values.salary_min : null,
      salary_max: Number.isFinite(values.salary_max as number) ? values.salary_max : null,
      deadline: values.deadline || null,
      skills,
      status,
    };

    const { data, error } = await supabase.from("jobs").insert(payload).select("id").single();
    setSaving(null);
    if (error) {
      toast.error("Dështoi ruajtja: " + error.message);
      return;
    }
    toast.success(status === "published" ? "Shpallja u publikua!" : "Shpallja u ruajt si draft");
    navigate({ to: "/jobs/$id", params: { id: data.id } });
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <main className="container mx-auto max-w-3xl px-4 py-10">
        <Link to="/dashboard" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Krijo një shpallje të re</CardTitle>
            <CardDescription>Publiko një praktikë ose punë për nxënësit e shkollave profesionale.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form className="space-y-6" onSubmit={form.handleSubmit((v) => submit(v, "published"))}>
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titulli *</FormLabel>
                    <FormControl><Input {...field} placeholder="p.sh. Praktikë në marketing dixhital" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField control={form.control} name="job_type" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipi *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="internship">Praktikë</SelectItem>
                          <SelectItem value="apprenticeship">Mësim në punë</SelectItem>
                          <SelectItem value="full_time">Kohë e plotë</SelectItem>
                          <SelectItem value="part_time">Kohë e pjesshme</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="work_mode" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Modaliteti *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="onsite">Në vend</SelectItem>
                          <SelectItem value="hybrid">Hibrid</SelectItem>
                          <SelectItem value="remote">Remote</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem><FormLabel>Kategoria</FormLabel><FormControl><Input {...field} placeholder="p.sh. IT, Mekanikë, Turizëm" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="city" render={({ field }) => (
                    <FormItem><FormLabel>Qyteti</FormLabel><FormControl><Input {...field} placeholder="Tiranë" /></FormControl></FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Përshkrimi *</FormLabel>
                    <FormControl><Textarea rows={6} {...field} placeholder="Çfarë do të bëjë nxënësi, çfarë do mësojë, struktura e ditës..." /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="requirements" render={({ field }) => (
                  <FormItem><FormLabel>Kërkesat</FormLabel><FormControl><Textarea rows={4} {...field} placeholder="Kërkesa minimale, profile të preferuara, gjuhë..." /></FormControl></FormItem>
                )} />

                <FormField control={form.control} name="benefits" render={({ field }) => (
                  <FormItem><FormLabel>Përfitimet</FormLabel><FormControl><Textarea rows={3} {...field} placeholder="Trajnime, mentorim, mundësi punësimi pas praktikës..." /></FormControl></FormItem>
                )} />

                <div>
                  <Label>Aftësitë</Label>
                  <p className="text-sm text-muted-foreground">Shto deri në 15 aftësi. Shtyp Enter për të shtuar.</p>
                  <div className="mt-2 flex gap-2">
                    <Input
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                      placeholder="p.sh. Excel, Photoshop, Komunikim"
                    />
                    <Button type="button" variant="outline" onClick={addSkill}>Shto</Button>
                  </div>
                  {skills.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {skills.map((s) => (
                        <Badge key={s} variant="secondary" className="gap-1">
                          {s}
                          <button type="button" onClick={() => setSkills(skills.filter((x) => x !== s))}><X className="h-3 w-3" /></button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <FormField control={form.control} name="positions" render={({ field }) => (
                    <FormItem><FormLabel>Pozicione</FormLabel><FormControl><Input type="number" min={1} {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="salary_min" render={({ field }) => (
                    <FormItem><FormLabel>Paga min (ALL)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="salary_max" render={({ field }) => (
                    <FormItem><FormLabel>Paga max (ALL)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="deadline" render={({ field }) => (
                  <FormItem><FormLabel>Afati i aplikimit</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
                )} />

                <div className="flex flex-wrap justify-end gap-2 border-t pt-6">
                  <Button type="button" variant="outline" disabled={saving !== null} onClick={form.handleSubmit((v) => submit(v, "draft"))}>
                    {saving === "draft" && <Loader2 className="h-4 w-4 animate-spin" />} Ruaj si draft
                  </Button>
                  <Button type="submit" disabled={saving !== null}>
                    {saving === "publish" && <Loader2 className="h-4 w-4 animate-spin" />} Publiko
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}