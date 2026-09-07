import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

/** Trigger a browser download for arbitrary text content. */
function downloadBlob(content: BlobPart, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers, ...rows].map((r) => r.map(esc).join(",")).join("\n");
  downloadBlob("\uFEFF" + csv, filename, "text/csv;charset=utf-8;");
}

export type PdfTableOptions = {
  title: string;
  subtitle?: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
  filename: string;
  orientation?: "portrait" | "landscape";
  summary?: { label: string; value: string }[];
};

/** Generic branded table report as PDF. */
export function downloadTablePdf(opts: PdfTableOptions) {
  const doc = new jsPDF({ orientation: opts.orientation ?? "portrait", unit: "pt", format: "a4" });
  const width = doc.internal.pageSize.getWidth();

  doc.setFillColor(23, 43, 77);
  doc.rect(0, 0, width, 70, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(opts.title, 40, 34);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(opts.subtitle ?? "Zemër & Praktikë", 40, 52);
  doc.text(new Date().toLocaleString("sq-AL"), width - 40, 52, { align: "right" });

  let startY = 96;
  if (opts.summary?.length) {
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(10);
    opts.summary.forEach((s, i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const x = 40 + col * ((width - 80) / 4);
      const y = 96 + row * 34;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(120, 120, 120);
      doc.text(s.label, x, y);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(23, 43, 77);
      doc.text(s.value, x, y + 14);
    });
    startY = 96 + Math.ceil(opts.summary.length / 4) * 34 + 12;
  }

  autoTable(doc, {
    head: [opts.headers],
    body: opts.rows.map((r) => r.map((c) => (c == null ? "—" : String(c)))),
    startY,
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [23, 43, 77], textColor: 255 },
    alternateRowStyles: { fillColor: [244, 247, 252] },
    margin: { left: 40, right: 40 },
  });

  doc.save(opts.filename);
}

export type CertificatePdfData = {
  title: string;
  studentName: string;
  companyName: string;
  description?: string | null;
  hours?: number | null;
  grade?: number | null;
  issuedAt: string;
  number: string;
  skills?: string[] | null;
  businessSigner?: string | null;
  teacherSigner?: string | null;
  verifyUrl: string;
  qrDataUrl?: string | null;
  revokedAt?: string | null;
};

/** Renders the official practice certificate as an A4 landscape PDF. */
export function downloadCertificatePdf(data: CertificatePdfData) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  doc.setDrawColor(23, 43, 77);
  doc.setLineWidth(3);
  doc.rect(24, 24, w - 48, h - 48);
  doc.setLineWidth(0.7);
  doc.rect(34, 34, w - 68, h - 68);
  doc.setFillColor(23, 43, 77);
  doc.rect(34, 34, w - 68, 10, "F");

  doc.setTextColor(110, 118, 132);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("CERTIFIKATË E PËRFUNDIMIT TË PRAKTIKËS", w / 2, 96, { align: "center" });

  doc.setTextColor(23, 43, 77);
  doc.setFontSize(24);
  doc.text(data.title, w / 2, 130, { align: "center", maxWidth: w - 140 });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  doc.text("Kjo certifikatë i jepet", w / 2, 168, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(20, 20, 20);
  doc.text(data.studentName, w / 2, 198, { align: "center", maxWidth: w - 160 });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  doc.text("për përfundimin me sukses të praktikës profesionale pranë", w / 2, 224, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(23, 43, 77);
  doc.text(data.companyName, w / 2, 248, { align: "center", maxWidth: w - 160 });

  if (data.description) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(110, 118, 132);
    doc.text(data.description, w / 2, 272, { align: "center", maxWidth: w - 200 });
  }

  const facts: [string, string][] = [];
  if (data.hours != null) facts.push(["Orë", String(data.hours)]);
  if (data.grade != null) facts.push(["Notë", String(data.grade)]);
  facts.push(["Lëshuar", new Date(data.issuedAt).toLocaleDateString("sq-AL")]);
  facts.push(["Numri", data.number]);

  const factY = 316;
  const step = (w - 200) / facts.length;
  facts.forEach(([label, value], i) => {
    const x = 100 + step * i + step / 2;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(130, 130, 130);
    doc.text(label.toUpperCase(), x, factY, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(30, 30, 30);
    doc.text(value, x, factY + 16, { align: "center" });
  });

  if (data.skills?.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(110, 118, 132);
    doc.text(`Aftësi: ${data.skills.join(" · ")}`, w / 2, factY + 42, { align: "center", maxWidth: w - 200 });
  }

  const signY = h - 110;
  const leftX = 150;
  const rightX = w - 150;
  doc.setDrawColor(180, 180, 180);
  doc.line(leftX - 80, signY, leftX + 80, signY);
  doc.line(rightX - 80, signY, rightX + 80, signY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text(data.businessSigner || "—", leftX, signY + 16, { align: "center" });
  doc.text(data.teacherSigner || "—", rightX, signY + 16, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(130, 130, 130);
  doc.text("Administratori i biznesit", leftX, signY + 30, { align: "center" });
  doc.text("Mësuesi i praktikës", rightX, signY + 30, { align: "center" });

  if (data.qrDataUrl) {
    doc.addImage(data.qrDataUrl, "PNG", w / 2 - 34, signY - 44, 68, 68);
  }
  doc.setFontSize(8);
  doc.setTextColor(130, 130, 130);
  doc.text(data.verifyUrl, w / 2, signY + 40, { align: "center" });

  if (data.revokedAt) {
    doc.setTextColor(200, 40, 40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(30);
    doc.text("E ANULUAR", w / 2, h / 2, { align: "center", angle: 20 });
  }

  doc.save(`certifikata-${data.number}.pdf`);
}
