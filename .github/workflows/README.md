# CodeMender Remediation Pipeline

This repository contains an automated security pipeline, `codemender_sequential_workflow.yml`, that leverages **GitHub Actions** and **Google CodeMender** to autonomously discover, verify, and patch vulnerabilities in our codebase. 

Instead of merely alerting developers to security flaws, this pipeline acts as an autonomous security engineer. It runs on a nightly schedule, generates verified patches using Gemini models, and submits a consolidated Pull Request for human review.

---

## 1. Authentication: The Power of Workload Identity Federation (WIF)

To allow GitHub Actions to interact with Google Cloud's Gemini Enterprise Agent Platform, we must establish a secure trust boundary. Historically, this meant generating a long-lived Service Account JSON key and storing it in GitHub Secrets—a massive security risk if leaked.

This pipeline utilizes **Workload Identity Federation (WIF)** to achieve **keyless authentication**.

### How WIF Works:
1. **The ID Card:** When the GitHub workflow triggers, GitHub generates a temporary, cryptographically signed OpenID Connect (OIDC) token. This token asserts the identity of our specific repository (`nathanielhall/juice-shop`).
2. **The Handshake:** The runner presents this token to Google Cloud's Security Token Service.
3. **The Validation:** Google Cloud evaluates a strict attribute mapping. It checks: *"Does this request actually originate from `nathanielhall/juice-shop`?"* 
4. **The Exchange:** Because the claims match, Google Cloud grants the GitHub runner a short-lived (1-hour) Access Token to impersonate our designated GCP Service Account. 
5. **Evaporation:** When the job finishes, the temporary token evaporates. No secrets are stored, completely eliminating the risk of leaked credentials.

---

## 2. Google Cloud Setup (WIF Infrastructure)

To establish the WIF trust bridge, the following infrastructure was provisioned in a Google Cloud Project:

**1. Create the Service Account:**
Created a service account and granted it the **Vertex AI User** (`roles/aiplatform.user`) role, giving it permission to trigger the CodeMender backend APIs.

**2. Create the Workload Identity Pool & Provider:**
Configured an OIDC provider pointing to GitHub's issuer URL (`https://token.actions.githubusercontent.com`) and mapped the core attributes:
* `google.subject=assertion.sub`
* `attribute.repository=assertion.repository`

**3. Bind the Repository to the Service Account:**
Granted the `roles/iam.workloadIdentityUser` role to the pool, restricted explicitly to our repository name. This guarantees that no other GitHub repository can hijack the service account.

*(Note: Once set up, the resulting **Provider String** and **Service Account Email** are generated for use in GitHub Secrets).*

For reference, see [Setting Up Workload Identity Federation Between GitHub Actions and Google Cloud Platform](https://www.firefly.ai/academy/setting-up-workload-identity-federation-between-github-actions-and-google-cloud-platform)

---

## 3. GitHub Repository Configuration

For the workflow to execute successfully, the following repository-level settings were configured in GitHub:

### Secrets Configuration
The workflow requires two values from Google Cloud to authenticate. These must be stored in GitHub at **Settings > Secrets and variables > Actions**:

* **`WIF_SERVICE_ACCOUNT`**: The email address of the GCP Service Account you created. 
  * *Where to find it:* In the Google Cloud Console, navigate to **IAM & Admin > Service Accounts** and copy the email for the `codemender-ci-sa` account.
* **`WIF_PROVIDER`**: The full resource name of your Workload Identity Provider. 
  * *Where to find it:* In the Google Cloud Console, navigate to **IAM & Admin > Workload Identity Federation**. Click on your pool (`github-pool`), then click on your provider (`github-provider`). Copy the full string listed under **Default audience** or **Resource Name**. 
  * *(Format: `projects/[YOUR_PROJECT_NUMBER]/locations/global/workloadIdentityPools/github-pool/providers/github-provider`)*

### Security & Permission Toggles
* **Allow 3rd-Party Actions:** In **Settings > Actions > General**, *Allow all actions and reusable workflows* was enabled so the runner can utilize official Google auth and PR creation actions.
* **Allow PR Creation:** Under the **Workflow permissions** section, *Allow GitHub Actions to create and approve pull requests* was checked.
* **Auto-Merge:** In **Settings > General > Pull Requests**, *Allow auto-merge* can be checked to allow the pipeline to automatically merge patches if status checks pass. NOTE: This is currently disabled.

---

## 4. Pipeline Architecture & Design Decisions

The workflow logic (located at `.github/workflows/codemender_sequential_workflow.yml`) incorporates several highly optimized design decisions to balance speed, cost, and security.

### On-the-Fly Installation (No Dockerfile)
Instead of maintaining a custom Docker image that requires regular rebuilding and vulnerability patching, the pipeline uses GitHub's native `ubuntu` runner. It downloads and extracts the `cm` binary directly from Google Artifact Registry on-the-fly. This guarantees the pipeline is always using the latest CLI version with zero infrastructure maintenance.

### Cost-Optimized Model Routing (Scan vs. Fix)
The pipeline explicitly separates the scanning and fixing phases:
* **The Scan:** Uses the highly performant and cost-effective **Gemini 3.5 Flash** model to ingest the codebase and discover potential vulnerabilities.
* **The Fix:** Queries the local state for `CRITICAL` findings, then dynamically swaps to the premium **Gemini 3.1 Pro** model to run the heavy reasoning tasks: `cm verify` (Proof-of-Concept exploit generation) and `cm fix` (patch generation).

### Consolidated Pull Requests
Instead of creating a noisy queue of isolated PRs for every single vulnerability, the pipeline loops through all findings and commits them to a single `security/nightly-remediation` branch. A single, consolidated Pull Request is opened, complete with a generated Markdown summary injected directly into the PR description.
