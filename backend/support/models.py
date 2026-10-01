from django.conf import settings
from django.db import models


# ---------------------------------------------------------------
# USER SUPPORT - help tickets.
#
# A member opens a ticket ("I can't upload my avatar"). The ticket
# is a small conversation: the member and admins take turns writing
# TicketMessages until it's solved.
#
#   status:
#     'open'      - waiting for an admin
#     'answered'  - an admin replied, waiting for the member
#     'closed'    - solved (either side can close it)
# ---------------------------------------------------------------
class SupportTicket(models.Model):
    STATUSES = [
        ('open', 'Waiting for support'),
        ('answered', 'Answered'),
        ('closed', 'Closed'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='support_tickets')
    subject = models.CharField(max_length=150)
    status = models.CharField(max_length=10, choices=STATUSES, default='open')
    created_at = models.DateTimeField(auto_now_add=True)
    # auto_now = updated every time the ticket is saved, so the
    # ticket with the newest activity can go to the top.
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f'#{self.id} {self.subject} ({self.status})'


class TicketMessage(models.Model):
    ticket = models.ForeignKey(SupportTicket, on_delete=models.CASCADE, related_name='messages')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='ticket_messages')
    body = models.TextField(max_length=5000)
    # True = written by an admin (shown as "Support" to the member).
    from_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f'Message on ticket #{self.ticket_id}'
