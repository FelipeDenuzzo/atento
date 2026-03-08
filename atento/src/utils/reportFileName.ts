type ReportNamingContext = {
  mode: "sequence" | "single";
  attentionTypeLabel?: string;
  participantName?: string;
};

function sanitizeSegment(value: string | undefined, fallback: string): string {
  if (!value) return fallback;

  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || fallback;
}

function buildTimestamp(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day}${month}${year}-${hours}${minutes}`;
}

export function buildTxtReportFileName(
  context: ReportNamingContext,
  date: Date = new Date(),
): string {
  const attentionType = sanitizeSegment(context.attentionTypeLabel, "tipo_atencao");
  const timestamp = buildTimestamp(date);

  if (context.mode === "sequence") {
    const participant = sanitizeSegment(context.participantName, "usuario");
    return `${participant}_${attentionType}_${timestamp}.txt`;
  }

  return `${attentionType}_${timestamp}.txt`;
}