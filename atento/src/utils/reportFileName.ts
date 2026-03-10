type ReportNamingContext = {
  mode: "sequence" | "single";
  attentionTypeLabel?: string;
  participantName?: string;
};

function resolveParticipantName(initialName?: string): string {
  const fallback = initialName?.trim() || "usuario";
  if (typeof window === "undefined") {
    return fallback;
  }

  const stored =
    window.localStorage.getItem("atentoUser") ||
    window.localStorage.getItem("atento_user_name") ||
    "";
  const suggested = initialName?.trim() || stored.trim() || "";
  const response = window.prompt("Digite seu nome para salvar o resultado:", suggested);
  const picked = response?.trim() || suggested || fallback;

  if (picked) {
    window.localStorage.setItem("atentoUser", picked);
    window.localStorage.setItem("atento_user_name", picked);
  }

  return picked;
}

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
  const participant = sanitizeSegment(resolveParticipantName(context.participantName), "usuario");
  const timestamp = buildTimestamp(date);

  if (context.mode === "sequence") {
    return `${participant}_${attentionType}_${timestamp}.txt`;
  }

  return `${participant}_${attentionType}_${timestamp}.txt`;
}