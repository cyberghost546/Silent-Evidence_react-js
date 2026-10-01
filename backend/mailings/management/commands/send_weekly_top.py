from django.core.management.base import BaseCommand

from mailings.weekly_top import send_weekly_top


# ---------------------------------------------------------------
#     python manage.py send_weekly_top
#
# Emails the "Top of the week" (mailings/weekly_top.py). Meant for a
# scheduler every Monday morning - e.g. a Render Cron Job with the
# schedule  0 8 * * 1  (08:00 on Mondays), see DEPLOY.md.
# A quiet week (no story was read) sends nothing.
# ---------------------------------------------------------------
class Command(BaseCommand):
    help = 'Email the top stories, villain and sprinters of the week to members with the Weekly Digest on.'

    def handle(self, *args, **options):
        count = send_weekly_top()
        if count:
            self.stdout.write(self.style.SUCCESS(f'Sent Top of the Week to {count} members.'))
        else:
            self.stdout.write('Nothing sent - no stories were read this week (or nobody has the digest on).')
