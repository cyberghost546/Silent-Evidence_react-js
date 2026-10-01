import re

from .models import BannedWord


# ---------------------------------------------------------------
# THE CONTENT FILTER - "does this text contain a banned word?"
#
# Admins keep the list on Admin Dashboard -> Content Filter.
# Used when someone writes a comment, a Last Word or a story:
#   check_text('some text')
#     -> ('block', ['badword'])   refuse it
#     -> ('flag',  ['iffyword'])  allow it, but report it to admins
#     -> (None,    [])            all fine
# Block wins: one blocked word blocks the text, even if other words
# are only "flag".
# ---------------------------------------------------------------

def find_banned_words(text):
    found = []
    lowered = text.lower()
    for banned in BannedWord.objects.all():
        # \b = a "word boundary", so the word "ass" doesn't match
        # "class" or "passage". re.escape: a word with special
        # characters (like "c++") is matched literally.
        if re.search(rf'\b{re.escape(banned.word)}\b', lowered):
            found.append(banned)
    return found


def check_text(text):
    found = find_banned_words(text or '')
    blocked = [word.word for word in found if word.action == 'block']
    if blocked:
        return 'block', blocked
    flagged = [word.word for word in found if word.action == 'flag']
    if flagged:
        return 'flag', flagged
    return None, []


# The message a writer sees when their text is blocked. It doesn't
# repeat the word itself - no need to print it back at them.
BLOCKED_MESSAGE = 'This contains words that are not allowed on Silent Evidence. Please change it.'
