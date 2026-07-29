# Snyk Code — Talk Track

**Verified:** 16 findings across 15 rule types.

```bash
snyk code test
```

## The story

Open Source finds what you borrowed. Code finds what you wrote. This is the
section that lands hardest in a demo, because every finding is in a file someone
on the team owns.

## Lead with the live exploit

Don't start with a report. Start with the browser. With `npm run dev` running,
paste this into the address bar:

```
http://localhost:5173/?note=%3Cimg%20src%3Dx%20onerror%3Dalert(document.domain)%3E
```

An alert fires. Then show the eight lines that caused it in
[src/components/SharedNote.jsx](../src/components/SharedNote.jsx):

```jsx
const params = new URLSearchParams(window.location.search)
const shared = params.get('note')
<div dangerouslySetInnerHTML={{ __html: marked(shared) }} />
```

Snyk Code reports this as **DOM-based Cross-site Scripting** and traces the full
path from `window.location` to `dangerouslySetInnerHTML`. The feature looks
completely reasonable — share a draft note as a link. That's the point: it isn't
sloppy code, it's a missing sanitizer.

> "This is a link. I could put it in a Slack message. Your SCA tool won't find
> it, your linter won't find it, and it passes code review because it reads fine."

## The full finding list

All 15 rule types, by file:

**[server/routes/admin.js](../server/routes/admin.js)** — four injection classes in one file
- **Command Injection** — `req.body.label` interpolated into an `exec()` string
- **Path Traversal** — `req.query.file` joined onto a directory with no containment check
- **SSRF** — `axios.get(req.query.url)` on an arbitrary user-supplied URL
- **Open Redirect** — `res.redirect(req.query.to)` unvalidated
- **Allocation of Resources Without Limits or Throttling**

**[server/routes/auth.js](../server/routes/auth.js)** — the credential-handling cluster
- **Hardcoded Secret** — the JWT signing key, committed
- **Use of Hardcoded Passwords**
- **Hardcoded Non-Cryptographic Secret**
- **Use of Password Hash With Insufficient Computational Effort** — unsalted MD5
- **Insecure JWT Verification Method** — `jwt.decode()` instead of `jwt.verify()`, so
  signatures are never checked and any forged token is trusted

**[server/routes/todos.js](../server/routes/todos.js)**
- **SQL Injection** — `req.query.q` concatenated into a `WHERE ... LIKE` clause
- **Improper Type Validation** — the `_.merge(todo, req.body)` prototype pollution path

**[src/api.js](../src/api.js)**
- **Hardcoded Non-Cryptographic Secret** — an API token in frontend source, which
  ships to every browser

**[server/index.js](../server/index.js)**
- **Information Exposure — X-Powered-By Header**

**[src/components/SharedNote.jsx](../src/components/SharedNote.jsx)**
- **DOM-based Cross-site Scripting**

## The two-products-one-bug moment

The best transition in the whole demo. The XSS has *two* root causes:

1. `marked@0.3.6` doesn't sanitize — **Snyk Open Source** finds this
2. The output goes into `dangerouslySetInnerHTML` — **Snyk Code** finds this

Fixing either one mitigates it. Fixing both is correct. One bug, two products,
two independent fixes — that's the platform argument made concrete rather than
asserted.

## The SQL injection nuance

In [server/routes/todos.js](../server/routes/todos.js), the vulnerable query only
executes when `DATABASE_URL` is set; otherwise the route falls back to an
in-memory filter. Snyk Code flags it regardless, because the taint path exists in
the source.

This is worth calling out rather than hiding — it's a genuine SAST strength.
The vulnerability is dormant in dev and live in prod, which is exactly the class
of bug that reaches production. A DAST scan of the running dev app would miss it.

## Prompts to surface more

```
Add an authenticated file-upload endpoint to server/ that stores attachments for a todo, then run snyk code test and show me every new finding it introduces.
```

```
Add server-side rendering of todo notes using handlebars with a user-controlled template string, then scan. I want to see how Snyk Code reports template injection.
```

```
Introduce a second-order SQL injection: store user input in one request, then use it unsanitized in a query on a later request. Does Snyk Code trace it across both handlers?
```

```
Write an XML import endpoint that parses uploaded XML with external entities enabled, then scan for XXE.
```

```
Fix only the DOM XSS in SharedNote.jsx, leaving marked at 0.3.6. Re-run snyk code test and snyk test, and explain what each product now says.
```

```
For each Snyk Code finding, write the minimal patch and a test that fails before it and passes after. Do the injection findings in server/routes/admin.js first.
```

## Likely objections

**"Our SAST tool already does this."** Fair. The differentiators to probe are
false-positive rate and whether it runs in the IDE at authoring time. Offer to
run their existing tool on this same repo side by side — this repo is a decent
neutral benchmark, and the 15 rule types here are all genuinely exploitable
rather than style complaints.

**"These are obviously fake bugs."** True, and say so plainly — every one is
labeled `DEMO VULN` in a comment. The honest framing is that the *patterns* are
drawn from real incidents; the value is watching the tool trace source to sink,
not pretending someone shipped this.
