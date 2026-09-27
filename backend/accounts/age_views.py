from datetime import date

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .age import ADULT_AGE, age_on
from .models import get_profile


# ---------------------------------------------------------------
# POST /api/accounts/age/  { birth_date: '1998-04-23' }
#
# "Confirm your age" - the lock screen on 18+ stories sends this.
# It can only be done ONCE: after that the birth date is locked, so
# a 15-year-old can't simply try again with another year. (An admin
# can reset it on the Users page if someone made a typo.)
# ---------------------------------------------------------------
class ConfirmAgeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        profile = get_profile(request.user)
        if profile.birth_date is not None:
            return Response({'detail': 'Your age is already confirmed. Made a mistake? Contact support.'}, status=400)

        try:
            # date.fromisoformat('1998-04-23') -> a real date, or ValueError.
            birth_date = date.fromisoformat(str(request.data.get('birth_date') or ''))
        except ValueError:
            return Response({'birth_date': ['Pick your day, month and year of birth.']}, status=400)

        age = age_on(birth_date)
        if birth_date > date.today() or age > 120:
            return Response({'birth_date': ["That date doesn't look right."]}, status=400)

        profile.birth_date = birth_date
        # Under 18 can't keep "Full Access" (all stories) in Settings.
        if age < ADULT_AGE and profile.content_access == 'mature':
            profile.content_access = 'teen' if age >= 13 else 'all'
        profile.save()

        return Response({'age_confirmed': True, 'is_adult': age >= ADULT_AGE})
