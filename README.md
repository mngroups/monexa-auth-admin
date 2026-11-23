# Monexa Admin

Admin UI for [monexa-auth](../monexa-auth): org admins manage members, roles, activity and branding;
platform admins manage orgs, apps and users. It signs in through monexa-auth (SSO) and talks to its
`/v1/auth/*` and `/api/admin/*` endpoints through Server Actions. Menu and route access follow the
permissions returned by `GET /v1/auth/check` (`platform:all`, `org.member:manage`, `org.role:assign`,
`org.activity:view`, `org.branding:manage`).

## Screens

| Route       | Who                                 | What                                                                                |
| ----------- | ----------------------------------- | ----------------------------------------------------------------------------------- |
| `/members`  | `org.member:manage`, platform admin | Org members: add, roles, activate/deactivate, reset password                        |
| `/branding` | `org.branding:manage`, platform     | Org logo and login branding                                                         |
| `/activity` | `org.activity:view`, platform admin | Org activity log                                                                    |
| `/orgs`     | platform admin                      | Organizations                                                                       |
| `/apps`     | platform admin                      | Apps, their roles/permissions, org access and client secrets                        |
| `/users`    | platform admin                      | All users: create, activate/deactivate, reset password, grant/revoke platform admin |

Temporary passwords and client secrets are generated server-side and shown once in a modal; they are
never stored in a cache, URL or storage. Destructive actions (including password reset) ask for
confirmation naming the target, and your own row has no role, membership, deactivate, reset-password
or platform-admin actions. Every Server Action validates its arguments with Zod ("Data tidak valid").

## Stack

Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS v4, the MoNo design system
(`@mono/ui`), `@mono/hooks`, `@mono/utils`, `@mono/auth`, TanStack Query v5, Zod v4, react-hook-form,
Biome and Vitest (80% coverage enforced). Conventions for contributors and agents are in
[CLAUDE.md](CLAUDE.md).

## Environment

Copy `.env.example` to `.env.local`.

| Env               | Local value             | Notes                                                                     |
| ----------------- | ----------------------- | ------------------------------------------------------------------------- |
| `API_BASE_URL`    | `http://localhost:9000` | monexa-auth origin (server-only)                                          |
| `AUTH_MODE`       | `sso`                   | `sso` (redirect to monexa-auth) or `credentials` (in-app form)            |
| `AUTH_PORTAL_URL` | `http://localhost:9000` | monexa-auth origin: central login, logo URLs. Without it logos can't show |
| `AUTH_ORG_HINT`   | empty                   | Optional org slug for the login branding                                  |

## First run

1. In the monexa-auth repo run `pnpm auth:bootstrap`. It prints the admin client secret once.
2. Put that secret in monexa-auth's `ADMIN_CLIENT_SECRET` and start monexa-auth (port 9000).
3. Install and start this app:

   ```bash
   nvm use            # Node 24.22.1 (.nvmrc)
   corepack enable    # pnpm 10.33.0
   pnpm registry:run install
   pnpm dev           # http://localhost:3001
   ```

4. Sign in as the platform admin.

Private `@mono/*` packages come from the GitLab Package Registry. Set `GITLAB_PACKAGE_GROUP_ID` in
your shell and keep a `read_package_registry` token in Keychain (item `monexa-gitlab-npm`) or in
`GITLAB_NPM_TOKEN`; `pnpm registry:run` creates a temporary npm config and removes it when pnpm
exits. Never commit a token or a generated `.npmrc`.

## Sign-in (SSO)

1. `/login` redirects to `/auth/start?next=…` (unless it carries `?error=`, which renders an error
   card with "Coba lagi" instead of looping).
2. `/auth/start` asks the BE for the authorize URL, stores `state` + PKCE verifier + `next` in a
   single-use HttpOnly cookie and redirects to monexa-auth.
3. `/auth/callback` checks `state`, exchanges the code through the BE, sets the session cookies and
   continues to `next`. Any failure goes to `/login?error=<reason>`.
4. "Keluar" revokes the refresh token and redirects to the provider's end-session URL. A session
   expiry only clears local cookies.

Allowed redirect URIs (`<app origin>/auth/callback`) and `AUTH_POST_LOGOUT_REDIRECT_URI` are
configured on the monexa-auth side. The mechanism lives in `createAuthFlow` from
`@mono/auth/server`; `lib/session.ts` builds it as `authFlow`.

The active org shows at the top of the shell; users with several orgs switch from a dropdown
(`switchOrgAction` issues new tokens, then the page reloads). Renaming the active org on the
Organizations page refreshes the shell.

## Scripts

| Script                                  | What it does                                    |
| --------------------------------------- | ----------------------------------------------- |
| `pnpm dev`                              | Next dev server (port 3001)                     |
| `pnpm build` / `pnpm start`             | Production build (`output: "standalone"`)       |
| `pnpm lint` / `pnpm lint:fix`           | Biome lint + format check / autofix             |
| `pnpm typecheck`                        | `tsc --noEmit`                                  |
| `pnpm test` / `pnpm test:coverage`      | Vitest (watch) / single run with coverage       |
| `pnpm flag:new` / `pnpm flag:remove`    | Add / remove a feature flag                     |
| `pnpm registry:run <pnpm args>`         | Run pnpm with a temporary GitLab registry token |
| `pnpm staging-release` / `pnpm release` | Tag `vX.Y.Z-rc.N` / `vX.Y.Z` with release-it    |

Before pushing: `pnpm lint && pnpm typecheck && pnpm test:coverage && pnpm build`.

## Docker

```bash
docker build --secret id=gitlab_npm_token,env=GITLAB_NPM_TOKEN \
  --build-arg GITLAB_PACKAGE_GROUP_ID=... \
  --build-arg NEXT_PUBLIC_FEATURE_FLAGS='{}' -t monexa-admin .
docker run -p 3000:3000 -e API_BASE_URL=https://auth.example.com monexa-admin
```

The token is a build secret, used only for `pnpm install` and never stored in the image.

## Guides

[Development workflow](docs/guides/development-workflow.md) ·
[Feature flags](docs/guides/feature-flags.md) · [Mobile](docs/guides/mobile-responsive.md) ·
[File upload](docs/guides/file-upload.md)
