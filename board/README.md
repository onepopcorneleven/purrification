# board/

A local, gitignored planning board. One file per workpackage, so work can be
broken down and tracked here without any of it landing in the repo history.

This file (`board/README.md`) is the one tracked exception — everything else
under `board/` is ignored by git (see `.gitignore`).

## Convention

- One markdown file per workpackage: `board/<slug>.md` (e.g. `board/phase-14-content-authoring.md`).
- Suggested shape for each file:

  ```markdown
  # <workpackage title>

  Status: idea | planned | in-progress | blocked | done

  ## Goal
  ...

  ## Notes
  ...

  ## Tasks
  - [ ] ...
  ```

- Delete or archive a file once its workpackage is done, or just leave it —
  since it's gitignored, it costs nothing to keep around locally.
