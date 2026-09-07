import { useEffect, useState } from "react";
import { Star, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export function ContractReviews({ contract, userId }: { contract: any; userId: string }) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const revieweeId = userId === contract.business_id ? contract.student_id : contract.business_id;

  const load = async () => {
    const { data } = await supabase.from("reviews").select("*").eq("contract_id", contract.id).order("created_at", { ascending: false });
    setReviews(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [contract.id]);

  if (contract.status !== "completed") return null;

  const mine = reviews.find((r) => r.reviewer_id === userId);

  const submit = async () => {
    setSubmitting(true);
    const { error } = await supabase.from("reviews").insert({
      contract_id: contract.id,
      reviewer_id: userId,
      reviewee_id: revieweeId,
      rating,
      comment: comment || null,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    setComment("");
    toast.success("Faleminderit për vlerësimin!");
    load();
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-base">Vlerësime</CardTitle>
        <CardDescription>Ndani përvojën tuaj nga kjo praktikë.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            {reviews.map((r) => (
              <div key={r.id} className="rounded-md border border-border bg-secondary/30 p-3">
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map((n) => (
                    <Star key={n} className={`h-4 w-4 ${n <= r.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                  ))}
                  <span className="ml-2 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("sq-AL")}</span>
                </div>
                {r.comment && <p className="mt-2 text-sm text-foreground/90">{r.comment}</p>}
              </div>
            ))}
            {!mine && (
              <div className="space-y-3 rounded-md border border-dashed border-border p-3">
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map((n) => (
                    <button key={n} type="button" onClick={() => setRating(n)}>
                      <Star className={`h-6 w-6 transition ${n <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                    </button>
                  ))}
                </div>
                <Textarea placeholder="Komenti yt (opsional)" value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
                <Button onClick={submit} disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Dërgo vlerësimin
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}