from django.conf import settings
from django.core.mail import send_mail
from django.db.models import Count
from django.http import Http404
from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from mailings.email_templates import render_email
from .models import SupportTicket, TicketMessage


# ---------------------------------------------------------------
# USER SUPPORT
#   Members:  /support  in React  (their own tickets)
#   Admins:   Admin Dashboard -> User Support  (every ticket)
# ---------------------------------------------------------------

def ticket_data(ticket, with_messages=False):
    data = {
        'id': ticket.id,
        'subject': ticket.subject,
        'status': ticket.status,
        'status_label': ticket.get_status_display(),
        'user': ticket.user.username,
        'created_at': ticket.created_at,
        'updated_at': ticket.updated_at,
    }
    if with_messages:
        data['messages'] = [
            {
                'id': message.id,
                'body': message.body,
                'from_staff': message.from_staff,
                # Members see "Support", not which admin answered.
                'author': message.author.username if message.author else '(deleted)',
                'created_at': message.created_at,
            }
            for message in ticket.messages.select_related('author')
        ]
    return data


# Who may see this ticket? Its owner, and admins.
def get_ticket_for(request, pk):
    ticket = get_object_or_404(SupportTicket.objects.select_related('user'), pk=pk)
    if ticket.user != request.user and not request.user.is_staff:
        # 404 (not 403) so strangers can't even tell the ticket exists.
        raise Http404
    return ticket


# ===============================================================
# MEMBERS
# ===============================================================

# GET  /api/support/  -> your tickets
# POST /api/support/  { subject, body } -> open a new ticket
class MyTicketsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tickets = SupportTicket.objects.filter(user=request.user).select_related('user')
        return Response([ticket_data(ticket) for ticket in tickets])

    def post(self, request):
        subject = (request.data.get('subject') or '').strip()
        body = (request.data.get('body') or '').strip()
        if not subject or not body:
            return Response({'detail': 'Add a subject and describe the problem.'}, status=400)

        ticket = SupportTicket.objects.create(user=request.user, subject=subject[:150])
        TicketMessage.objects.create(ticket=ticket, author=request.user, body=body[:5000])
        return Response(ticket_data(ticket, with_messages=True), status=201)


# GET  /api/support/5/          -> one ticket with its conversation
# POST /api/support/5/          { body }  -> write in it
# POST /api/support/5/close/    -> mark it solved
# Works for the ticket's owner AND for admins (from_staff is set
# automatically when an admin writes).
class TicketDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        return Response(ticket_data(get_ticket_for(request, pk), with_messages=True))

    def post(self, request, pk):
        ticket = get_ticket_for(request, pk)
        body = (request.data.get('body') or '').strip()
        if not body:
            return Response({'detail': 'Write a message first.'}, status=400)

        is_staff_reply = request.user.is_staff and ticket.user != request.user
        TicketMessage.objects.create(ticket=ticket, author=request.user, body=body[:5000], from_staff=is_staff_reply)

        # An admin answered -> 'answered' (and tell the member by email).
        # The member wrote -> back to 'open' (waiting for support).
        if is_staff_reply:
            ticket.status = 'answered'
            # Wording: Dashboard -> Email Templates.
            subject, text = render_email(
                'support_reply',
                username=ticket.user.username,
                ticket_subject=ticket.subject,
                reply=body,
                link=f'{settings.SITE_URL}/support/{ticket.id}',
            )
            send_mail(
                subject=subject,
                message=text,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[ticket.user.email],
                # A missing/bad email address mustn't break the reply.
                fail_silently=True,
            )
        else:
            ticket.status = 'open'
        ticket.save()   # also moves updated_at to now

        return Response(ticket_data(ticket, with_messages=True))


class CloseTicketView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        ticket = get_ticket_for(request, pk)
        ticket.status = 'closed'
        ticket.save()
        return Response(ticket_data(ticket, with_messages=True))


# ===============================================================
# ADMINS
# ===============================================================

# GET /api/dashboard/support/  -> { counts, tickets } (with message counts)
class AdminTicketListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        tickets = SupportTicket.objects.select_related('user').annotate(message_count=Count('messages'))[:300]
        rows = []
        for ticket in tickets:
            row = ticket_data(ticket)
            row['message_count'] = ticket.message_count
            rows.append(row)

        counts = {'open': 0, 'answered': 0, 'closed': 0}
        for row in rows:
            counts[row['status']] += 1
        return Response({'counts': counts, 'tickets': rows})
