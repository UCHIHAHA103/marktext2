# Issue tracker: GitHub

Issues and PRDs for this repo live as GitHub issues in `UCHIHAHA103/marktext2`. Use the `gh` CLI for all operations.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue**: `gh issue view <number> --comments`
- **List issues**: `gh issue list --state open --json number,title,body,labels --jq '[.[] | {number, title, body, labels: [.labels[].name]}]'`
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --comment "..."`

## Important: push via REST API

This machine's network filters `git push`. All code pushes must use the GitHub REST API.
See `.cursor/rules/work-pc-github-ops.mdc` for the full push workflow.

## When a skill says "publish to the issue tracker"

Create a GitHub issue with `gh issue create`.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments`.
