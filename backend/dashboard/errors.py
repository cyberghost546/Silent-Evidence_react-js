from django.db.models import F

from .models import ErrorReport


# ---------------------------------------------------------------
# save_error() - write one error into the Error Log.
#
# If the same error (same source + message + page) is already there,
# count it instead of adding a row. F('count') + 1 = let the database
# do the adding (safe when two crashes happen at the same moment).
# ---------------------------------------------------------------
def save_error(source, message, details='', url='', user=None, user_agent=''):
    message = (message or 'Unknown error')[:300]
    url = (url or '')[:300]
    updated = ErrorReport.objects.filter(source=source, message=message, url=url).update(count=F('count') + 1)
    if updated:
        # .update() skips auto_now, so move last_seen by saving once.
        report = ErrorReport.objects.filter(source=source, message=message, url=url).first()
        report.details = (details or '')[:10000] or report.details
        report.save(update_fields=['details', 'last_seen'])
        return report
    return ErrorReport.objects.create(
        source=source,
        message=message,
        details=(details or '')[:10000],
        url=url,
        user=user if user is not None and user.is_authenticated else None,
        user_agent=(user_agent or '')[:300],
    )
