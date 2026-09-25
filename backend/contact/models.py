from django.db import models


# The choices for the "Subject" dropdown on the Contact page.
# (saved value, what people read). React has the same list in
# ContactPage.jsx - keep them in sync.
SUBJECTS = [
    ('general', 'General question'),
    ('report', 'Report a story or comment'),
    ('bug', 'Something is broken'),
    ('account', 'Help with my account'),
    ('partnership', 'Partnership / press'),
    ('other', 'Something else'),
]


# ---------------------------------------------------------------
# One message sent through the Contact page.
#
# Nothing is emailed yet - messages are saved here and you read them
# in the Django admin (/admin -> Contact -> Contact messages).
# ---------------------------------------------------------------
class ContactMessage(models.Model):
    name = models.CharField(max_length=100)
    email = models.EmailField()
    subject = models.CharField(max_length=20, choices=SUBJECTS)
    message = models.TextField(max_length=5000)

    # Tick this in the admin once you've answered.
    is_handled = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name}: {self.get_subject_display()}'
