# liberlc

[![npm bundle size](https://img.shields.io/bundlephobia/minzip/liberlc?style=for-the-badge)](https://www.npmjs.com/package/liberlc)
![version](https://img.shields.io/github/package-json/v/wellogotlimited/liberlc?style=for-the-badge)

A production-ready, rate-limited JavaScript/TypeScript wrapper for the
[PRC Private Server API](https://apidocs.policeroleplay.community/).

> Works with ER:LC private servers that have the API server pack enabled.

---

## ⚡ Features

- ✅ Promise-based API with full TypeScript support
- ✅ Built-in rate coordination powered by Bottleneck
- ✅ Smart retry logic with back-off and `Retry-After` support
- ✅ Manual ETag validation so you never have to manage stale responses
- ✅ Lightweight bundle with generated type declarations

---

## 📦 Install

```bash
npm install liberlc
```

`liberlc` requires Node.js 18 or newer. If you are running in an older
environment, pass a `fetch` implementation (for example from `undici`) to the
client options.

---

## 🚀 Quick start

```ts
import { PRC } from "liberlc";

const api = new PRC({
  serverKey: process.env.PRC_SERVER_KEY!,
  rpm: 90,
  userAgent: "my-app/1.0.0",
});

const status = await api.server.status();
console.log(status.Name, status.Players);

await api.server.command(":message Welcome to the server!");

const [players, joins] = await Promise.all([
  api.players.list(),
  api.logs.joins(),
]);

console.log(`Currently online: ${players.length}`);
console.log(`Recent joins: ${joins.length}`);
```

---

## 🧠 How caching works

The ER:LC API returns an `ETag` header for most `GET` endpoints but never emits
`304 Not Modified` responses. `liberlc` performs this check for you:

1. The first response for a given endpoint is cached together with its ETag.
2. Subsequent requests attach the cached ETag via `If-None-Match`.
3. When the API reuses the same ETag, the cached payload is returned instantly.

No extra configuration is required, and non-idempotent requests (such as
`POST` commands) bypass the cache automatically.

---

## 🛠️ Advanced usage

- **Custom fetch implementation** – supply `fetch` in the constructor options.
- **Retry behaviour** – use the `retries` option to control how many times a
  request should be retried when the API returns `429`, `500` or `503`.
- **Rate limits** – the client updates its Bottleneck reservoir based on the
  latest `X-RateLimit-*` headers.

All Zod schemas and inferred types are exported for consumers that want extra
validation or type reuse:

```ts
import { PlayersResponse, type TPlayersResponse } from "liberlc";

type Players = TPlayersResponse;

// Custom validation
const payload = PlayersResponse.parse(await api.players.list());
```

---

## 📦 Publishing & development

To build the package locally:

```bash
npm install
npm run build
```

This produces a bundled ESM build and the accompanying `.d.ts` files in
`dist/`, making the package ready for publication to npm.
