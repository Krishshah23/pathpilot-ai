Ticket 3 — Quantifiable-metrics detector

Status: verified — code already scans `projects[]`.

File: server/src/services/resumeRedFlags.js
Notes: `projects` descriptions are included in `bulletLines` and are checked for numeric metrics with `metricRegex`. No code change required.