import { useEffect, useState } from "react";
import { Loader2, Paperclip, Upload, Trash2, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Obj = { name: string; created_at: string; metadata: { size?: number } | null };

export function ContractAttachments({ contractId, canEdit }: { contractId: string; canEdit: boolean }) {
  const [items, setItems] = useState<Obj[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    const { data, error } = await supabase.storage.from("contract-documents").list(contractId, {
      limit: 100, sortBy: { column: "created_at", order: "desc" },
    });
    if (error) console.warn(error.message);
    setItems((data ?? []) as Obj[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [contractId]);

  const upload = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) return toast.error("Madhësia maks: 10 MB");
    setUploading(true);
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${contractId}/${Date.now()}-${safe}`;
    const { error } = await supabase.storage.from("contract-documents").upload(path, file, {
      contentType: file.type || "application/octet-stream",
    });
    setUploading(false);
    if (error) return toast.error("Ngarkimi dështoi: " + error.message);
    toast.success("Dokumenti u ngarkua");
    load();
  };

  const download = async (name: string) => {
    const path = `${contractId}/${name}`;
    const { data, error } = await supabase.storage.from("contract-documents").createSignedUrl(path, 60);
    if (error || !data) return toast.error(error?.message ?? "Gabim");
    window.open(data.signedUrl, "_blank");
  };

  const remove = async (name: string) => {
    if (!confirm("Fshi dokumentin?")) return;
    const { error } = await supabase.storage.from("contract-documents").remove([`${contractId}/${name}`]);
    if (error) return toast.error(error.message);
    toast.success("U fshi");
    load();
  };

  const humanSize = (b?: number) => {
    if (!b) return "";
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Paperclip className="h-4 w-4 text-primary" /> Dokumente të bashkangjitura
        </div>
        {canEdit && (
          <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-accent">
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Ngarko
            <input type="file" className="hidden" disabled={uploading}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.currentTarget.value = ""; }} />
          </label>
        )}
      </div>
      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <p className="py-2 text-center text-xs text-muted-foreground">Ende pa dokumente. PDF, foto, apo skedarë të tjerë deri në 10 MB.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((o) => (
            <li key={o.name} className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{o.name.replace(/^\d+-/, "")}</div>
                <div className="text-xs text-muted-foreground">{humanSize(o.metadata?.size)} · {new Date(o.created_at).toLocaleString("sq-AL")}</div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => download(o.name)}><Download className="h-3.5 w-3.5" /></Button>
              {canEdit && <Button size="sm" variant="ghost" onClick={() => remove(o.name)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}