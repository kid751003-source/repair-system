# Repository Guidelines

## Project Structure

This workspace contains `報修需求筆記.txt`, the Traditional Chinese requirements for a demo repair and issue reporting system. Use it as the source for field definitions, allowed values, access rules, and planned deliverables. The planned deliverables include a web form and report list, a Supabase schema and access policies, an Excel field reference with sample data, a six-slide proposal, and a Word user guide. Source, test, and asset directories have yet to be established.

## Development and Verification

Read the requirements from the project root with `Get-Content -LiteralPath '報修需求筆記.txt' -Encoding UTF8`. There are currently no build, lint, test, or local server commands. When introducing a toolchain, document its setup, run, and test commands alongside the implementation.

Once the demo exists, verify that a submitted report appears in the public list with a system-generated registration time. Check that category, urgency, and status values match the requirements. Using the same public client credentials as the frontend, verify that inserts and reads succeed and that updates and deletes are denied.

## Data and Access Rules

Keep sample names and locations fictional. Enable row-level security (RLS) on the Supabase reports table before exposing it to the frontend. Keep privileged keys out of client code. The demo scope covers submission and listing. Record login, responsibility for status updates, and notification channels as open decisions.

## Commits and Pull Requests

This workspace has no Git history to establish a commit convention. If version control is added, use a short, action-oriented commit subject. In pull requests, describe the requirement addressed and how you verified it. Link a related issue when available and include screenshots for visible form or list changes.
