from django.http import Http404
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from .email_templates import TEMPLATES, check_template, get_template
from .models import EmailTemplate


# ---------------------------------------------------------------
# ADMIN DASHBOARD -> EMAIL TEMPLATES
#
#   GET    /api/dashboard/email-templates/        -> every template
#   PATCH  /api/dashboard/email-templates/<key>/  { subject, body }
#   DELETE /api/dashboard/email-templates/<key>/  -> back to the default
# ---------------------------------------------------------------

def template_data(key):
    default = TEMPLATES[key]
    current = get_template(key)
    custom = current['custom']
    return {
        'key': key,
        'name': default['name'],
        'description': default['description'],
        'has_subject': default['subject'] is not None,
        'subject': current['subject'] or '',
        'body': current['body'],
        # For the "Reset to default" button and the preview.
        'default_subject': default['subject'] or '',
        'default_body': default['body'],
        'placeholders': list(default['sample']),
        'sample': default['sample'],
        'is_custom': custom is not None,
        'updated_at': custom.updated_at if custom else None,
        'updated_by': custom.updated_by.username if custom and custom.updated_by else None,
    }


class AdminEmailTemplateListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        return Response([template_data(key) for key in TEMPLATES])


class AdminEmailTemplateDetailView(APIView):
    permission_classes = [IsAdminUser]

    def get_key(self, key):
        if key not in TEMPLATES:
            raise Http404
        return key

    def patch(self, request, key):
        key = self.get_key(key)
        has_subject = TEMPLATES[key]['subject'] is not None
        subject = (request.data.get('subject') or '').strip() if has_subject else ''
        body = (request.data.get('body') or '').strip()

        if not body or (has_subject and not subject):
            return Response({'detail': "The subject and the text can't be empty."}, status=400)
        # Wrong placeholders would send emails with "{nmae}" in them -
        # refuse them now, while the admin can still fix it.
        problems = check_template(key, subject, body)
        if problems:
            return Response({'detail': ' '.join(problems)}, status=400)

        EmailTemplate.objects.update_or_create(
            key=key,
            defaults={'subject': subject[:200], 'body': body, 'updated_by': request.user},
        )
        return Response(template_data(key))

    def delete(self, request, key):
        EmailTemplate.objects.filter(key=self.get_key(key)).delete()
        return Response(template_data(key))
