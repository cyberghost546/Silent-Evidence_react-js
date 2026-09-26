from django.core.management.base import BaseCommand

from mailings.digests import send_digests


# ---------------------------------------------------------------
# A "management command" = your own  python manage.py <name>.
# The file name is the command name:
#
#     python manage.py send_comment_digests weekly
#     python manage.py send_comment_digests daily
#
# Meant to be run by a scheduler, e.g. Windows Task Scheduler (or
# cron on Linux): daily every morning, weekly every Monday.
# ---------------------------------------------------------------
class Command(BaseCommand):
    help = 'Email every member the new comments on their stories (daily or weekly).'

    def add_arguments(self, parser):
        # choices = anything else is refused with a clear message.
        parser.add_argument('period', choices=['daily', 'weekly'])

    def handle(self, *args, **options):
        run = send_digests(options['period'])
        self.stdout.write(self.style.SUCCESS(f'Sent {run.emails_sent} {run.period} digest emails.'))
