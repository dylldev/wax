import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLatestRelease } from '../release.mjs';

const base = 'https://github.com/dylldev/wax-signer/releases/';
function release(dev = true) {
  const names = ['Wax-0.17.0.ipa', 'Wax-0.17.0.ipa.sha256'];
  if (dev) names.push('Wax-Dev-0.17.0.ipa', 'Wax-Dev-0.17.0.ipa.sha256');
  return { tag_name: 'v0.17.0', draft: false, prerelease: false,
    html_url: base + 'tag/v0.17.0',
    assets: names.map(name => ({name, state: 'uploaded', size: 100,
      browser_download_url: base + 'download/v0.17.0/' + name})) };
}

test('a new stable release updates both exact variant assets', () => {
  const result = parseLatestRelease(release());
  assert.equal(result.version, '0.17.0');
  assert.equal(result.standard.download, base + 'download/v0.17.0/Wax-0.17.0.ipa');
  assert.equal(result.development.checksum, base + 'download/v0.17.0/Wax-Dev-0.17.0.ipa.sha256');
});
test('missing Dev is explicit instead of reusing an old Dev download', () => {
  assert.equal(parseLatestRelease(release(false)).development, null);
});
test('draft and prerelease payloads cannot replace stable downloads', () => {
  for (const flag of ['draft', 'prerelease']) {
    const data = release(); data[flag] = true;
    assert.throws(() => parseLatestRelease(data));
  }
});
test('only exact release URLs in the Wax source repository are accepted', () => {
  for (const bad of ['https://evil.invalid/Wax-0.17.0.ipa',
    base + 'download/v0.16.3/Wax-0.17.0.ipa',
    'javascript:alert(1)']) {
    const data = release(); data.assets[0].browser_download_url = bad;
    assert.throws(() => parseLatestRelease(data));
  }
});
test('an incomplete standard release leaves the previous links available', () => {
  const data = release(); data.assets = data.assets.filter(a => a.name !== 'Wax-0.17.0.ipa.sha256');
  assert.throws(() => parseLatestRelease(data));
});
test('untrusted tag and release-page URLs are refused', () => {
  for (const patch of [{tag_name: '../other'}, {html_url:'https://evil.invalid/release'}]) {
    assert.throws(() => parseLatestRelease({...release(), ...patch}));
  }
});

test('an attached Dev IPA without its checksum is not offered as verified', () => {
  const data = release();
  data.assets = data.assets.filter(a => a.name !== 'Wax-Dev-0.17.0.ipa.sha256');
  assert.equal(parseLatestRelease(data).development, null);
});
