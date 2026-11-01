# Bustem GTM 1: visitor and report follow up demo

This is a demo of a proposed workflow for Bustem. It shows what could happen after someone visits a page, requests a scan, receives a report, and does not come back. It is not connected to Bustem's website, visitor identification tool, scan process, CRM, or messaging accounts. The example brand, report finding, and contact are fictional.

## What the demo shows

| Step | What works here | What is simulated or missing |
| --- | --- | --- |
| Visit and form activity | The demo page records page views, form views, form starts, and submissions against a browser visitor ID. The operator view counts these events. | The tracking script is not installed on Bustem's site. A browser visitor ID does not reveal a person's name or company. No visitor identification provider is connected. |
| Scan request | The sample form stores a request with a name, email, phone number, and brand URL. | This is not Bustem's form. Submitting it does not start a Bustem scan. |
| Report delivery | An operator can mark a report as sent and record a finding and report URL. The API can also receive a delivery event from a future integration. | The demo does not create or send a real report. The sample finding is fictional. Bustem's actual delivery process has not been connected or confirmed. |
| No return after delivery | The operator queue identifies a submitted request whose report was marked sent but has no recorded return or conversation. | The demo uses a two minute delay and a button that advances the example. The queue is calculated when the app is read. A live delay, return tracking, and task delivery need a connected workflow. |
| People at the company | The app can read a few public pages on the submitted company site and collect LinkedIn profile links found there. | It does not identify every decision maker, verify anyone's role, or prove that an employee visited the page. The fictional example inserts a clearly labelled sample contact. A person must verify any suggested contact. |
| Follow up | The app prepares a draft using the recorded report finding. An operator can record a follow up state. | It does not send email, LinkedIn messages, or calls. No outreach account is connected. |

## Try the example

1. Run `npm ci`, `npm run build`, and `npm run db:local:init` once. Then run `npm run dev`.
2. Open `/demo`, choose **Fill fictional example**, and submit the request.
3. Choose **Mark sample report sent**, then **Advance two minutes**. The follow up queue appears.
4. Open the sample report to record a return. The quiet report item disappears.
5. Open `/` to see the operator view, account record, suggested contact, and draft.

The sample [report log](public/manual-report-log-template.csv) is one possible way to record manual delivery. It is not evidence that Bustem currently uses a spreadsheet. The [workflow template](public/workflow-template.json) describes the demo events and rules. The [integration map](docs/INTEGRATIONS.md) lists possible connections that Bustem would need to confirm.

## What would be needed for Bustem to use it

Bustem would need to confirm its actual form, scan delivery method, CRM, and visitor identification setup. Those systems would then need authorized event feeds or webhooks. A live version also needs authentication, webhook verification, duplicate handling, an agreed follow up delay, and a way to record actual returns and conversations. Company matches should remain separate from claims about the identity of an individual visitor.

The current API and operator view are demonstration endpoints. Do not send real customer records to them or put credentials in this repository.
