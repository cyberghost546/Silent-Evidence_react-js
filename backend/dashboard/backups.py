import os
import tempfile
import zipfile
from datetime import datetime
from pathlib import Path

from django.conf import settings
from django.core.management import call_command


# ---------------------------------------------------------------
# BACKUPS - the whole site in ONE .zip file:
#
#   backup-2026-09-27-1530.zip
#     data.json   <- every row of the database (users, stories, comments...)
#     media/...   <- the uploaded pictures (avatars, covers, slides)
#
# Used by:  python manage.py backup_site     (make one)
#           python manage.py restore_site <file.zip>   (put one back)
#
# data.json comes from Django's own "dumpdata", so it works the same
# for SQLite (your computer) and Postgres (the live site) - you can
# even move from one to the other with it.
# ---------------------------------------------------------------

# Where backups go (and are kept). Not in git - see .gitignore.
# A function (not a variable) so it reads the setting every time -
# the tests change it to a temporary folder.
def backup_dir():
    return Path(getattr(settings, 'BACKUP_DIR', settings.BASE_DIR / 'backups'))


# Rows Django makes by itself on "migrate" - copying them would clash.
# Sessions = who is logged in right now: not worth keeping.
SKIP = ['contenttypes', 'auth.permission', 'sessions.session', 'admin.logentry']


def make_backup(keep=10):
    backup_dir().mkdir(parents=True, exist_ok=True)
    name = f"backup-{datetime.now().strftime('%Y-%m-%d-%H%M%S')}.zip"
    path = backup_dir() / name

    with tempfile.TemporaryDirectory() as folder:
        data_file = Path(folder) / 'data.json'
        # natural keys = refer to users by USERNAME instead of id number,
        # so the file still works in a database with other ids.
        call_command(
            'dumpdata',
            exclude=SKIP,
            natural_foreign=True,
            natural_primary=True,
            indent=1,
            output=str(data_file),
            verbosity=0,
        )

        # ZIP_DEFLATED = compress it (JSON shrinks a lot).
        with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as archive:
            archive.write(data_file, 'data.json')
            media = Path(settings.MEDIA_ROOT)
            if media.exists():
                for file in media.rglob('*'):
                    if file.is_file():
                        # 'media/avatars/me.jpg' inside the zip.
                        archive.write(file, Path('media') / file.relative_to(media))

    remove_old_backups(keep)
    return path


# Keep only the newest `keep` backups, so the disk doesn't fill up.
def remove_old_backups(keep):
    backups = sorted(backup_dir().glob('backup-*.zip'))   # the date in the name sorts them
    for old in backups[:-keep] if keep > 0 else []:
        old.unlink()


def restore_backup(path):
    path = Path(path)
    with zipfile.ZipFile(path) as archive, tempfile.TemporaryDirectory() as folder:
        archive.extract('data.json', folder)
        # loaddata = put the rows back. Rows with the same id/username
        # are overwritten with the backup's version.
        call_command('loaddata', os.path.join(folder, 'data.json'), verbosity=0)

        media = Path(settings.MEDIA_ROOT)
        for member in archive.namelist():
            if member.startswith('media/') and not member.endswith('/'):
                target = media / Path(member).relative_to('media')
                # Safety: never write outside the media folder (a zip
                # can contain names like "../../settings.py").
                if media.resolve() not in target.resolve().parents:
                    continue
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(archive.read(member))
