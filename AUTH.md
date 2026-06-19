# Authentication

## Session Cookie

The **only** credential needed is the `substack.sid` cookie. No `connect.sid`, no `X-CSRF-Token`, no `Authorization` header, no special `User-Agent`.

```
Cookie: substack.sid=s%3A<sess_id>.<signature>
```

Format: `s%3A` URL-encoded prefix (`s:`), followed by the session ID, a `.`, then the HMAC signature. This is a standard `cookie-signature` signed cookie (Express pattern).

### How to extract it

Browser DevTools → Application/Storage → Cookies → `substack.sid` value.

## Base URLs

| Scope | Base URL |
|-------|----------|
| Platform | `https://substack.com/api/v1` |
| Publication | `https://{pub}.substack.com/api/v1` |

## Auth Matrix

| Scope | Auth Required? | Behaviour Without Auth |
|-------|----------------|------------------------|
| Platform — public reads (profiles, posts, reader) | ❌ No | Works fine |
| Platform — writes (notes, reactions, attachments) | ✅ Yes | `401 Unauthorized` |
| Platform — personalized (following feed, own profile, settings) | ✅ Yes | `401 Unauthorized` |
| Publication — anything | ✅ Yes | `403 Forbidden` or `401 Unauthorized` |

## Testing Authentication

```js
const test = async (cookie) => {
  const r = await fetch('https://substack.com/api/v1/user/profile/self', {
    headers: { Cookie: cookie }
  });
  console.log(r.ok ? '✅ Authenticated' : '❌ Failed', r.status);
};
```

## Notes

- The session is tied to a specific browser/device. Logging out invalidates the `substack.sid`.
- Session cookie is httpOnly (not accessible to JS in browser).
- Publication-scoped endpoints always require auth. Without a valid cookie they return `403 Forbidden`.
- Platform-scoped public resources (profiles, published posts, reader feed) are open to unauthenticated requests.
