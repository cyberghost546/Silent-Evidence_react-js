from django.core.management.base import BaseCommand

from dashboard.backups import make_backup


# ---------------------------------------------------------------
#     python manage.py backup_site
#     python manage.py backup_site --keep 30
#
# Makes backups/backup-<date>.zip with the database + uploaded
# pictures (see dashboard/backups.py), and keeps the newest 10.
#
# Run it by hand before big changes, or every night with a scheduler
# (Windows Task Scheduler / cron / Render "Cron Job").
# ---------------------------------------------------------------
class Command(BaseCommand):
    help = 'Save the database and uploaded pictures into one .zip file.'

    def add_arguments(self, parser):
        parser.add_argument('--keep', type=int, default=10, help='How many backups to keep (older ones are deleted).')

    def handle(self, *args, **options):
        path = make_backup(keep=options['keep'])
        size = path.stat().st_size / 1024 / 1024
        self.stdout.write(self.style.SUCCESS(f'Backup saved: {path} ({size:.1f} MB)'))
