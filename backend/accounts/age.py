from datetime import date

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
#   'login'     - logged out: log in first (the age belongs to an account)
#   'age'       - logged in, but age not confirmed yet
#   'too_young' - confirmed, but under 18
def story_lock(user, story):
    if story.content_rating != 'mature':
        return None
    # Writers can always read their own story.
    if user.is_authenticated and story.author_id == user.id:
        return None
    if not user.is_authenticated:
        return 'login'
    age = user_age(user)
    if age is None:
        return 'age'
    if age < ADULT_AGE:
        return 'too_young'
    return None
