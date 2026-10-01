# ---------------------------------------------------------------
# A CUSTOM MANAGEMENT COMMAND.
#
# This is what lets you type:
#     python manage.py seed_categories
#
# Django finds commands purely by FOLDER STRUCTURE, and it is strict:
#
#     categories/
#         management/
#             __init__.py          <- must exist, empty is fine
#             commands/
#                 __init__.py      <- must exist, empty is fine
#                 seed_categories.py
#
# Miss either __init__.py and Django silently won't see the command -
# no error message, it simply isn't in the list. The command's NAME is
# the filename, so this file has to be called seed_categories.py.
#
# Why a command instead of typing 54 rows into /admin? Because it is
# repeatable. Wipe the database, run one line, and your categories are
# back. Same on a teammate's machine, or on a server.
# ---------------------------------------------------------------

from django.core.management.base import BaseCommand

from categories.models import Category


# The data. This is your JavaScript array translated to Python:
#   - keys need quotes:  name:  ->  'name':
#   - const categories = [  ->  CATEGORIES = [
#   - no semicolon at the end
#   - comments use # instead of //
#
# ALL CAPS is the Python convention for a constant - a value that is
# set once and never changed while the program runs.
CATEGORIES = [
    # -- Psychological and Mind Horror ---------------------------
    {
        'name': 'Amnesia Horror',
        'slug': 'amnesia-horror',
        'description': 'Missing years, missing names - and the terror of what filled the gap.',
        'icon': 'brain',
        'color': 'purple',
    },
    {
        'name': 'Identity Horror',
        'slug': 'identity-horror',
        'description': 'Faces that are not yours, lives that were never really lived.',
        'icon': 'venetian-mask',
        'color': 'fuchsia',
    },
    {
        'name': 'Madness',
        'slug': 'madness',
        'description': 'The slow collapse of a mind that can no longer trust itself.',
        'icon': 'tornado',
        'color': 'rose',
    },
    {
        'name': 'Memory Horror',
        'slug': 'memory-horror',
        'description': 'Recollections that rewrite themselves - and remember you back.',
        'icon': 'history',
        'color': 'indigo',
    },
    {
        'name': 'Paranoia',
        'slug': 'paranoia',
        'description': 'Someone is watching. The worst part is being right.',
        'icon': 'eye',
        'color': 'red',
    },
    {
        'name': 'Reality Distortion',
        'slug': 'reality-distortion',
        'description': 'Rooms that rearrange, rules that break, a world coming unstitched.',
        'icon': 'orbit',
        'color': 'blue',
    },
    {
        'name': 'Unreliable Narrator',
        'slug': 'unreliable-narrator',
        'description': 'Every word is a confession. None of them are true.',
        'icon': 'drama',
        'color': 'amber',
    },

    # -- Supernatural Horror -------------------------------------
    {
        'name': 'Cursed Objects',
        'slug': 'cursed-objects',
        'description': 'Heirlooms, trinkets and gifts that take far more than they give.',
        'icon': 'gem',
        'color': 'purple',
    },
    {
        'name': 'Demonic Horror',
        'slug': 'demonic-horror',
        'description': 'Old names, older hungers, and the things that answer when called.',
        'icon': 'flame',
        'color': 'red',
    },
    {
        'name': 'Exorcism',
        'slug': 'exorcism',
        'description': 'Rites performed against something that refuses to leave.',
        'icon': 'cross',
        'color': 'amber',
    },
    {
        'name': 'Haunted Dolls',
        'slug': 'haunted-dolls',
        'description': 'Painted eyes that follow you, and porcelain that moves at night.',
        'icon': 'baby',
        'color': 'rose',
    },
    {
        'name': 'Haunted Houses',
        'slug': 'haunted-houses',
        'description': 'Homes with memories of their own - and a reluctance to let go.',
        'icon': 'house',
        'color': 'teal',
    },
    {
        'name': 'Poltergeists',
        'slug': 'poltergeists',
        'description': 'Slamming doors, thrown objects, and rage without a body.',
        'icon': 'ghost',
        'color': 'indigo',
    },
    {
        'name': 'Revenge Spirits',
        'slug': 'revenge-spirits',
        'description': 'The dead who came back with a list and all the time in the world.',
        'icon': 'skull',
        'color': 'fuchsia',
    },
    {
        'name': 'Witch Horror',
        'slug': 'witch-horror',
        'description': 'Covens, hexes and bargains struck far from any road.',
        'icon': 'wand-sparkles',
        'color': 'orange',
    },

    # -- Creature Horror -----------------------------------------
    {
        'name': 'Alien Horror',
        'slug': 'alien-horror',
        'description': 'Visitors whose intentions were never meant to be understood.',
        'icon': 'satellite',
        'color': 'emerald',
    },
    {
        'name': 'Cryptids',
        'slug': 'cryptids',
        'description': 'Things glimpsed at the tree line that no field guide will name.',
        'icon': 'footprints',
        'color': 'amber',
    },
    {
        'name': 'Giant Monsters',
        'slug': 'giant-monsters',
        'description': 'Enormity given legs - and a reason to come inland.',
        'icon': 'mountain',
        'color': 'orange',
    },
    {
        'name': 'Insect Horror',
        'slug': 'insect-horror',
        'description': 'Swarms, nests and things laid under the skin.',
        'icon': 'bug',
        'color': 'emerald',
    },
    {
        'name': 'Killer Animals',
        'slug': 'killer-animals',
        'description': 'When the natural world stops running and starts hunting.',
        'icon': 'paw-print',
        'color': 'rose',
    },
    {
        'name': 'Mutant Creatures',
        'slug': 'mutant-creatures',
        'description': 'Biology gone wrong, and wrong in ways that keep growing.',
        'icon': 'radiation',
        'color': 'purple',
    },
    {
        'name': 'Sea Monsters',
        'slug': 'sea-monsters',
        'description': 'Deep water, dark shapes, and the things beneath the hull.',
        'icon': 'fish',
        'color': 'blue',
    },
    {
        'name': 'Vampire Horror',
        'slug': 'vampire-horror',
        'description': 'Immortal appetites and the long patience of the undead.',
        'icon': 'droplet',
        'color': 'red',
    },
    {
        'name': 'Werewolf Horror',
        'slug': 'werewolf-horror',
        'description': 'The change that comes with the moon and never asks permission.',
        'icon': 'moon',
        'color': 'indigo',
    },
    {
        'name': 'Zombie Horror',
        'slug': 'zombie-horror',
        'description': 'The dead walking, the living running, the world running out.',
        'icon': 'biohazard',
        'color': 'emerald',
    },

    # -- Dark and Violent Horror ---------------------------------
    {
        'name': 'Cannibal Horror',
        'slug': 'cannibal-horror',
        'description': 'Hospitality with a price you only learn at the table.',
        'icon': 'utensils-crossed',
        'color': 'rose',
    },
    {
        'name': 'Killer Horror',
        'slug': 'killer-horror',
        'description': 'Methodical, patient, and already inside the house.',
        'icon': 'axe',
        'color': 'red',
    },
    {
        'name': 'Backwoods Horror',
        'slug': 'backwoods-horror',
        'description': 'Wrong turns, unmarked roads, and locals who were expecting you.',
        'icon': 'trees',
        'color': 'emerald',
    },
    {
        'name': 'Survival Games',
        'slug': 'survival-games',
        'description': 'Rules imposed by someone unseen, and no way to stop playing.',
        'icon': 'dices',
        'color': 'orange',
    },

    # -- Sci-Fi Horror -------------------------------------------
    {
        'name': 'Biohorror',
        'slug': 'biohorror',
        'description': 'Living tissue turned into a laboratory, a weapon, or a warning.',
        'icon': 'microscope',
        'color': 'teal',
    },
    {
        'name': 'Genetic Experiments',
        'slug': 'genetic-experiments',
        'description': 'Code rewritten in flesh by people who never asked if they should.',
        'icon': 'dna',
        'color': 'blue',
    },
    {
        'name': 'Space Horror',
        'slug': 'space-horror',
        'description': 'Sealed hulls, endless dark, and something aboard with you.',
        'icon': 'rocket',
        'color': 'indigo',
    },
    {
        'name': 'Virtual Reality Horror',
        'slug': 'virtual-reality-horror',
        'description': 'Worlds you can log into - and eventually cannot log out of.',
        'icon': 'glasses',
        'color': 'fuchsia',
    },

    # -- Mystery and Strange Horror ------------------------------
    {
        'name': 'Cursed Media',
        'slug': 'cursed-media',
        'description': 'Films, tapes and songs that change whoever finishes them.',
        'icon': 'film',
        'color': 'rose',
    },
    {
        'name': 'Missing Persons',
        'slug': 'missing-persons',
        'description': 'People who stepped out of frame and never stepped back in.',
        'icon': 'user-x',
        'color': 'blue',
    },
    {
        'name': 'Secret Experiments',
        'slug': 'secret-experiments',
        'description': 'Programmes buried in redacted files and unmarked buildings.',
        'icon': 'flask-conical',
        'color': 'teal',
    },
    {
        'name': 'Unexplained Phenomena',
        'slug': 'unexplained-phenomena',
        'description': 'Events with witnesses, evidence, and no explanation at all.',
        'icon': 'sparkles',
        'color': 'purple',
    },
    {
        'name': 'Urban Exploration',
        'slug': 'urban-exploration',
        'description': 'Abandoned places entered by torchlight - and what still lives there.',
        'icon': 'flashlight',
        'color': 'amber',
    },
    {
        'name': 'Conspiracy Horror',
        'slug': 'conspiracy-horror',
        'description': 'Patterns that hold together far too well to be coincidence.',
        'icon': 'search',
        'color': 'indigo',
    },
    {
        'name': 'Forbidden Knowledge',
        'slug': 'forbidden-knowledge',
        'description': 'Truths that cannot be unlearned once the page is turned.',
        'icon': 'scroll',
        'color': 'orange',
    },

    # -- Historical and Cultural Horror --------------------------
    {
        'name': 'Japanese Horror',
        'slug': 'japanese-horror',
        'description': 'Quiet dread, vengeful spirits, and terror built on restraint.',
        'icon': 'mountain-snow',
        'color': 'rose',
    },
    {
        'name': 'Korean Horror',
        'slug': 'korean-horror',
        'description': 'Grief, guilt and hauntings rooted in family and history.',
        'icon': 'flower-2',
        'color': 'fuchsia',
    },
    {
        'name': 'Victorian Horror',
        'slug': 'victorian-horror',
        'description': 'Gaslight, laudanum and respectable houses with locked rooms.',
        'icon': 'lamp',
        'color': 'amber',
    },
    {
        'name': 'Medieval Horror',
        'slug': 'medieval-horror',
        'description': 'Plague, superstition and the dark between castle walls.',
        'icon': 'castle',
        'color': 'orange',
    },
    {
        'name': 'Mythological Horror',
        'slug': 'mythological-horror',
        'description': 'Old gods and older monsters, still owed what they were promised.',
        'icon': 'swords',
        'color': 'blue',
    },
    {
        'name': 'Ancient Evil',
        'slug': 'ancient-evil',
        'description': 'Something sealed away long ago, and recently disturbed.',
        'icon': 'hourglass',
        'color': 'purple',
    },

    # -- Internet and Modern Horror ------------------------------
    {
        'name': 'ARG Horror',
        'slug': 'arg-horror',
        'description': 'Puzzles that bleed off the screen and into your actual life.',
        'icon': 'puzzle',
        'color': 'purple',
    },
    {
        'name': 'Dark Web Horror',
        'slug': 'dark-web-horror',
        'description': 'Hidden services, wrong links, and doors that open both ways.',
        'icon': 'globe',
        'color': 'indigo',
    },
    {
        'name': 'AI Generated Horror',
        'slug': 'ai-generated-horror',
        'description': 'Machines dreaming - and the dreams starting to answer back.',
        'icon': 'bot',
        'color': 'teal',
    },
    {
        'name': 'Social Media Horror',
        'slug': 'social-media-horror',
        'description': 'Feeds, followers and accounts that keep posting after the end.',
        'icon': 'smartphone',
        'color': 'blue',
    },
    {
        'name': 'Surveillance Horror',
        'slug': 'surveillance-horror',
        'description': 'Cameras that never blink and footage no one admits to reviewing.',
        'icon': 'cctv',
        'color': 'red',
    },
    {
        'name': 'Digital Hauntings',
        'slug': 'digital-hauntings',
        'description': 'Ghosts that gave up on houses and moved into the hardware.',
        'icon': 'laptop',
        'color': 'emerald',
    },
    # Two internet-born worlds that readers write their own stories in.
    {
        'name': 'Backrooms',
        'slug': 'backrooms',
        'description': 'No-clip out of reality into endless yellow rooms, damp carpet and the hum of the lights.',
        'icon': 'lamp',          # the buzzing fluorescent lights
        'color': 'amber',        # the yellow wallpaper
    },
    {
        'name': 'SCP Foundation',
        'slug': 'scp-foundation',
        'description': 'Secure. Contain. Protect. Incident reports and the anomalies that got out.',
        'icon': 'flask-conical', # the Foundation's labs
        'color': 'teal',
    },
]


# The class MUST be called exactly "Command" - that is the name Django
# looks for when it imports this file.
class Command(BaseCommand):
    # Shown by "python manage.py help seed_categories".
    help = 'Load the initial horror categories into the database'

    # handle() is what runs. Django calls it for us.
    # *args and **options carry any command-line arguments; we don't
    # use them here, but the method signature has to accept them.
    def handle(self, *args, **options):
        created_count = 0
        updated_count = 0

        for item in CATEGORIES:
            # get_or_create is the key to making this re-runnable.
            #
            #   - It looks for a row where slug matches.
            #   - Found it?    -> returns that row, changes nothing.
            #   - Didn't find? -> creates a new row using "defaults".
            #
            # It returns a tuple: (the object, True/False was-it-new).
            #
            # If we used Category.objects.create() in this loop instead,
            # running the command twice would try to insert 54 duplicate
            # slugs - and crash, because slug is unique=True.
            #
            # We match on slug because it is the unique field. Matching
            # on name would risk duplicates from a renamed category.
            category, created = Category.objects.get_or_create(
                slug=item['slug'],
                defaults={
                    'name': item['name'],
                    'description': item['description'],
                    'icon': item['icon'],
                    'color': item['color'],
                },
            )

            if created:
                created_count += 1
            else:
                # The row already existed. Refresh its text in case you
                # edited a description in this file since last time.
                # (Heads-up: this also overwrites anything you changed
                # for these fields in /admin. The FILE is the boss.)
                category.name = item['name']
                category.description = item['description']
                category.icon = item['icon']
                category.color = item['color']
                category.save()
                updated_count += 1

        # self.stdout.write is Django's version of print(). Use it
        # rather than print() so output behaves properly when the
        # command is run from a script or a test.
        # style.SUCCESS colours the text green in the terminal.
        self.stdout.write(self.style.SUCCESS(
            f'Done. Created {created_count}, updated {updated_count}, '
            f'{len(CATEGORIES)} total in file.'
        ))
