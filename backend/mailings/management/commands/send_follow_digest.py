from django.core.management.base import BaseCommand

from mailings.follow_digest import send_follow_digests


# ---------------------------------------------------------------
#     python manage.py send_follow_digest
#
# Once a day (e.g. a Render Cron Job, schedule  0 7 * * *  = 07:00):
# every member gets the new stories by the writers they follow.
# See mailings/follow_digest.py.
# ---------------------------------------------------------------
class Command(BaseCommand):
    help = 'Email members the new stories from writers they follow (last 24 hours).'

    def handle(self, *args, **options):
        count = send_follow_digests()
        self.stdout.write(self.style.SUCCESS(f'Sent {count} "writers you follow" emails.'))
