import config from "../public/workflow-template.json";

type EventRow = { visitorId: string; kind: string; createdAt: string };
type LeadRow = { id: number; visitorId: string; company: string; name: string; reportSummary: string; status: string; reportSentAt: string | null };

export function buildQueue(events: EventRow[], leads: LeadRow[]) {
  const now = Date.now();
  const leadByVisitor = new Map(leads.map(lead => [lead.visitorId, lead]));
  const visitorEvents = new Map<string, EventRow[]>();
  for (const event of events) {
    const rows = visitorEvents.get(event.visitorId) || [];
    rows.push(event);
    visitorEvents.set(event.visitorId, rows);
  }
  const queue: { kind: string; visitorId: string; leadId: number | null; account: string; reason: string; nextStep: string; draft: string | null }[] = [];
  for (const [visitorId, rows] of visitorEvents) {
    const lead = leadByVisitor.get(visitorId);
    const latestStart = rows.filter(row => row.kind === "form_start").sort((a,b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (!lead && latestStart && now - Date.parse(latestStart.createdAt) >= config.rules.formAbandonedAfterMinutes * 60000) {
      queue.push({ kind: "form_abandoned", visitorId, leadId: null, account: "Anonymous visitor", reason: "Form started but never submitted", nextStep: "Measure drop-off. No identity is available for outreach.", draft: null });
    }
  }
  for (const lead of leads) {
    if (lead.reportSentAt && lead.status === "report_sent" && now - Date.parse(lead.reportSentAt) >= config.rules.reportQuietAfterMinutes * 60000) {
      queue.push({ kind: "report_quiet", visitorId: lead.visitorId, leadId: lead.id, account: lead.company, reason: "Report delivered; no return or conversation", nextStep: "Review contacts and the draft before sending.", draft: "Hi " + lead.name.split(" ")[0] + ",\n\nI wanted to follow up on the report for " + lead.company + ". " + lead.reportSummary + "\n\nWould it be useful to review the findings together?" });
    }
  }
  return queue;
}
