from django.core.management.base import BaseCommand, CommandError

from dashboard.backups import restore_backup


# ---------------------------------------------------------------
#     python manage.py restore_site backups/backup-2026-09-27-153000.zip
#
# Puts a backup back (see dashboard/backups.py). Best on a FRESH,
# empty database:
#     1. (new database) python manage.py migrate
#     2. python manage.py restore_site <the .zip>
# On a database that already has data, rows from the backup overwrite
# the ones with the same id - so it asks you to type "yes" first.
# ---------------------------------------------------------------
class Command(BaseCommand):
    help = 'Put a backup .zip (from backup_site) back into the database and media folder.'

    def add_arguments(self, parser):
        parser.add_argument('backup', help='The .zip file made by backup_site.')
        parser.add_argument('--yes', action='store_true', help="Don't ask - just do it.")

    def handle(self, *args, **options):
        if not options['yes']:
            answer = input('This overwrites data in the database with the backup. Type "yes" to go on: ')
            if answer.strip().lower() != 'yes':
                raise CommandError('Stopped - nothing was changed.')
        try:
            restore_backup(options['backup'])
        except FileNotFoundError:
            raise CommandError(f"Can't find {options['backup']}")
        self.stdout.write(self.style.SUCCESS('Backup restored.'))
