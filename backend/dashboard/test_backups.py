import tempfile
import zipfile
from io import StringIO
from pathlib import Path

from django.contrib.auth.models import User
from django.core.management import call_command
from django.test import TestCase, override_settings

from stories.models import Story


# Tests for backup_site / restore_site. Run with:  python manage.py test
# Everything happens in a temporary folder, so your real backups and
# pictures are never touched.

class BackupTests(TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        root = Path(self.folder.name)
        self.backups = root / 'backups'
        self.media = root / 'media'
        (self.media / 'avatars').mkdir(parents=True)
        (self.media / 'avatars' / 'raven.png').write_bytes(b'pretend picture')
        # Use the temporary folders for this test only.
        self.settings_override = override_settings(BACKUP_DIR=self.backups, MEDIA_ROOT=self.media)
        self.settings_override.enable()

    def tearDown(self):
        self.settings_override.disable()
        self.folder.cleanup()

    def test_backup_then_restore_brings_everything_back(self):
        writer = User.objects.create_user('raven', password='Str0ng-pass-123')
        Story.objects.create(title='The House on Wren Street', body='x', author=writer, is_published=True)

        call_command('backup_site', stdout=StringIO())
        backup = next(self.backups.glob('backup-*.zip'))
        with zipfile.ZipFile(backup) as archive:
            self.assertIn('data.json', archive.namelist())
            self.assertIn('media/avatars/raven.png', archive.namelist())

        # Disaster: everything is gone.
        User.objects.all().delete()
        (self.media / 'avatars' / 'raven.png').unlink()

        call_command('restore_site', str(backup), yes=True, stdout=StringIO())
        self.assertTrue(Story.objects.filter(title='The House on Wren Street', author__username='raven').exists())
        self.assertEqual((self.media / 'avatars' / 'raven.png').read_bytes(), b'pretend picture')

    def test_only_the_newest_are_kept(self):
        for name in ['backup-2026-01-01-000000.zip', 'backup-2026-02-01-000000.zip', 'backup-2026-03-01-000000.zip']:
            self.backups.mkdir(exist_ok=True)
            (self.backups / name).write_bytes(b'old')
        call_command('backup_site', keep=2, stdout=StringIO())
        left = sorted(path.name for path in self.backups.glob('backup-*.zip'))
        self.assertEqual(len(left), 2)
        self.assertNotIn('backup-2026-01-01-000000.zip', left)
