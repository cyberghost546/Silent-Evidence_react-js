from django.db import migrations


# ---------------------------------------------------------------
# Switches on Postgres's "pg_trgm" extension, which the search uses
# for typo tolerance (stories/search.py). Only on Postgres (the live
# site) - on SQLite (your computer) this does nothing.
# ---------------------------------------------------------------
def turn_on(apps, schema_editor):
    if schema_editor.connection.vendor == 'postgresql':
        schema_editor.execute('CREATE EXTENSION IF NOT EXISTS pg_trgm')


class Migration(migrations.Migration):

    dependencies = [
        ('stories', '0026_readalongmessage_is_hidden'),
    ]

    operations = [
        # reverse_code: undoing this migration does nothing (the
        # extension can stay - other things might use it).
        migrations.RunPython(turn_on, reverse_code=migrations.RunPython.noop),
    ]
