# Frontend CI/CD Workflows

This document captures each GitHub Actions workflow, its triggers, quality checks, and deployment targets.

---

## Branch to Workflow Mapping

| Branch / Trigger                                          | Workflow File                             | Purpose                                                                                  | Deploys?    |
| --------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------- | ----------- |
| `develop` (push)                                          | `.github/workflows/deploy-dev.yml`        | Lint, Prettier check, TypeScript check, optional tests, build artifact                   | No          |
| `staging` (push)                                          | `.github/workflows/deploy-staging.yml`    | Quality checks, build with staging config, deploy to staging S3 + CloudFront             | Yes         |
| `production` / `main` (push)                              | `.github/workflows/deploy-production.yml` | Quality checks, build with production config, deploy to production S3 + CloudFront       | Yes         |
| `staging`, `production`, `main` (push) or manual dispatch | `.github/workflows/deploy.yml`            | Multi-environment pipeline, builds once, deploys based on environment (dev/staging/prod) | Conditional |

---

## Workflow Breakdown

### Development Frontend Deployment (`deploy-dev.yml`)

- **Triggers**: `push` to `develop`, manual dispatch.
- **Jobs**:
  1. `test`: `npm run lint`, `prettier --check`, `tsc --noEmit`, optional Vitest.
  2. `build`: `npm run build`, upload `dist/` as the `build-dev` artifact.
- **Deployment**: _Not automated_ – artifacts are available for manual verification.

### Staging Frontend Deployment (`deploy-staging.yml`)

- **Triggers**: `push` to `staging`, manual dispatch.
- **Jobs**:
  1. `test`: lint, prettier, typecheck, optional tests.
  2. `build`: injects staging `.env.production`, runs `npm run build`.
  3. `deploy`: syncs `dist/` to `allyvia-staging-frontend` S3, sets cache headers, invalidates the staging CloudFront distribution, posts summary.

### Production Frontend Deployment (`deploy-production.yml`)

- **Triggers**: `push` to `production` or `main`, manual dispatch.
- **Jobs** mirror staging but target production S3 bucket and CloudFront distribution.

### Multi-Environment Frontend Deployment (`deploy.yml`)

- **Triggers**: `push` to `staging`, `production`, `main`, or manual environment selection.
- **Jobs**:
  1. `test`: lint / typecheck / optional tests (same as others).
  2. `build`: detects environment, creates `.env.production`, runs build, uploads artifact.
  3. Deploy jobs conditionally run based on environment:
     - `development` deploy only if manual input specifies `dev`.
     - `staging` deploy for `staging` branch or manual selection.
     - `production` deploy for `production`/`main` or manual selection.

---

## Flow Diagram (Mermaid)

```mermaid
flowchart TD
    subgraph Branches
        DEV[develop]
        STAGING[staging]
        PROD[production/main]
    end

    subgraph Workflows
        DEV_WF["Development<br/>Frontend Deployment"]
        STAGING_WF["Staging<br/>Frontend Deployment"]
        PROD_WF["Production<br/>Frontend Deployment"]
        MULTI_WF["Multi-Environment<br/>Frontend Deployment"]
    end

    DEV --> DEV_WF
    STAGING --> STAGING_WF
    PROD --> PROD_WF
    STAGING --> MULTI_WF
    PROD --> MULTI_WF

    subgraph Jobs
        DEV_TEST["Lint / Prettier / TSC / Tests"]
        DEV_BUILD["Build & Upload Artifact"]
        STAGING_TEST["Lint / Prettier / TSC / Tests"]
        STAGING_BUILD["Build with Staging Config"]
        STAGING_DEPLOY["Deploy to Staging S3 + CloudFront"]
        PROD_TEST["Lint / Prettier / TSC / Tests"]
        PROD_BUILD["Build with Production Config"]
        PROD_DEPLOY["Deploy to Production S3 + CloudFront"]
        MULTI_TEST["Lint / Prettier / TSC / Tests"]
        MULTI_BUILD["Build with Detected Env"]
        MULTI_DEPLOY_DEV["Deploy (manual) to Dev"]
        MULTI_DEPLOY_STAGING["Deploy to Staging"]
        MULTI_DEPLOY_PROD["Deploy to Production"]
    end

    DEV_WF --> DEV_TEST --> DEV_BUILD
    STAGING_WF --> STAGING_TEST --> STAGING_BUILD --> STAGING_DEPLOY
    PROD_WF --> PROD_TEST --> PROD_BUILD --> PROD_DEPLOY
    MULTI_WF --> MULTI_TEST --> MULTI_BUILD
    MULTI_BUILD --> MULTI_DEPLOY_DEV
    MULTI_BUILD --> MULTI_DEPLOY_STAGING
    MULTI_BUILD --> MULTI_DEPLOY_PROD
```

---

## TL;DR

- `develop` branch runs QA checks and builds artifacts for manual verification; no automatic deploy.
- `staging` branch deploys fully to staging infrastructure.
- `production`/`main` branches deploy to the live environment.
- The multi-environment workflow (`deploy.yml`) supports all environments and can be triggered manually when needed.
