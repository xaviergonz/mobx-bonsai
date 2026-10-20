---
name: release-tag-version
description: Release workflow for this repository. Analyze the unreleased changelog entries of mobx-bonsai (lib) and mobx-bonsai-yjs (yjs), ask once which packages to release and the semver bump of each, then update the changelog and versions, build, test the MobX matrix, commit, tag, push, hand the user the `npm publish` commands to run in their own terminal, and prepare the next release, without further confirmations.
---

# Release Tag Version

Follow this workflow only for this repository.

## Package Targets

| Key | Package name | package.json | Source dir | Publish dir | Build | Test (per `MOBX_VERSION`) |
| --- | --- | --- | --- | --- | --- | --- |
| `lib` | `mobx-bonsai` | `packages/mobx-bonsai/package.json` | `packages/mobx-bonsai/src` | `packages/mobx-bonsai` | `pnpm lib:build` | `pnpm lib:test` |
| `yjs` | `mobx-bonsai-yjs` | `packages/mobx-bonsai-yjs/package.json` | `packages/mobx-bonsai-yjs/src` | `packages/mobx-bonsai-yjs` | `pnpm yjs-lib:build` | `pnpm yjs-lib:test` |

- Release branch: `master`.
- Changelog: both packages share the root `CHANGELOG.md` (builds copy it into each package folder, where the copy is gitignored). Never edit `packages/*/CHANGELOG.md`.
- Unreleased section heading: `## Unreleased`.
- Release heading: `## <package-name> <version>` for each released package, joined with ` / ` in the order `lib`, `yjs` (e.g. `## mobx-bonsai 2.4.0 / mobx-bonsai-yjs 2.1.3`, or `## mobx-bonsai 2.4.0` alone).
- Tag: `<package-name>@v<version>` (e.g. `mobx-bonsai@v2.4.0`), one per released package.
- Release commit message: the tags of the released packages joined with `, ` (e.g. `mobx-bonsai@v2.4.0, mobx-bonsai-yjs@v2.1.3`).
- Post-publish prep commit message: `chore: prepare next release`.
- When both packages are released, always process them in the order `lib`, `yjs` (`yjs` depends on `mobx-bonsai`).
- MobX test matrix: `7 6 5 4` (same as CI).

## Interaction Contract

- Ask the user exactly once: which packages to release and the bump of each. Their answer authorizes the whole release (file edits, commits, tags, pushes and the prep commit), which satisfies the AGENTS.md rule that git write commands need express permission; do not ask for any other confirmation afterwards.
- Skip the question entirely when the skill arguments already name the packages and bumps (e.g. `lib minor`, `lib patch yjs minor`).
- The only other user action is running `npm publish` in their own terminal (see step 4) and telling you when it is done.
- Only stop and ask when a stop condition below is hit.
- The release commit must not keep an empty `## Unreleased` in the changelog; after publishing, re-add an empty `## Unreleased` as the top changelog section if there is none.

## Semver Recommendation Rules

- `major` for breaking changes (API removals, incompatible behavior changes, migration-required changes, dropping support for a MobX version).
- `minor` for backward-compatible features (including supporting a new MobX major version).
- `patch` for bug fixes, docs, tests, refactors and performance-only changes.
- If several categories appear, recommend the highest impact bump.

## Workflow

### 1. Preflight (no questions)

1. `git branch --show-current` must be `master`.
2. Tracked files must have no changes (`git status --porcelain --untracked-files=no` is empty); untracked files are fine and must never be committed.
3. `git fetch origin && git pull --ff-only origin master`.
4. Repository guard: both package.json files exist with the names in the table above and the root `CHANGELOG.md` exists. If not, stop: this skill is project-specific.
5. `npm whoami` must print a username. If it fails, the npm token in `~/.npmrc` is missing or expired: stop and tell the user to run `npm login` (or set a new token with `npm config set //registry.npmjs.org/:_authToken=<token>`) before releasing, so no tag is pushed for a release that cannot be published.

### 2. Analyze and ask once

1. Read the current version of each package and the bullets under `## Unreleased` in `CHANGELOG.md`. If there is no `## Unreleased` section or it has no bullets, stop and tell the user to add changelog entries first.
2. Find each package's last release point: the newest tag matching `<package-name>@v*` (`git tag --list '<package-name>@v*' --sort=-v:refname | head -1`); if there is none yet, the last commit that changed its version (`git log -1 --format=%H -G'"version"' -- <package.json>`). Then list what changed since then with `git log --oneline <base>..HEAD -- <source dir> <package.json>`.
3. Because the changelog is shared, attribute each unreleased bullet to `lib`, `yjs` or both, using its wording (bullets naming only one package belong to it) and the commits from the previous step. A package with neither attributed bullets nor source/package.json changes has "nothing to release"; mention it. A package with source changes but no attributed bullets is releasable, but point out the missing changelog entry.
4. Show the user, for each releasable package: current version, the bullets attributed to it, a one-line summary of the commits since its last release, and the recommended bump with its rationale.
5. Unless the arguments already answered it, ask with a single `AskUserQuestion` call containing one question per releasable package, with these options (recommended one first, labelled `(Recommended)`):
   - `<bump> → <version>` for `patch`, `minor` and `major` (three options),
   - `Skip` (do not release this package).
6. If every package is skipped, stop.
7. If `lib` gets a `major` bump and the `mobx-bonsai` peer dependency range in `packages/mobx-bonsai-yjs/package.json` excludes the new version, stop and ask how to proceed (typically also widen the range and release `yjs`).

### 3. Release commit and tags

1. For each selected package, verify the tag `<package-name>@v<version>` does not exist locally (`git rev-parse -q --verify refs/tags/<tag>`) or on origin (`git ls-remote --exit-code --tags origin refs/tags/<tag>`).
2. For each selected package, set `version` in its package.json.
3. In `CHANGELOG.md`:
   - Move the unreleased bullets attributed to the selected packages under a new release heading (see Package Targets) placed where `## Unreleased` was.
   - Bullets attributed only to a skipped package stay under `## Unreleased`, above the release heading. If none remain, remove the `## Unreleased` heading.

Then run the checks once for all selected packages (builds must run after the edits, since they copy the changelog into the package folders that get published):

1. `pnpm lint` (must report no errors).
2. The build command of each selected package, in order.
3. The test command of each selected package, in order, once per MobX version of the matrix. Spell the script name out (do not build it from a shell variable followed by `:`, since zsh treats `$var:t` as a modifier), e.g.:

   ```sh
   for mobx in 7 6 5 4; do MOBX_VERSION=$mobx pnpm lib:test || break; done
   ```

   Check that every run printed `Using mobxVersion=<n>` with the expected version and that no test failed.

If everything passes:

1. `git add CHANGELOG.md <package.json of each selected package>`
2. `git commit -m "<release commit message>"`
3. `git tag "<package-name>@v<version>"` for each selected package, in order.

Finally push: `git push origin master` and `git push origin <each tag>`.

### 4. Publish

Do not run `npm publish` yourself. Publishing needs a 2FA one-time password or browser login, and without a TTY npm does not prompt for it: it fails straight away with `EOTP` (and masks the authentication URL), so the user must run it in their own terminal.

1. Give the user, in one block, the commands to publish every selected package in order, run from the repo root, e.g.:

   ```sh
   (cd packages/mobx-bonsai && npm publish) && (cd packages/mobx-bonsai-yjs && npm publish)
   ```

   Tell them npm will show an `Authenticate your account at:` URL for each package (press ENTER to open it and log in), and to tell you when each prints `+ <package-name>@<version>`.
2. Wait for the user. If they report that a publish failed, stop and report; do not retry or undo anything automatically.
3. Once they confirm the `+ <package-name>@<version>` line for every selected package, continue with step 5.

### 5. Prepare the next release

1. If `CHANGELOG.md` has no `## Unreleased` section, insert an empty one as the top section (right after `# Change Log`, followed by a blank line), then `git add CHANGELOG.md`, `git commit -m "chore: prepare next release"` and `git push origin master`.
2. If `## Unreleased` is still there (it kept bullets of a skipped package), there is nothing to prepare; skip the prep commit.

### 6. Report

Report: the release commit SHA, each tag, the `npm publish` result the user confirmed for each package, and the prep commit SHA (or that it was not needed).

A `+ <package-name>@<version>` line from `npm publish` already confirms the publish succeeded. Do not wait or poll for the new version to show up in the registry (`npm view`, registry requests, background loops): npm may take a few minutes to make it visible, and that delay is not a failure. Finish the workflow and the report right away; at most mention that the version may take a few minutes to appear on npm.

## Stop Conditions

- Not on `master`, tracked changes present, or `master` cannot be fast-forwarded: stop and ask.
- Repository guard fails: stop.
- No unreleased bullets, no releasable package, or every package skipped: stop.
- A release tag already exists: stop and ask for a tag strategy.
- A `lib` major bump falls outside the `yjs` peer range for `mobx-bonsai`: stop and ask.
- Lint, build or tests (any MobX version) fail: stop before committing and report the failure (the edited package.json/changelog files are left uncommitted; tell the user).
- A push fails: stop and report the exact state.
- `npm whoami` fails in preflight: stop and tell the user to log in to npm.
- The user reports that `npm publish` failed: stop and report; never retry or revert automatically.
- Prep commit or its push fails: report the exact state and ask before any follow-up action.
