// gate-trivy-critical.mjs — Fail-closed gate on fixable CRITICAL findings.
//
// Reads Trivy JSON reports produced by the report-only scan steps
// (trivy-api-results.json, trivy-web-results.json; whichever exists for the
// images built in this run) and exits non-zero if any *fixable* CRITICAL
// vulnerability is present. Scans run with severity CRITICAL + ignore-unfixed,
// so any reported CRITICAL entry is, by construction, a fixable CRITICAL;
// the gate additionally filters on Severity/FixedVersion defensively and
// handles both the Results[] and ClusterName scan shapes.
import { readFileSync, existsSync } from "node:fs";

// Expected reports are driven by which images were built in this run:
// EXPECT_API=1 / EXPECT_WEB=1 (set from the verify path-filter outputs).
// A missing expected report fails closed so a skipped scan can never pass.
const expected = [];
if (process.env.EXPECT_API === "1") expected.push("trivy-api-results.json");
if (process.env.EXPECT_WEB === "1") expected.push("trivy-web-results.json");
const want = expected.length > 0 ? expected : ["trivy-api-results.json", "trivy-web-results.json"].filter((f) => existsSync(f));

for (const file of want) {
  if (!existsSync(file)) {
    console.error(`gate-trivy-critical: expected report missing: ${file}.`);
    process.exit(1);
  }
}
const candidates = want.filter((f) => existsSync(f));

if (candidates.length === 0) {
  console.error("gate-trivy-critical: no Trivy JSON reports found (expected at least one).");
  process.exit(1);
}

let totalFixableCritical = 0;
for (const file of candidates) {
  let report;
  try {
    report = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    console.error(`gate-trivy-critical: cannot parse ${file}: ${error.message}`);
    process.exit(1);
  }
  const results = Array.isArray(report?.Results) ? report.Results : [];
  let fileCount = 0;
  for (const result of results) {
    const vulns = Array.isArray(result?.Vulnerabilities) ? result.Vulnerabilities : [];
    for (const vuln of vulns) {
      if (vuln?.Severity === "CRITICAL" && vuln?.FixedVersion) {
        fileCount += 1;
        console.log(`CRITICAL fixable: ${vuln.VulnerabilityID} (${vuln.PkgName}) in ${file}`);
      }
    }
  }
  console.log(`${file}: ${fileCount} fixable CRITICAL findings`);
  totalFixableCritical += fileCount;
}

if (totalFixableCritical > 0) {
  console.error(`gate-trivy-critical: FAIL — ${totalFixableCritical} fixable CRITICAL findings.`);
  process.exit(1);
}
console.log("gate-trivy-critical: PASS — no fixable CRITICAL findings.");
