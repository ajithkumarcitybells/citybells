# User Profile API

This document describes the profile-related backend APIs and example requests.

## Endpoints

- `GET /api/profile` — Get the authenticated user's profile (requires session auth).
- `PUT /api/profile/update` — Update profile fields (name, phone, email). JSON body.
- `POST /api/profile/upload-avatar` — Provide object storage path (JSON) — alternative flow.
- `POST /api/profile/upload-avatar-file` — Multipart upload for avatar file (field `avatar`).
- `GET /api/profile/orders` — List user's orders.
- `GET /api/profile/tickets` — List user's support tickets.

## Examples

Register + login (creates session cookie):

```bash
curl -c cookiejar -X POST http://localhost:3000/api/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"me@example.com","password":"secret123","name":"Me"}'
```

Update profile:

```bash
curl -b cookiejar -X PUT http://localhost:3000/api/profile/update \
  -H 'Content-Type: application/json' \
  -d '{"name":"New Name","phone":"+911234567890"}'
```

Upload avatar (multipart):

```bash
curl -b cookiejar -X POST http://localhost:3000/api/profile/upload-avatar-file \
  -F "avatar=@/path/to/avatar.jpg"
```

## Notes

- All profile endpoints require authentication via the existing session cookie-based auth.
- Uploaded files are stored under `/uploads/avatars` and served statically at `/uploads/avatars/<filename>`.
