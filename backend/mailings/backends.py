from django.core.mail.backends.console import EmailBackend as ConsoleEmailBackend


# ---------------------------------------------------------------
# OUR EMAIL BACKEND - Django's console backend (prints emails in
# the runserver terminal) + it writes every email into the
# EmailLog table, for Admin Dashboard -> Email Log.
#
# It's switched on in MAILERS in config/settings.py.
#
# "Subclassing": class LoggingConsoleBackend(ConsoleEmailBackend)
# means "everything the console backend does, plus what we add".
# super().send_messages(...) = "now do the normal printing".
#
# When you move to real sending (SMTP), make the same small class
# on top of Django's smtp EmailBackend instead - the logging part
# stays exactly the same.
# ---------------------------------------------------------------
class LoggingConsoleBackend(ConsoleEmailBackend):
    def send_messages(self, email_messages):
        # Imported here: the email system is set up before Django has
        # loaded the apps, and importing a model too early crashes.
        from .models import EmailLog

        try:
            sent = super().send_messages(email_messages)
            error = ''
        except Exception as problem:
            # Log the failure, then let it go on as normal.
            sent = 0
            error = str(problem)[:500]
            self._log(EmailLog, email_messages, False, error)
            raise

        self._log(EmailLog, email_messages, True, error)
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
