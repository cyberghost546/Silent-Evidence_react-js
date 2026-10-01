from datetime import date

from django.utils import timezone

from .models import get_profile


# ---------------------------------------------------------------
# AGE RULES - in one place, so every page uses the same ones.
#
# The site is open to everyone. Only 18+ ("mature") stories need a
# confirmed age: the member types their birth date ONCE (it's then
# locked - only an admin can reset it, see ConfirmAgeView).
#
# Django enforces it (StoryDetailSerializer leaves out the story's
# text), so it can't be skipped by clearing the browser or calling
# the API directly.
# ---------------------------------------------------------------

ADULT_AGE = 18


# Age in whole years on `today`. Your birthday this year hasn't come
# yet? Then one year less: (month, day) < (month, day) compares the
# month first, then the day.
def age_on(birth_date, today=None):
    today = today or date.today()
    had_birthday = (today.month, today.day) >= (birth_date.month, birth_date.day)
    return today.year - birth_date.year - (0 if had_birthday else 1)


# The confirmed age of a member, or None (not confirmed / logged out).
def user_age(user):
    if not user.is_authenticated:
        return None
    birth_date = get_profile(user).birth_date
    return age_on(birth_date) if birth_date else None


def is_adult(user):
    age = user_age(user)
    return age is not None and age >= ADULT_AGE


# May this person read this story's text? None = yes. Otherwise why not:
#   'login'        - 18+ story, logged out: log in first (the age belongs to an account)
#   'age'          - 18+ story, logged in, but age not confirmed yet
#   'too_young'    - 18+ story, confirmed, but under 18
#   'early_access' - Pro readers only for now (Story.early_access_until)
#
# The last one isn't about age, but it's the same question ("may you
# read the text?"), so it lives here too: every place that hides a
# locked story's text already calls this function.
def story_lock(user, story):
    # Writers can always read their own story.
    if user.is_authenticated and story.author_id == user.id:
        return None

    if story.content_rating == 'mature':
        if not user.is_authenticated:
            return 'login'
        age = user_age(user)
        if age is None:
            return 'age'
        if age < ADULT_AGE:
            return 'too_young'

    if is_early_access(story) and not can_read_early(user):
        return 'early_access'
    return None


# Is the story still in its Pro-only hours?
def is_early_access(story):
    return story.early_access_until is not None and story.early_access_until > timezone.now()


# Pro readers - and admins (they may need to check a reported story).
def can_read_early(user):
    if not user.is_authenticated:
        return False
    return user.is_staff or get_profile(user).is_premium
