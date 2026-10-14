/**
 * Behaviour tests for the browser half.
 *
 * The bundle is a classic script that registers itself with the page's module
 * loader, so it is evaluated here in a `node:vm` context standing in for the
 * browser: a fake `window`/`globalThis`, a loader that captures the
 * registration, and the two seams under test.
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const here = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(here, '..', 'lib', 'client.js'), 'utf8')

/**
 * Evaluate the client bundle in a fresh fake browser.
 *
 * @param options - seam fixtures: `bridge` for the Desktop preload, `existing` for a seam that is already installed.
 * @returns the registered module and the sandbox it was evaluated in.
 */
function loadClient({ bridge, existing } = {}) {
	let registration
	const sandbox = { Object, Symbol, console }
	sandbox.window = sandbox
	sandbox.globalThis = sandbox
	sandbox.__ModuleLoader__ = { load: (value) => { registration = value } }
	if (bridge !== undefined) sandbox.__DSH_DESKTOP_FILE_PATH__ = bridge
	if (existing !== undefined) sandbox.__DSH_HOST_PATHS__ = existing
	vm.createContext(sandbox)
	vm.runInContext(source, sandbox, { filename: 'client.js' })
	assert.ok(registration !== undefined, 'bundle registered no module')
	return { module: registration.factory(() => { throw new Error('unexpected require') }), sandbox, id: registration.id }
}

test('registers under the package name', () => {
	const { id } = loadClient({ bridge: { getPathForFile: () => '' } })
	assert.equal(id, 'dsh-host-paths')
})

test('apply installs the seam and forwards the shell path', () => {
	const { module, sandbox } = loadClient({ bridge: { getPathForFile: () => 'D:\\同步\\招案 2026.docx' } })
	module.apply()
	const seam = sandbox.__DSH_HOST_PATHS__
	assert.equal(typeof seam.pathFor, 'function')
	assert.equal(seam.pathFor({ name: 'x' }), 'D:\\同步\\招案 2026.docx')
	assert.ok(Object.isFrozen(seam))
})

test('a shell that throws resolves to no path, not an exception', () => {
	const { module, sandbox } = loadClient({
		bridge: { getPathForFile: () => { throw new Error('not a disk-backed file') } }
	})
	module.apply()
	assert.equal(sandbox.__DSH_HOST_PATHS__.pathFor({}), '')
})

test('a non-string answer resolves to no path', () => {
	const { module, sandbox } = loadClient({ bridge: { getPathForFile: () => undefined } })
	module.apply()
	assert.equal(sandbox.__DSH_HOST_PATHS__.pathFor({}), '')
})

test('an existing seam is never overwritten', () => {
	const existing = { pathFor: () => 'C:\\kept.docx' }
	const { module, sandbox } = loadClient({ bridge: { getPathForFile: () => 'C:\\other.docx' }, existing })
	assert.equal(module.install(), false)
	module.apply()
	assert.equal(sandbox.__DSH_HOST_PATHS__, existing)
	assert.equal(sandbox.__DSH_HOST_PATHS__.pathFor({}), 'C:\\kept.docx')
})

test('without the Desktop shell the seam stays absent', () => {
	const { module, sandbox } = loadClient({})
	assert.equal(module.install(), false)
	assert.equal(sandbox.__DSH_HOST_PATHS__, undefined)
})

test('the seam is configurable so a later definition can replace it', () => {
	const { module, sandbox } = loadClient({ bridge: { getPathForFile: () => 'D:\\a.docx' } })
	module.apply()
	const descriptor = Object.getOwnPropertyDescriptor(sandbox, '__DSH_HOST_PATHS__')
	assert.equal(descriptor.configurable, true)
	assert.equal(descriptor.enumerable, false)
})
