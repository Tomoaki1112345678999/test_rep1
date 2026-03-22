# CLAUDE.md

This file provides guidance for AI assistants (Claude and others) working in this repository.

## Repository Overview

**Repository:** `Tomoaki1112345678999/test_rep1`

This repository is in its initial state. No source code, tests, or configuration files have been added yet. This document will be updated as the project evolves.

## Current State

- No source code files
- No dependency manifests (package.json, requirements.txt, etc.)
- No build or test infrastructure
- No CI/CD configuration

## Development Workflow

### Branching

- Feature branches follow the pattern: `claude/<description>-<session-id>`
- Always develop on the designated feature branch
- Never push directly to `main` or `master` without explicit permission

### Git Operations

```bash
# Push to branch
git push -u origin <branch-name>

# Fetch specific branch
git fetch origin <branch-name>
```

If push fails due to network errors, retry up to 4 times with exponential backoff (2s, 4s, 8s, 16s).

### Commit Messages

Write clear, descriptive commit messages that explain *what* changed and *why*:

```
Short summary (imperative mood, ≤72 chars)

Optional longer description if needed. Explain the motivation
and contrast with previous behavior.
```

## Conventions (to be updated as code is added)

As the project grows, document the following here:

- **Language/runtime:** TBD
- **Package manager:** TBD
- **Code style/formatter:** TBD
- **Linter:** TBD
- **Test framework:** TBD
- **How to run tests:** TBD
- **How to build:** TBD
- **Environment variables:** TBD

## AI Assistant Guidelines

- Always read files before editing them
- Prefer editing existing files over creating new ones
- Keep changes minimal and focused on the task
- Do not add comments, docstrings, or type annotations to code you did not change
- Do not refactor or "improve" code beyond what was requested
- Confirm before taking destructive or irreversible actions (force push, deleting files, etc.)
- Check for security issues (injection, XSS, SQL injection, etc.) in any code you write
