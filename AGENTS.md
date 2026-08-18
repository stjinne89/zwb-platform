<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Deployment workflow

Netlify credits are limited. Work locally by default: make changes, run local checks, and leave commits unpushed unless the user explicitly asks to push or deploy.

## Product copy

Keep application interfaces concise. Do not add explanatory or technical help
text inside forms or feature screens. Put necessary guidance on `/hulp` and
privacy-related explanations in the privacy statement.

## PLAN.md is mandatory

`PLAN.md` is the project's memory. Every round of work must be recorded there —
not only large features, but also renames, schema changes and deliberate
decisions not to build something.

**Update `PLAN.md` in the same commit as the code it describes.** Do not defer it
to "later" and do not treat it as optional documentation. A round that is not in
`PLAN.md` is invisible to the next person, and this project has already lost two
weeks of history that way: twenty-five commits landed without a single line in
the plan, including whole features.

Per round, record:

- **Date and commit hash**, plus any migration numbers.
- **What changed and why** — the reason matters more than the file list.
- **What was deliberately *not* built**, and on what grounds. A parked idea
  without a reason gets proposed again a year later.
- **Claims that are no longer true.** When a change invalidates something written
  earlier in `PLAN.md`, correct that sentence instead of only appending. A stale
  claim is worse than a missing one.
- **Anything that cannot be verified locally**, such as migrations (there is no
  Docker or Supabase config here), so nobody presents it as tested.

Keep detailed research in `docs/` and link the conclusion from `PLAN.md`. Move
finished rounds out of the active work plan into the delivered list or the
historical roadmap, so the top of the document stays the current order of work.

Future plans and parked ideas that are not yet code belong in the shared
plannenboek document in the owner's Drive, not in `PLAN.md`.
