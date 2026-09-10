# Project rules

- Inspect neighboring code before changes. Reuse existing implementations, UI primitives and conventions.
- Keep the code simple and testable. No speculative abstractions or unrelated refactoring.
- Ask before major architecture changes or new dependencies.
- One primary component per file; small private implementation details may stay colocated.
- New authored files use Tommy as author. Preserve existing vendor headers.
- Keep monetary values in integer cents; never mix salary with trading PnL.
- Enforce user ownership on every server operation. Never add a production authentication bypass.
- Use relevant installed skills only. Run appropriate builds and tests and review the final diff.
- main matches the deployed site; develop integrates work; feature branches hold individual tasks.
- Use short, clear commit subjects without conventional-commit prefixes or AI product branding.
- Open a pull request from each feature branch into develop. Wait for Validate journal to pass before merging; do not push feature changes directly to develop.
- Use a separate develop-to-main release pull request. Preserve develop after release; delete completed feature branches after confirming their changes are merged.
- Use merge commits for pull requests so branch ancestry remains intact. Never squash or rebase the long-lived develop branch into main.
- main releases and deployment must stay coordinated. A GitHub merge alone does not deploy this project.
