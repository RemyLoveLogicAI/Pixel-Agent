# Security Policy

## Supported Versions

We actively patch security issues in the following versions:

| Version | Supported          |
|---------|--------------------|
| 0.x     | :white_check_mark: |

## Reporting a Vulnerability

**Please do NOT open a public GitHub issue for security vulnerabilities.**

Instead, report them responsibly by emailing:

**security@lovelogicai.com**

Include the following in your report:

- A clear description of the vulnerability
- Steps to reproduce (proof-of-concept or exploit code if available)
- The potential impact and severity
- Any suggested mitigations

We will acknowledge receipt within **48 hours** and aim to provide a resolution or mitigation plan within **7 business days**.

## Security Best Practices for Forks

When forking this template:

1. **Never commit secrets** — use `.env` (gitignored) or secret managers (e.g., GitHub Secrets, Cloudflare secrets).
2. **Pin dependencies** — use `bun.lockb` and review updates with `bun outdated`.
3. **Enable Dependabot** — add `.github/dependabot.yml` to automate dependency updates.
4. **Least-privilege tokens** — Cloudflare API tokens should have only the permissions they need.
5. **Review CI secrets** — ensure repository secrets are not exposed in PR logs.
6. **Container scanning** — integrate a scanner (e.g., Trivy) into CI to check Docker images for CVEs.

## Disclosure Policy

Once a fix is released, we will publicly disclose the vulnerability details to allow the community to patch their own deployments.

---

_Part of the LoveLogicAI Agent Company OS_
