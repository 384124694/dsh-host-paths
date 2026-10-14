/**
 * Host half of dsh-host-paths.
 *
 * Everything this plugin does happens in the browser: it republishes the
 * Desktop shell's file-path bridge (`window.__DSH_DESKTOP_FILE_PATH__`) as the
 * composer's `globalThis.__DSH_HOST_PATHS__` seam, which the stock
 * `dsh-client-ui-conversation` drop handler already reads to turn dropped
 * files, folders, picked files and pasted files into `@path` references
 * instead of uploads.
 *
 * This module exists only so the bundle has a host entry to load and the
 * client bundle is discovered through `dsh.client`. It registers nothing and
 * injects no service.
 */

export const name = 'dsh-host-paths'

export function apply() {}
