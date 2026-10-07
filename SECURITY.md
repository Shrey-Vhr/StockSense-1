# Security Policy

## Reporting a vulnerability

Please **do not open a public issue** for security problems. Use GitHub's
private reporting instead: the repository's **Security** tab → **Report a
vulnerability**. You should get a reply within a week.

## Intended deployment

StockSense is designed to run **locally, for one user**, on `localhost`. The
protections below are sized for that. If you host it on the internet, read
[Before hosting it](#before-hosting-it) first.

## What is in place

- **Authentication on everything that matters.** Every API router except
  `/api/auth` requires a JWT. Tokens are HS256-signed with a `SECRET_KEY` the
  app refuses to start without (32+ characters, known placeholders rejected).
- **Per-user data isolation.** Portfolios, watchlists, alerts, saved screeners
  and pattern scans are all filtered by the requesting user. Another user's
  record answers 404, the same as a missing one.
- **Accounts.** Passwords are bcrypt-hashed and must be 8-128 characters.
  Deactivated accounts (`is_active = 0`) cannot log in, and their existing
  tokens stop working immediately.
- **Abuse limits** (`backend/rate_limit.py`):

  | What | Limit |
  |---|---|
  | Login | 10 attempts / minute / IP |
  | Registration | 5 / hour / IP |
  | AI analysis, portfolio review, indicator explanations | 10 / minute / user (shared) |
  | Screener runs | 5 / minute / user, at most 2 running server-wide |
  | Pattern scans | 1 running per user |

  AI request bodies, holdings lists, screener conditions and result limits are
  size-capped, so one account cannot run up a large API bill.
- **No internal details in responses.** Errors return a generic message. The
  exception goes to the server log only.
- **Prompt-injection hardening.** Scraped news headlines are flattened,
  truncated and wrapped in untrusted-data tags. The model is told never to
  follow instructions found inside them.
- **Secrets.** `.env`, databases and log files are gitignored. The Angel One
  library's request logging, which once wrote credentials to disk, is
  disabled, and one-time codes are never printed.
- **Supply chain.** Python dependencies are pinned. CI runs gitleaks over full
  history, `pip-audit`, and `npm audit` on every push and weekly. Dependabot
  opens update PRs.

## Known limitations

These are deliberate for a local, single-user app:

- The JWT lives in `localStorage` for 7 days, and logout does not revoke it on
  the server.
- Rate limits are kept in process memory. They reset on restart and are not
  shared between workers.
- CORS allows only localhost origins. No Content-Security-Policy header is set.
- `npm audit` reports advisories in Vite 5 and Tailwind 3. These are build and
  dev-server tools that are not shipped to the browser.

## Before hosting it

Treat these as required, not optional:

1. Move the session to an `httpOnly; Secure; SameSite` cookie and add
   server-side revocation (a token `jti` blocklist or a per-user token
   version).
2. Replace the in-memory limiter with a shared store (Redis) or a gateway, and
   set per-user daily AI spend caps.
3. Set real CORS origins and a CSP, and serve over HTTPS only.
4. Use PostgreSQL rather than SQLite.
5. Run the screener and pattern scans through a job queue rather than
   in-process tasks.

## If you ran an early version

Before this repository went public, an early revision committed log files that
contained the author's Angel One API key, client ID, PIN and short-lived
session tokens. They were removed from history, and the PIN was changed. The
API key cannot be used to log in without the PIN and the authenticator (TOTP)
secret, which was never logged. The session tokens expired long ago. If you
have a copy of an old clone, delete it.
