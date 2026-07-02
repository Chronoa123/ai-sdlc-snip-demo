# snip-backend

Tiny URL shortener – single-file [Bun](https://bun.sh) server, zero dependencies, in-memory store.

## Quick start

```sh
bun start          # bun run server.js
```

## Environment variables

| Variable                | Default                   | Purpose                                                   |
|-------------------------|---------------------------|-----------------------------------------------------------|
| `PORT`                  | `3000`                    | HTTP port                                                 |
| `BASE_URL`              | `http://localhost:<PORT>` | Origin prepended to short codes in responses              |
| `RAILWAY_PUBLIC_DOMAIN` | –                         | Set automatically by Railway; fallback when `BASE_URL` is absent |
| `PUBLIC_DIR`            | –                         | Serve static files from this directory; `GET /` → `index.html`; existing files win over same-named short codes |

## API

| Method | Path          | Body                   | Success                 | Error |
|--------|---------------|------------------------|-------------------------|-------|
| `POST` | `/api/links`  | `{"url":"https://…"}` | `201` link object       | `400` invalid JSON or non-http(s) URL |
| `GET`  | `/api/links`  | –                      | `200` array of links    | –     |
| `GET`  | `/:code`      | –                      | `302` redirect, increments `hits` | `404` |

### Link object shape

```json
{
  "code": "aB3xY9",
  "url": "https://example.com/some/long/path",
  "shortUrl": "https://snip.example.com/aB3xY9",
  "hits": 0,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

All endpoints include open CORS headers (`Access-Control-Allow-Origin: *`) and respond to `OPTIONS` preflight requests.
