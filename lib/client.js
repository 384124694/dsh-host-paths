window.__ModuleLoader__.load({
	id: "dsh-host-paths",
	factory: () => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		/**
		 * The seam the stock composer reads: `dsh-client-ui-conversation` calls
		 * `globalThis.__DSH_HOST_PATHS__.pathFor(file)` for dropped, picked and
		 * pasted files. When it answers with a real disk path, a non-image file
		 * becomes an `@path` reference chip and nothing is uploaded.
		 */
		const HOST_PATHS = "__DSH_HOST_PATHS__";

		/**
		 * The seam the Desktop shell's preload exposes: Electron's
		 * `webUtils.getPathForFile`, the only way a page gets a dropped file's
		 * real path.
		 */
		const DESKTOP_FILE_PATH = "__DSH_DESKTOP_FILE_PATH__";

		/**
		 * Resolve one Web File to its operating-system path.
		 *
		 * Returns an empty string whenever the shell cannot answer. The composer
		 * treats that as "no path" and falls back to its own behaviour, so a
		 * failure here degrades to the stock upload instead of breaking the drop.
		 *
		 * @param file - the dropped, picked or pasted Web File.
		 * @returns the absolute path, or an empty string.
		 */
		function pathFor(file) {
			try {
				const bridge = globalThis[DESKTOP_FILE_PATH];
				if (bridge === undefined || typeof bridge.getPathForFile !== "function") return "";
				const value = bridge.getPathForFile(file);
				return typeof value === "string" ? value : "";
			} catch {
				return "";
			}
		}

		/**
		 * Publish the bridge as the composer's host-path seam.
		 *
		 * Idempotent, and deliberately non-destructive: if anything already
		 * defined the seam (a future DSH that wires it itself, or another
		 * plugin), this leaves it alone. The property is configurable so a later
		 * definition can still replace it.
		 *
		 * @returns whether this call installed the seam.
		 */
		function install() {
			if (globalThis[HOST_PATHS] !== undefined) return false;
			const bridge = globalThis[DESKTOP_FILE_PATH];
			if (bridge === undefined || typeof bridge.getPathForFile !== "function") return false;
			Object.defineProperty(globalThis, HOST_PATHS, {
				value: Object.freeze({ pathFor }),
				configurable: true,
				enumerable: false,
				writable: false
			});
			return true;
		}

		/** Plugin entry point: the seam only has to exist before the first drop. */
		function apply() {
			install();
		}

		exports.apply = apply;
		exports.install = install;
		exports.pathFor = pathFor;
		exports.HOST_PATHS = HOST_PATHS;
		exports.DESKTOP_FILE_PATH = DESKTOP_FILE_PATH;
		return module.exports;
	}
});
