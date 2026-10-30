# How this could connect to Bustem

This demo works without access to Bustem's systems. The connections below are options to review with the team. They depend on the tools and plans Bustem actually uses.

| What the workflow needs | Connection without code | When code may be needed |
| --- | --- | --- |
| An identified visitor or company | Send records from an existing identification tool into the team's CRM or an automation workflow. | Normalize records and prevent duplicates if the available connector does not handle them. |
| A submitted audit request | Send form submissions into the same account record using a form integration or webhook. | Track form starts separately if the form tool only sends completed submissions. |
| Confirmation that the report was sent | Mark the account as sent in the operator view, or update a report log in a spreadsheet and trigger Make from that row. | Accept a verified delivery event directly from an internal report system if there is one. |
| A return, reply, or booked call | Use the team's booking and CRM events to update the account. | Join events to the right account if the systems use different identifiers. |
| A follow up task | Create a task in the existing CRM after the agreed quiet period. | Add custom rules only where the CRM or automation tool cannot express them. |

## If reports are sent manually

The [sample report log](../public/manual-report-log-template.csv) contains a fictional row with `requester_email`, `brand_url`, `report_url`, `report_summary`, `status`, and `sent_at`. It is a template for a possible manual process. It does not describe Bustem's current process.

An authorized Make workflow could watch the report log, continue when a row becomes `sent`, find the matching account, record the actual send time, wait the agreed period, check for a return or booked call, and create a review task if needed. The finding from the report should travel with the task. A person reviews any outreach draft before it is sent.

The demo API's `report_delivery` action currently records an email, report finding, and report URL, using the time it receives the event. A live adapter would also need the true send time, a report identifier, authentication, and duplicate handling. The demo endpoint must be protected before anyone connects live customer records.

## What to measure

Track visits, identified visitors, audit requests, reports actually sent, returns, booked calls, conversations, and customers. Keep unidentified visitors in aggregate counts. Do not turn a company match into a claim that a specific employee visited. Count a recovered opportunity only when the account history supports it.
