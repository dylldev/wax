const repository = 'https://github.com/dylldev/wax-signer/releases/';

export function parseLatestRelease(release) {
  if (!release || release.draft !== false || release.prerelease !== false ||
      !/^v\d+\.\d+\.\d+$/.test(release.tag_name) || !Array.isArray(release.assets)) {
    throw new Error('Not a stable Wax release');
  }
  const version = release.tag_name.slice(1);
  const page = repository + 'tag/' + release.tag_name;
  if (release.html_url !== page) throw new Error('Unexpected release page');
  function variant(prefix) {
    const name = `${prefix}-${version}.ipa`;
    const urls = [name, name + '.sha256'].map(name => {
      const asset = release.assets.find(asset => asset?.name === name);
      const expected = repository + 'download/' + release.tag_name + '/' + name;
      return asset?.state === 'uploaded' && asset.size > 0 &&
        asset.browser_download_url === expected ? expected : null;
    });
    return urls.every(Boolean) ? {download: urls[0], checksum: urls[1]} : null;
  }
  const standard = variant('Wax');
  if (!standard) throw new Error('Standard IPA or checksum missing');
  return {version, page, standard, development: variant('Wax-Dev')};
}

async function refreshDownloads() {
  const status = document.querySelector('[data-release-status]');
  status.textContent = 'Checking GitHub for the latest stable release…';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch('https://api.github.com/repos/dylldev/wax-signer/releases/latest', {
      signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer',
      headers: {Accept: 'application/vnd.github+json'}
    });
    if (!response.ok) throw new Error('Release check unavailable');
    const release = parseLatestRelease(await response.json());
    for (const variant of ['standard', 'development']) {
      const asset = release[variant];
      for (const kind of ['download', 'checksum']) {
        const link = document.querySelector(`[data-${kind}="${variant}"]`);
        link.hidden = !asset;
        if (asset) link.href = asset[kind];
        else link.removeAttribute('href');
      }
      document.querySelector(`[data-release-meta="${variant}"]`).textContent = asset
        ? `Version ${release.version} · Unsigned IPA · Check release notes for requirements`
        : `No verified Wax Dev download is available for version ${release.version}.`;
    }
    document.querySelector('[data-dev-unavailable]').hidden = Boolean(release.development);
    const notes = document.querySelector('[data-release-notes]');
    notes.href = release.page;
    notes.textContent = `Read the ${release.version} release notes ↗`;
    status.textContent = `Latest stable release: Wax ${release.version}. Downloads checked with GitHub.`;
  } catch {
    status.textContent = 'Could not check for updates. The links shown are the verified 0.16.3 downloads; check the latest release for newer builds.';
  } finally {
    clearTimeout(timer);
  }
}

if (typeof document !== 'undefined') refreshDownloads();
