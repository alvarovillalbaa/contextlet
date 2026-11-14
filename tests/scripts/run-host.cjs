'use strict';
const { runTests, downloadAndUnzipVSCode, resolveCliArgsFromVSCodeExecutablePath } = require('@vscode/test-electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

(async () => {
  const scratch = process.env.CONTEXTLET_SCRATCH;
  const receipt = process.env.CONTEXTLET_OUTPUT;
  if (!scratch || !receipt) throw new Error('Explicit owned scratch/output required');
  const executable = await downloadAndUnzipVSCode({ version: '1.95.3', cachePath: path.join(scratch, 'vscode') });
  const [cli, ...cliArgs] = resolveCliArgsFromVSCodeExecutablePath(executable);
  const vsix = path.join(receipt, 'contextlet-0.1.0.vsix');
  const extensions = path.join(scratch, 'extensions');
  const userData = path.join(scratch, 'profile');
  const cliResult = spawnSync(cli, [...cliArgs, '--install-extension', vsix, '--extensions-dir', extensions, '--user-data-dir', userData, '--disable-telemetry', '--no-sandbox'], { timeout: 90000, maxBuffer: 2 * 1024 * 1024 });
  await fs.writeFile(path.join(receipt, 'install.stdout.txt'), cliResult.stdout || Buffer.alloc(0), { flag: 'wx' });
  await fs.writeFile(path.join(receipt, 'install.stderr.txt'), cliResult.stderr || Buffer.alloc(0), { flag: 'wx' });
  assert.equal(cliResult.status, 0, `VSIX installation failed: ${cliResult.error || cliResult.signal || cliResult.status}`);
  const installed = path.join(extensions, 'alvarovillalbaa.contextlet-0.1.0');
  const source = path.resolve(__dirname, '../..');
  const bound = [];
  for (const [file, installedName] of [['package.json', 'package.json'], ['src/core.cjs', 'src/core.cjs'], ['src/extension.cjs', 'src/extension.cjs'], ['README.md', 'readme.md'], ['LICENSE', 'LICENSE.txt'], ['CHANGELOG.md', 'changelog.md']]) {
    const [expected, actual] = await Promise.all([fs.readFile(path.join(source, file)), fs.readFile(path.join(installed, installedName))]);
    if (file === 'package.json') {
      await fs.writeFile(path.join(receipt, 'installed-manifest.json'), actual, { flag: 'wx' });
      const manifest = JSON.parse(actual);
      delete manifest.__metadata;
      assert.deepEqual(manifest, JSON.parse(expected), 'all installed product manifest fields must match source');
    } else if (!actual.equals(expected)) throw new Error(`Installed payload differs: ${file}`);
    bound.push({ file, installedName, comparison: file === 'package.json' ? 'all product fields; installer __metadata excluded' : 'exact bytes', bytes: actual.length, sha256: crypto.createHash('sha256').update(actual).digest('hex'), sourceSha256: crypto.createHash('sha256').update(expected).digest('hex') });
  }
  await fs.writeFile(path.join(receipt, 'installed-payload.json'), JSON.stringify(bound, null, 2), { flag: 'wx' });
  const fixture = path.join(scratch, 'authored-workspace');
  await fs.mkdir(fixture);
  await fs.writeFile(path.join(fixture, 'example.js'), 'const answer = 42;\nconsole.log(answer);\n');
  await fs.writeFile(path.join(fixture, 'problems.js'), 'const authored = true;\n');
  await fs.writeFile(path.join(fixture, '.env.local'), 'AUTHORED_NOT_A_SECRET=fixture\n');
  await fs.writeFile(path.join(fixture, 'large.txt'), 'a'.repeat(65537));
  await fs.writeFile(path.join(scratch, 'outside.js'), 'const outside = true;\n');
  await fs.symlink(path.join(scratch, 'outside.js'), path.join(fixture, 'escape.js'));
  process.env.CONTEXTLET_FIXTURE_ROOT = fixture;
  process.env.CONTEXTLET_HOST_RESULT = path.join(receipt, 'host-result.json');
  await runTests({ vscodeExecutablePath: executable, extensionDevelopmentPath: installed,
    extensionTestsPath: path.join(source, 'tests/integration/suite.cjs'),
    launchArgs: [fixture, '--user-data-dir', userData, '--extensions-dir', extensions, '--disable-extensions', '--disable-workspace-trust', '--skip-welcome', '--skip-release-notes', '--disable-telemetry', '--disable-updates', '--no-sandbox', '--disable-gpu'] });
})().catch(error => { console.error(error); process.exitCode = 1; });
