# PulseOps Docs (Mintlify)

The public API documentation, built with [Mintlify](https://mintlify.com). It's
a hosted docs site — Mintlify builds and deploys it from this folder on every
push (see **Deployment** below), so there's no container to run in
`docker-compose`.

## Structure

```
docs/
├── docs.json                    # Mintlify site config (nav, theme, branding)
├── index.mdx                    # Intro / quickstart
├── authentication.mdx           # API key auth guide
├── api-reference/
│   └── openapi.json             # Generated spec — API Reference pages build from this
├── favicon.svg
└── logo/{light,dark}.svg
```

The **API Reference** tab is generated automatically from
`api-reference/openapi.json`; there are no hand-written endpoint pages.

## Local preview

```bash
npm i -g mint      # first time only (Mintlify CLI)
cd docs
mint dev           # http://localhost:3000
```

## Refreshing the OpenAPI spec

`api-reference/openapi.json` is generated from the backend's live route schemas
(via `@fastify/swagger`). Regenerate and commit it whenever the documented API
surface changes:

```bash
cd ../backend
pnpm openapi:dump   # writes ../docs/api-reference/openapi.json
```

## Deployment

Mintlify hosts the site. Connect this repository in the
[Mintlify dashboard](https://dashboard.mintlify.com) and set the docs directory
to `docs/`; it redeploys automatically on push to the default branch.

After the site is live, point the app at it by setting:

- Frontend: `NEXT_PUBLIC_DOCS_URL` → the Mintlify site URL
- Backend: `DOCS_URL` → the same URL (used by the `/docs` redirect)

A custom domain and removing Mintlify branding require a paid plan.
