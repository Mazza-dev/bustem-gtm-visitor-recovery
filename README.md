# Bustem visitor recovery demo

An independent, working GTM 1 prototype by Tolani Lambe. It follows a visitor from an audit request to a manually recorded report, then flags reports that receive no recorded return or conversation. It uses fictional data by default. No scan, email, or outreach is sent.

This is an application sample, not a Bustem integration. The [integration map](docs/INTEGRATIONS.md) shows where their existing tools could connect without code and where a small adapter or authorized access would be needed.

## Try it

1. Run `npm ci`, `npm run build`, and `npm run db:local:init` once. Then start with `npm run dev`.
2. Open the local `/demo` page. Choose **Fill fictional example** and submit the request.
3. Choose **Mark sample report sent**. This is a distinct step because report delivery may be manual.
4. Choose **Advance two minutes** to see the quiet report queue. The production delay is configurable and should be agreed with Bustem.
5. Open the sample report to record a return. The quiet report item then disappears.
6. The operator view at `/` shows the funnel, account, review of decision makers, and follow up draft.

The demo also lets an operator record a report as sent from the account view. A sample [manual report log](public/manual-report-log-template.csv) shows how a spreadsheet could feed the same event. This is an integration option, not a claim that Bustem currently uses a spreadsheet.

## What is real in the prototype

- Page and form events, account records, funnel counts, and a follow up queue.
- A report sent step that can be recorded manually or posted by an authorized integration.
- Rules that distinguish anonymous form abandonment from an identified report recipient. Anonymous visitors are measured, not contacted.
- Draft based on the report text that stays in review. The app does not send messages.
- A limited public company site lookup. Any person it suggests requires verification. The fictional sample contact is labeled as such.

The app's `POST /api/gtm` event contract and rules are in [workflow-template.json](public/workflow-template.json). The **two minute** demo rule is deliberately short; the template suggests a 24 hour production delay. The Claude skill at [.claude/skills/bustem-visitor-recovery/SKILL.md](.claude/skills/bustem-visitor-recovery/SKILL.md) helps an operator use and adapt the workflow. The app works without Claude.

## Before any live connection

The current API and operator view are a **demo**, not a production endpoint. Protect them with authentication and verify inbound webhook signatures before sending real customer records. Get Bustem's permission and access to its actual form, report process, and CRM. Do not put credentials or customer data in this repository.

The [integration map](docs/INTEGRATIONS.md) explains how to connect the workflow once Bustem confirms its tools and report process. The spreadsheet path is an option, not a claim about their current process.
