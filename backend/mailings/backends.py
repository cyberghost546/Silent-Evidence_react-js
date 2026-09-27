from django.core.mail.backends.console import EmailBackend as ConsoleEmailBackend
from django.core.mail.backends.smtp import EmailBackend as SMTPEmailBackend


# ---------------------------------------------------------------
# OUR EMAIL BACKENDS - they send (or print) emails like Django's own,
# AND write every email into the EmailLog table, for
# Admin Dashboard -> Email Log.
#
#   LoggingConsoleBackend - prints emails in the runserver terminal
#                           (while developing: nobody gets spammed)
#   LoggingSMTPBackend    - really sends them through a mail server
#                           (on the live site)
#
# Which one is used is picked in MAILERS in config/settings.py.
#
# The logging part is written ONCE, in EmailLogMixin. A "mixin" is a
# small class you add in front of another one:
#     class LoggingSMTPBackend(EmailLogMixin, SMTPEmailBackend)
# = "everything the SMTP backend does, plus the logging".
# super().send_messages(...) inside the mixin = "now do the normal
# sending" - of whichever backend comes after it.
# ---------------------------------------------------------------
class EmailLogMixin:
    def send_messages(self, email_messages):
        # Imported here: the email system is set up before Django has
        # loaded the apps, and importing a model too early crashes.
        from .models import EmailLog

        try:
            sent = super().send_messages(email_messages) or 0
        except Exception as problem:
            # Log the failure, then let it go on as normal.
            self._log(EmailLog, email_messages, False, str(problem)[:500])
            raise

        # With fail_silently=True a mail server problem doesn't raise -
        # the backend just reports fewer emails sent. Log that honestly.
        if sent < len(email_messages):
            self._log(EmailLog, email_messages, False, 'The mail server did not accept this email.')
        else:
            self._log(EmailLog, email_messages, True, '')
        return sent

    def _log(self, EmailLog, email_messages, success, error):
        # bulk_create = many rows in ONE database query.
        EmailLog.objects.bulk_create([
            EmailLog(
                to=', '.join(message.to),
                subject=message.subject[:300],
                body=message.body[:5000],
                success=success,
                error=error,
            )
            for message in email_messages
        ])


class LoggingConsoleBackend(EmailLogMixin, ConsoleEmailBackend):
    pass


class LoggingSMTPBackend(EmailLogMixin, SMTPEmailBackend):
    pass
