# Slack Standup Digest

Prepare a Slack-ready status digest from Goal Maker receipts.

This extension is credential-gated for live Slack delivery but useful locally without credentials. It helps a Goal Maker run summarize completed work, active blockers, verification status, and next steps in Slack-ready Markdown. It does not send a message by default.

## Use When

- A team wants a short async status update from a long-running goal.
- A blocked task needs clear owner-visible context.
- The PM needs to share progress without making Slack board truth.

## Inputs

- `docs/goals/<slug>/goal.md`
- `docs/goals/<slug>/state.yaml`
- Receipt notes
- `git status --short`
- Last verification output

## Output

A Slack-ready standup digest with:

- Goal title and current status
- Completed slices
- Verification summary
- Blockers and missing credentials
- Next planned task
- Optional live-send instructions

## Configuration

Live Slack delivery, if added later, requires:

- `SLACK_BOT_TOKEN`

## Boundaries

- `state.yaml` remains authoritative.
- Missing Slack credentials should block only live send, not local digest generation.
- This extension does not send Slack messages by default.
- Live delivery requires explicit approval and a separate Worker task.
