from django.db import migrations


# A "data migration": it makes the three boards from the Forums menu
# (Header.jsx), so they exist on EVERY database - yours, the tests',
# and the live site's - without typing them in by hand.
BOARDS = [
    ('general', 'General Discussion', 'Anything horror: books, films, the story that kept you up all night.', 1),
    ('cold-cases', 'Cold Cases', 'Unsolved mysteries and strange true events. Be respectful - real people were involved.', 2),
    ('theories', 'Theories', "What REALLY happened at the end? Share your theories about the site's stories.", 3),
]


def make_boards(apps, schema_editor):
    Board = apps.get_model('forums', 'Board')
    for slug, name, description, order in BOARDS:
        Board.objects.get_or_create(slug=slug, defaults={'name': name, 'description': description, 'order': order})


class Migration(migrations.Migration):

    dependencies = [
        ('forums', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(make_boards, migrations.RunPython.noop),
    ]
