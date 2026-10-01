from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from accounts.models import get_profile
from categories.models import Category
from sitecontent.models import Challenge
from stories.models import Story


# ---------------------------------------------------------------
#     python manage.py e2e_seed      (only with DJANGO_SQLITE_NAME=e2e.sqlite3)
#
# Empties the BROWSER-TEST database and fills it with known test data:
# three members, a few stories, a challenge. The browser tests
# (frontend/e2e/) start it by themselves - you don't need to run it.
#
# SAFETY: it refuses to run on any other database - it deletes
# everything first, and must never do that to your real data.
# ---------------------------------------------------------------
PASSWORD = 'E2e-Pass-2026!'


class Command(BaseCommand):
    help = 'Reset the browser-test database (e2e.sqlite3) and fill it with test data.'

    def handle(self, *args, **options):
        name = str(settings.DATABASES['default']['NAME'])
        if not name.endswith('e2e.sqlite3'):
            raise CommandError(f'Refusing to run on {name} - this command deletes everything. '
                               'Set DJANGO_SQLITE_NAME=e2e.sqlite3 first.')

        call_command('flush', interactive=False, verbosity=0)
        call_command('seed_categories', verbosity=0)
        User = get_user_model()

        def member(username, **extra):
            user = User.objects.create_user(username, f'{username}@example.com', PASSWORD, **extra)
            profile = get_profile(user)
            profile.email_verified = True
            profile.save()
            return user

        member('e2e_reader')
        writer = member('e2e_writer')
        member('e2e_admin', is_staff=True, is_superuser=True)
        # A reader who already has Pro (switched on by hand, like an
        # admin would) - for the Pro early-access test.
        pro = member('e2e_pro')
        pro_profile = get_profile(pro)
        pro_profile.is_premium = True
        pro_profile.save()

        category = Category.objects.first()
        paragraph = 'The house at the end of Mercer Lane had been empty for eleven years. ' * 8
        Story.objects.create(
            title='The Mercer Lane House', author=writer, category=category, is_published=True,
            excerpt='Nobody had lived there for eleven years.',
            body=f'{paragraph}\n\n!!scare\n\n{paragraph}\n\nThen the lights came on.',
        )
        Story.objects.create(
            title='The Cellar Door', author=writer, category=category, is_published=True,
            body='Something scratches below.\n[[choice: Open the door -> cellar]]\n[[choice: Run upstairs -> upstairs]]\n\n'
                 '[[section: cellar]]\nThe stairs go down too far.\n\n[[section: upstairs]]\nYou lock the bathroom door.',
        )
        Challenge.objects.create(title='The Knock', theme='Write about a knock at 3am.', deadline=timezone.now() + timedelta(days=7))
        self.stdout.write(self.style.SUCCESS('Browser-test database ready.'))
