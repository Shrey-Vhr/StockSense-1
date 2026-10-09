# StockSense Decision Record

This ADR record was rebuilt from the current working tree and the complete
108-commit log, reviewed 2026-09-01. It does not treat earlier documentation
as evidence. Commit messages establish stated historical reasoning; current
code establishes current behavior.

| Status | Meaning |
|---|---|
| Evidenced | Code and/or detailed commit message records mechanism and rationale. |
| Partial | Mechanism is clear; alternatives or original reason are not fully recorded. |
| Unverified | Repository evidence is insufficient. It is intentionally not guessed. |
| Superseded | Historical implementation was replaced and must not describe current behavior. |

## ADR-001: SQLite through synchronous SQLAlchemy, without migrations

**Status:** Partial.

**Current mechanism.** database.py:6-29 defaults DATABASE_URL to
sqlite:///./stocksense.db, uses check_same_thread=False, creates synchronous
SQLAlchemy sessions, and invokes Base.metadata.create_all(). The URL is
configurable, so SQLite is a default, not a hard-coded driver lock.

**Reasoning evidence.** There is no Alembic setup, alternative database driver,
or recorded database evaluation. README frames the product as a local personal
project. That supports, but does not prove, a zero-operations rationale.

**Consequences.** create_all does not migrate existing columns. SQLite is
single-writer, and current request writes/background alert work can contend.
This choice fits the current single-process design but is a poor foundation for
multiple workers.

**Unverified:** Why SQLite was chosen over PostgreSQL and whether deployment
beyond one local process was ever intended.

## ADR-002: JWT authorization on costly REST/SSE endpoints

**Status:** Evidenced, with scope gaps.

**Decision.** Commit 4c13491 records that 32 of 55 endpoints were anonymous,
including paths that spend Anthropic credit and run multi-minute screens. It
added router-level auth to stocks, analysis, news, and AI, and explicit
per-route auth to screener. SSE moved from EventSource to fetch plus
ReadableStream because EventSource cannot set Authorization headers; a token in
a query string would reach logs/browser history.

**Current mechanism.** auth.py uses bcrypt and HS256 JWTs. Login gives a
seven-day token (auth.py:110-133); api.js stores it in localStorage and adds a
Bearer header. main.py:82-88 and screener.py:51-141 implement the protection.

**Qualification.** The commit title says the whole API is behind auth. The
exceptions are the public root and Angel status routes in main.py. The
unauthenticated price socket and /ws heartbeat that once existed were
removed (4cf4861, ADR-012).

**Consequences.** JWTs have no refresh/revocation, logout is client-side, and
localStorage expands XSS impact.

## ADR-003: Angel One plus yfinance for market data

**Status:** Partial.

**Current mechanism.** main.py attempts Angel One login on startup.
angel_one_service.py owns TOTP session, quote and token operations;
angel_one_websocket.py consumes broker ticks. market_data.py supplies yfinance
quotes, history, fundamentals, market overview, sectors, and batch screen data.
websocket_service.py starts broker connectivity and a polling fallback.

**Why.** main.py explicitly prints that yfinance is used when Angel connection
fails, demonstrating availability fallback intent. However yfinance is also a
direct source for many features, so calling it only an after-hours fallback is
wrong.

**Consequences.** Source disagreement policy, entitlement assumptions, and
cache freshness are not specified. TTLs are process-local and differ by path:
history 15 minutes, fundamentals 24 hours, overview 60 seconds, and
sectors/movers 300 seconds.

**Unverified:** Why Angel One was selected, which source is authoritative on
disagreement, and whether the data license permits current browser fan-out.
An investigation of the first 15 commits reveals no recorded rationale or decision log for choosing Angel One or yfinance; the initial commits introduce the integrations without explanatory commit bodies.

## ADR-004: Scrape fundamentals/institutional data and stage the screener

**Status:** Partial.

**Current mechanism.** screener_in_service.py scrapes Screener.in for ratios,
peers, results and shareholding. institutional_service.py consumes NSE data.
ScreenerEngine separates technical, fundamental, and institutional conditions;
it downloads a year of yfinance OHLC in 50-symbol chunks with threads=True,
filters technical conditions, then calls expensive Screener.in/NSE work only
for survivors. asyncio.to_thread and asyncio.gather keep the async route/SSE
responsive.

**History.** Commit 24574c7 records a concurrent screener optimization attempt;
the next commit reverted it. Commit e106cdf records a later institutional-fetch
bottleneck correction. Current staged code is the evidence for the surviving
architecture.

**What cannot be claimed.** No benchmark artifact, fixed dataset, hardware
profile, or reproducible test supports the earlier 1,100s to 73s figure. It
must remain unverified.

**Current Performance Verification.** A benchmark executed in September 2026 confirms that the staged engine (`ScreenerEngine.run`) screens a full universe of 2,107 stocks in ~64.5s (with 1,338 passing the initial filter). This validates the performance of the current `asyncio.to_thread` and `asyncio.gather` implementation.

**Consequences.** Upstream HTML/API changes and network variation directly
affect results/runtime. Job/SSE state is not durable. Saved screeners were
once shared between users; ADR-012 made them per user.

## ADR-005: One structured Claude response schema across four analysis modes

**Status:** Evidenced.

**Decision.** AIService.generate_stock_analysis() has trade_setup, risk,
fundamental, and full branches (ai_service.py:81-579), but each asks for the
same response shape. Commit ccdd7ce explicitly records this finding: the
difference is persona and numbers exposed to the prompt, not four output
contracts. This lets AIAnalysis and StockDetail render one report model.

**Current flow.** The browser gathers technical/fundamental data; routers/ai.py
adds institutional data; AIService adds institutional/quarterly/peer context.
Claude Sonnet is called with max_tokens=8000 and temperature=0.2. Portfolio
review, screener insights, and indicator explanation select Haiku.

**Truncation history.** Commit 93b1512 records a full-analysis HTTP 500 caused
by JSON truncation. Current code rejects stop_reason=max_tokens before parsing
rather than treating a truncated payload as valid. It reports failure cleanly;
it does not retry, repair JSON, or provide a fallback report.

**Consequence.** The common schema is a UI convenience, not model-output
validation. Most financial fields remain model assertions.

## ADR-006: Canonical setup_type vocabulary without deterministic classification

**Status:** Evidenced.

Commit 4813405 found three conflicting prompt/schema spellings and arbitrary
model output rendered as a badge. It introduced ALLOWED_SETUP_TYPES
(ai_service.py:19-26) and _validate_setup_type (581-613). Values normalize to:

- Pullback to EMA 20/50
- Breakout with Volume
- Range Bound

Unknown values are dropped rather than replaced because both UI consumers
already hide an absent field and a false label was considered worse than none.

This validates vocabulary only. There is no deterministic threshold for price
distance to EMA, breakout level, or volume expansion. The LLM still classifies
the setup. Any claim that setup_type is rule-derived is false.

## ADR-007: ATR-guided LLM stops coexist with a rule-based 4% fallback

**Status:** Partial and implementation-inconsistent.

Risk and full prompts ask Claude for the tighter of Entry - 1.5*ATR and recent
swing low, avoidance of wide support stops, and at least 1:2 risk/reward. The
prompt gives the operating reason: wide support is unsuitable for a 7-20 day
swing stop.

pattern_service.py:891+ independently creates rule-based setups. Where support
is absent it uses current_price*0.96 for bullish; where resistance is absent it
uses current_price*1.04 for bearish. That is a fixed 4% policy, not ATR. The
trade_setup and fundamental LLM branches do not receive the same swing block.

The product can therefore present incompatible trade levels based on feature.
No source records why 1.5, why 4%, or why both systems coexist.

## ADR-008: Groq sentiment is optional; Gemini is not an active provider

**Status:** Evidenced.

Current news_service.py performs an import-time Groq health check and batch
classification. It uses SENTIMENT_MODEL = openai/gpt-oss-20b, health
max_tokens=200, classifier max_tokens=4000, temperature=0.1. It batches up to
ten indexed headlines. The prompt defines directional scoring: positive >=7,
negative <=3, neutral 4-6; aggregate thresholds are Positive >=6.5 and Negative
<=3.5.

Commit ccdd7ce corrected prior Gemini claims. There is no Gemini runtime call
despite GEMINI_API_KEY and google-generativeai remaining in config/requirements.
The same applies to NEWSAPI_KEY: current news code uses RSS, not NewsAPI.

Failure preserves news availability by stamping articles Neutral/Low/5. This is
intentional graceful degradation but can make an outage look like a real result.

**Unverified:** Why Groq was chosen over Gemini/OpenAI/Claude, whether Gemini or
GLM-5.2 was evaluated, and any provider cost/quality comparison. An investigation of the initial 15 commits shows no recorded reasoning or vendor comparison for selecting Groq; the choice was made without a documented ADR.

## ADR-009: Sentiment reliability and secret-remediation debugging chain

**Status:** Evidenced for stated fixes; runtime coverage remains partial.

This chain is one decision narrative because each bug made incorrect output look
healthy.

| Commit | Failure found | Fix and stated verification |
|---|---|---|
| a02bdaf | SmartAPI/logzero files could log Angel keys, Bearer tokens, password and TOTP on failed requests. | angel_one_service disables vendor file logging at import; .gitignore rejects logs; pre-commit rejects logs, envs, DBs, keys/tokens. Commit records tested staged key/log refusal. |
| c82a66a | SENTIMENT_CACHE_HOURS=0 made a cache hit impossible. StockDetail refresh query was undeclared and discarded. | Stock-news cache set to 4h; force_refresh wired through route. Market news keeps only 30m function cache, avoiding frozen 4h headlines. |
| f23af64 | Retired llama-3.1-8b-instant returned model_not_found, silently forcing all Neutral. Duplicated model strings, five-token reasoning health check, and undefined score scale compounded it. Inverted scoring occurred because the model inferred score = impact magnitude (giving a bullish headline a 2). | One openai/gpt-oss-20b constant; health/classification budgets 200/4000. Explicitly defined the 0-10 directional scale and added a bullish worked example to fix the inverted scoring. |
| 9bf08d6 | Startup and empty-content failures produced no visible signal; all Neutral looked legitimate. | SENTIMENT_STATUS stores reason; warning log; response field sentiment_available; News/StockDetail warning badge. |
| 4813405 | setup_type had inconsistent wording and no validation. | Prompt canonicalization plus server normalize/drop. |

**Remaining gap.** SENTIMENT_STATUS changes only at import. A classifier failure
after a successful health check still stamps Neutral fields but does not make
the UI warning appear. The secret-leak mitigation was reported as history purge,
file-handler suppression, hook checks, and account PIN change; this repository
cannot prove every clone, backup, or external cache lost leaked material.

## ADR-010: In-memory jobs/caches and browser-owned alert delivery

**Status:** Partial.

Pattern scans use FastAPI BackgroundTasks and module-global status/results.
Screener/news/market caches use module dictionaries/decorators. Alert checker
runs as a background task; browser polling of triggered alerts displays desktop
notifications. Commit 1890d75 records that notification polling was restricted
to authenticated users.

This minimizes infrastructure, but jobs/cache are lost on restart and differ
per worker. Closed browsers receive no notification. There is no message queue,
retry, email/push provider, delivery audit, or shutdown lifecycle.

**Unverified:** Whether this was a deliberate local-only design choice or an
unfinished first implementation.

## ADR-011: Tokenized UI and browser-print reports

**Status:** Evidenced for implementation; Partial for original rationale.

The Phase 1-13 history records a tokenized component system, responsive and
accessibility audits, shared chart/motion primitives, and reduced-motion
behavior. Commit 72a959b removed html2pdf and chose browser-print HTML;
pdfTemplates.js centralizes report templates and openPrintWindow() opens the
browser printer. That avoids a backend PDF generator but makes output depend on
browser/print settings.

**Unverified:** Whether browser-only export was chosen for privacy, dependency
removal, cost, or implementation speed.

## ADR-012: Hardening for a public source release

**Status:** Evidenced.

**Context.** Before publishing the repository, an external review and a
re-check against the code found cross-user data access, unbounded paid and
expensive endpoints, and leakage of internals. The project still targets a
single local process, so fixes are deliberately dependency-free.

**Decisions.**
- Ownership: saved_screeners gained user_id (init_db adds it to old
  databases); deleting a watchlist stock joins to Watchlist and checks the
  owner; pattern scans use uuid4 ids and an owner map kept out of responses.
- Abuse limits: rate_limit.py is an in-memory sliding window used for login
  (10/min/IP), register (5/h/IP), AI (10/min/user, shared with portfolio
  AI review) and screener (5/min/user). At most two screener runs execute at
  once server-wide; one pattern scan per user. AI bodies, holdings, screener
  conditions and limits are size-capped.
- Auth: is_active is enforced at login and on every token; passwords must be
  8-128 characters. Errors are returned as plain strings the UI can render.
- Information leakage: HTTP errors no longer include str(e); the detail goes
  to the server log. The live TOTP is no longer printed. The unused anonymous
  /ws socket was deleted.
- AI integrity: scraped headlines are flattened, truncated and placed inside
  untrusted-data tags that the system prompt says never carry instructions.
- Angel One: login is skipped when credentials are blank, and stops after the
  broker rejects them, because every quote lookup used to retry the login and
  Angel One locks an account after five bad attempts.
- Supply chain: Python dependencies pinned with ==, pip-audit and npm audit
  run in CI with gitleaks, Dependabot opens update PRs.

**Consequences.** Limits reset on restart and are per process; JWTs are still
in localStorage without revocation. Both are acceptable locally and listed in
SECURITY.md as work required before any hosted deployment.

## Open questions that must remain open

1. Why SQLite, Angel One, Groq, the 1.5 ATR multiplier, and the 4% fallback
   were chosen.
2. Whether Gemini, GLM-5.2, OpenAI, or other models were evaluated.
3. Any reproducible screener performance baseline or target.
4. ~~Whether shared saved screeners are intentional.~~ Resolved by ADR-012:
   they are now per user.
5. Data-license/retention rules for current scraping.
