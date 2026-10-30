import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { contacts, events, followups, leads } from "../../../db/schema";
import { buildQueue } from "../../../lib/workflow";

export const dynamic = "force-dynamic";

const kinds = new Set(["page_view", "cta_click", "form_view", "form_start", "return_visit", "report_viewed"]);
const statuses = new Set(["submitted", "report_sent", "returned", "conversation", "customer"]);
const now = () => new Date().toISOString();
const clean = (value: unknown, max = 500) => String(value ?? "").trim().slice(0, max);
const number = (value: unknown) => Number.parseInt(String(value), 10) || 0;

async function discoverOnCompanySite(db: ReturnType<typeof getDb>, leadId: number, company: string) {
  const root = "https://" + company;
  const pages = ["/", "/about", "/team", "/leadership"];
  const found = new Map<string, { name: string; linkedin: string }>();
  await Promise.all(pages.map(async path => {
    try {
      const response = await fetch(root + path, { signal: AbortSignal.timeout(3500), redirect: "manual" });
      if (!response.ok || !(response.headers.get("content-type") || "").includes("text/html")) return;
      const html = (await response.text()).slice(0, 250000);
      for (const match of html.matchAll(/https?:\/\/(?:[a-z]{2,3}\.)?linkedin\.com\/in\/([a-z0-9%-]+)/gi)) {
        const slug = match[1].split("?")[0].replace(/%20/g, "-");
        if (/^[a-z][a-z0-9-]{3,70}$/i.test(slug)) {
          const name = slug.replace(/-\d+$/, "").split("-").map(s => s[0]?.toUpperCase() + s.slice(1)).join(" ");
          found.set(slug, { name, linkedin: "https://www.linkedin.com/in/" + slug });
        }
      }
    } catch { /* Public sites may block automated reads. */ }
  }));
  const existing = await db.select().from(contacts).where(eq(contacts.leadId, leadId));
  let added = 0;
  for (const person of [...found.values()].slice(0, 8)) {
    if (existing.some(c => c.linkedin === person.linkedin)) continue;
    await db.insert(contacts).values({ leadId, name: person.name, role: "Role to verify", linkedin: person.linkedin, email: "", source: "Company site, verify" });
    added++;
  }
  return added;
}

function domainOf(value: string) {
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    if (!/^https?:$/.test(url.protocol) || !/^[a-z\d.-]+\.[a-z]{2,}$/i.test(url.hostname)) return "";
    return url.hostname.replace(/^www\./, "");
  } catch { return ""; }
}

export async function GET() {
  try {
    const db = getDb();
    const [allEvents, allLeads, allContacts, allFollowups] = await Promise.all([
      db.select().from(events).orderBy(desc(events.id)).limit(2000),
      db.select().from(leads).orderBy(desc(leads.id)).limit(500),
      db.select().from(contacts).orderBy(desc(contacts.id)).limit(1000),
      db.select().from(followups).orderBy(desc(followups.id)).limit(1000),
    ]);
    const queue = buildQueue(allEvents, allLeads);
    return Response.json({ events: allEvents, leads: allLeads, contacts: allContacts, followups: allFollowups, queue });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const action = clean(body.action, 40);
    const db = getDb();

    if (action === "event") {
      const kind = clean(body.kind, 40);
      const visitorId = clean(body.visitorId, 100);
      if (!kinds.has(kind) || !visitorId) return Response.json({ error: "Invalid event" }, { status: 400 });
      await db.insert(events).values({ visitorId, kind, source: clean(body.source, 200) || "direct", page: clean(body.page, 300) || "/", createdAt: now() });
      if (kind === "return_visit" || kind === "report_viewed") {
        const [lead] = await db.select().from(leads).where(eq(leads.visitorId, visitorId)).limit(1);
        if (lead && !["conversation", "customer"].includes(lead.status)) {
          await db.update(leads).set({ lastActivityAt: now(), status: "returned" }).where(eq(leads.id, lead.id));
        }
      }
      return Response.json({ ok: true });
    }

    if (action === "submit") {
      const visitorId = clean(body.visitorId, 100);
      const name = clean(body.name, 120);
      const email = clean(body.email, 180);
      const phone = clean(body.phone, 60);
      const brandUrl = clean(body.brandUrl, 300);
      const company = domainOf(brandUrl);
      if (!visitorId || !name || !/^\S+@\S+\.\S+$/.test(email) || !phone || !company) return Response.json({ error: "Complete every field with a valid brand URL and email" }, { status: 400 });
      const at = now();
      const demo = body.demo === true;
      const demoFields = demo ? { reportSummary: company.endsWith(".example") ? "Demo finding: a lookalike storefront copied the sample brand name and product imagery. This is a fictional case." : "Sample report for workflow testing only. No threat scan was performed on this brand.", reportUrl: "/demo", reportSentAt: null, status: "submitted" } : {};
      await db.insert(leads).values({ visitorId, name, email, phone, brandUrl, company, submittedAt: at, lastActivityAt: at, ...demoFields }).onConflictDoUpdate({ target: leads.visitorId, set: { name, email, phone, brandUrl, company, lastActivityAt: at, ...demoFields } });
      await db.insert(events).values({ visitorId, kind: "form_submit", source: clean(body.source, 200) || "direct", page: demo ? "/demo" : "/scan", createdAt: at });
      return Response.json({ ok: true, reportUrl: demo ? "/demo" : null });
    }

    if (action === "advance_demo") {
      const visitorId = clean(body.visitorId, 100);
      const [lead] = await db.select().from(leads).where(eq(leads.visitorId, visitorId)).limit(1);
      if (!lead || !["/demo", "/demo/report"].includes(lead.reportUrl)) return Response.json({ error: "Demo report not found" }, { status: 404 });
      if (lead.status !== "report_sent" || !lead.reportSentAt) return Response.json({ error: "Record the report as sent first" }, { status: 400 });
      const earlier = new Date(Date.now() - 3 * 60000).toISOString();
      await db.update(leads).set({ reportSentAt: earlier, status: "report_sent", lastActivityAt: earlier }).where(eq(leads.id, lead.id));
      let added = 0;
      if (lead.company.endsWith(".example")) {
        const existing = await db.select().from(contacts).where(eq(contacts.leadId, lead.id));
        if (!existing.some(x => x.source === "Fictional demo contact")) {
          await db.insert(contacts).values({ leadId: lead.id, name: "Jordan Vale", role: "Founder · fictional example", source: "Fictional demo contact", email: "", linkedin: "" });
          added = 1;
        }
      } else {
        added = await discoverOnCompanySite(db, lead.id, lead.company);
      }
      return Response.json({ ok: true, contactsAdded: added });
    }

    if (action === "report_delivery") {
      const email = clean(body.email, 180);
      const summary = clean(body.reportSummary, 3000);
      const url = clean(body.reportUrl, 500);
      if (!email || !summary || !url) return Response.json({ error: "Email, report finding, and report URL are required" }, { status: 400 });
      const [lead] = await db.select().from(leads).where(eq(leads.email, email)).orderBy(desc(leads.id)).limit(1);
      if (!lead) return Response.json({ error: "Requester not found" }, { status: 404 });
      const at = now();
      await db.update(leads).set({ reportSummary: summary, reportUrl: url, reportSentAt: at, status: "report_sent", lastActivityAt: at }).where(eq(leads.id, lead.id));
      await db.insert(events).values({ visitorId: lead.visitorId, kind: "report_sent", source: "report_workflow", page: url, createdAt: at });
      return Response.json({ ok: true, leadId: lead.id });
    }

    if (action === "outcome") {
      const email = clean(body.email, 180);
      const status = clean(body.status, 30);
      if (!email || !["conversation", "customer"].includes(status)) return Response.json({ error: "Email and valid outcome are required" }, { status: 400 });
      const [lead] = await db.select().from(leads).where(eq(leads.email, email)).orderBy(desc(leads.id)).limit(1);
      if (!lead) return Response.json({ error: "Requester not found" }, { status: 404 });
      const at = now();
      await db.update(leads).set({ status, lastActivityAt: at }).where(eq(leads.id, lead.id));
      await db.insert(events).values({ visitorId: lead.visitorId, kind: status, source: "crm", page: "/account", createdAt: at });
      return Response.json({ ok: true, leadId: lead.id });
    }

    if (action === "lead") {
      const id = number(body.id);
      const status = clean(body.status, 30);
      if (!id || !statuses.has(status)) return Response.json({ error: "Invalid lead update" }, { status: 400 });
      const patch = { status, reportSummary: clean(body.reportSummary, 3000), reportUrl: clean(body.reportUrl, 500), lastActivityAt: now(), ...(status === "report_sent" ? { reportSentAt: now() } : {}) };
      await db.update(leads).set(patch).where(eq(leads.id, id));
      const [lead] = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
      if (lead) await db.insert(events).values({ visitorId: lead.visitorId, kind: status, source: "operator", page: "/dashboard", createdAt: now() });
      return Response.json({ ok: true });
    }

    if (action === "contact") {
      const leadId = number(body.leadId);
      const name = clean(body.name, 120);
      if (!leadId || !name) return Response.json({ error: "Contact name is required" }, { status: 400 });
      await db.insert(contacts).values({ leadId, name, role: clean(body.role, 120), email: clean(body.email, 180), linkedin: clean(body.linkedin, 350), source: "manual" });
      return Response.json({ ok: true });
    }

    if (action === "discover") {
      const leadId = number(body.leadId);
      const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
      if (!lead) return Response.json({ error: "Account not found" }, { status: 404 });
      const added = await discoverOnCompanySite(db, leadId, lead.company);
      return Response.json({ ok: true, added });
    }

    if (action === "followup") {
      const leadId = number(body.leadId);
      const message = clean(body.message, 4000);
      const channel = clean(body.channel, 30);
      const state = clean(body.state, 30);
      if (!leadId || !message || !["email", "linkedin", "phone"].includes(channel) || !["draft", "sent", "replied"].includes(state)) return Response.json({ error: "Complete the follow-up" }, { status: 400 });
      await db.insert(followups).values({ leadId, contactId: number(body.contactId) || null, channel, message, state, createdAt: now() });
      if (state === "replied") await db.update(leads).set({ status: "conversation", lastActivityAt: now() }).where(eq(leads.id, leadId));
      return Response.json({ ok: true });
    }
    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
