# dsh-host-paths

**Drop a file into DSH Desktop and get an `@path` reference in the composer — not an uploaded copy.**

[dsh-host-paths](https://github.com/384124694/dsh-host-paths) does exactly one thing: it republishes the Desktop shell's
file-path bridge (`window.__DSH_DESKTOP_FILE_PATH__`) as the host-path seam the composer already
reads (`globalThis.__DSH_HOST_PATHS__`). Once that seam answers, the stock composer turns dropped
files into `@path` chips on its own — no event hijacking, and no plugin reading your files.

## The problem

The composer has two mutually exclusive landing paths for a drop
(`addFiles` in `dsh-client-ui-conversation`):

```
path = hostPathBridge()?.pathFor(file) ?? ""
path === "" || image      → upload (file draft, materialized into the session attachment store)
otherwise                 → @path reference chip (nothing uploaded)
```

Nothing in DSH Desktop ever writes `__DSH_HOST_PATHS__`: the shell only exposes
`__DSH_DESKTOP_FILE_PATH__` (Electron's `webUtils.getPathForFile`). The second branch is therefore
dead code in practice, and every drop uploads — even though Electron knows the real path.

This plugin is the one line that connects the two names.

## What changes

| You do this | Result |
| --- | --- |
| Drop a non-image file (docx / xlsx / pdf / zip…) | an `@absolute-path` chip appears, **zero upload, zero copy**; relative to the workspace cwd when the file is inside it |
| Drop a folder | a `@path/` folder chip |
| Drop an image | still uploads through the native image channel (by design: thumbnails, dimension probe, per-message limits) |
| Drop a path containing spaces | quoted automatically as `@"a path with spaces.docx"` |
| The shell cannot answer (OneDrive placeholders, files dragged out of archives, a plain browser) | falls back to the stock upload; nothing errors |

It does **not** read file contents, copy, move, delete, or touch the network, registers no host
service, and never overwrites a seam that is already installed (a future DSH that wires it itself
wins automatically).

## Install

```sh
# from GitHub (pin a commit)
dsh plugin --profile desktop add github:384124694/dsh-host-paths#<sha>

# from a local checkout
git clone https://github.com/384124694/dsh-host-paths.git
dsh plugin --profile desktop add link:$HOME/dsh-host-paths
```

Use the profile you actually run (`desktop` for DSH Desktop, `web` for a standalone `dsh web`).
**Restart DSH Desktop (or `dsh web`) and refresh the page** — the browser half is compiled into
`__DSH_BOOT__` at startup. The build output (`lib/`) is committed; there is no build step.

## Verify

In the DevTools console:

```js
window.__DSH_HOST_PATHS__                                  // { pathFor: ƒ } once installed
typeof window.__DSH_DESKTOP_FILE_PATH__?.getPathForFile     // "function"
```

Then drop a non-image file: an `@path` chip should appear in the composer and **no file card**
(that would be an upload) above it.

## Uninstall

```sh
dsh plugin --profile desktop remove dsh-host-paths
```

After a restart the seam is gone and drops return to stock behaviour.

## Development

```sh
npm test        # node --test: 7 behaviour tests, no DSH server needed
```

`lib/client.js` is a hand-written classic script (`window.__ModuleLoader__.load({ id, factory })`)
with no build step: edit it and restart the profile. `lib/index.js` is an empty host half, present
only so the bundle has a loader entry and the client half is discovered.

## Known limits

- **Desktop-only by nature.** A plain browser has no path bridge, so the seam is never installed and
  drops keep uploading. The plugin does not pretend otherwise.
- **Images still upload**, by the composer's own design.
- Reference paths are relative to the workspace cwd when they point inside it, absolute otherwise.
- If a future DSH defines `__DSH_HOST_PATHS__` itself, this plugin detects the existing value and
  leaves it alone.

## License

MIT
