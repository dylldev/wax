"""Homepage contracts: usable downloads and setup without JavaScript."""
from html.parser import HTMLParser
from pathlib import Path
import unittest
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.elements = []
        self.text = []

    def handle_starttag(self, tag, attrs):
        self.elements.append((tag, dict(attrs)))

    def handle_data(self, data):
        self.text.append(data)


class HomepageTests(unittest.TestCase):
    def setUp(self):
        self.page = Page()
        self.page.feed((ROOT / 'index.html').read_text())
        self.copy = ' '.join(self.page.text)

    def test_downloads_choose_current_normal_and_dev_assets(self):
        links = {a.get('href') for t, a in self.page.elements if t == 'a'}
        base = 'https://github.com/dylldev/wax-signer/releases/download/v0.16.3/'
        for name in ['Wax-0.16.3.ipa', 'Wax-Dev-0.16.3.ipa']:
            self.assertIn(base + name, links)
        self.assertNotIn('Wax-0.3.2.ipa', links)
        self.assertNotIn('dylankirkgirg', (ROOT / 'index.html').read_text())

    def test_main_sections_are_linkable(self):
        ids = {a['id'] for _, a in self.page.elements if 'id' in a}
        self.assertTrue({'features', 'setup', 'downloads', 'help', 'privacy'} <= ids)

    def test_navigation_and_assets_work_under_a_pages_subpath(self):
        ids = [a['id'] for _, a in self.page.elements if 'id' in a]
        self.assertEqual(len(ids), len(set(ids)), 'Duplicate anchor IDs')
        for tag, attrs in self.page.elements:
            for key in ['href', 'src']:
                value = attrs.get(key, '')
                if not value:
                    continue
                if value.startswith('#'):
                    self.assertIn(value[1:], ids)
                elif not urlsplit(value).scheme:
                    self.assertFalse(value.startswith('/'), 'Root paths break project Pages')
                    self.assertTrue((ROOT / urlsplit(value).path).is_file(), value)
            if tag == 'iframe':
                self.fail('No embedded third-party content')
            if tag == 'script':
                self.assertEqual(attrs.get('src'), 'release.mjs')
                self.assertEqual(attrs.get('type'), 'module')
            if tag == 'link' and attrs.get('rel') == 'stylesheet':
                self.assertFalse(urlsplit(attrs.get('href', '')).scheme)

    def test_release_updates_are_loaded_exactly_once(self):
        scripts = [attrs for tag, attrs in self.page.elements if tag == 'script']
        self.assertEqual(scripts, [{'type': 'module', 'src': 'release.mjs'}])

    def test_real_preview_images_are_described(self):
        images = [a for t, a in self.page.elements if t == 'img']
        previews = [a for a in images if 'screens/' in a.get('src', '')]
        self.assertGreaterEqual(len(previews), 3)
        self.assertTrue(all(a.get('alt') for a in previews))
        self.assertIn('simulator', self.copy.lower())
        self.assertIn('may differ', self.copy.lower())


if __name__ == '__main__':
    unittest.main()
