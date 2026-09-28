import base64

from cryptography.hazmat.primitives import serialization
from django.core.management.base import BaseCommand
from py_vapid import Vapid


# ---------------------------------------------------------------
#     python manage.py make_push_keys
#
# Makes a new key pair for phone notifications and PRINTS it - it is
# never saved in a file. Copy the two lines into your host's
# environment variables (Render: your service -> Environment).
# The private key is a secret: never put it in git.
# Making new keys later means every phone has to switch notifications
# on again - so do it once.
# ---------------------------------------------------------------
def b64url(data):
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode()


class Command(BaseCommand):
    help = 'Print a new VAPID key pair for phone notifications (web push).'

    def handle(self, *args, **options):
        vapid = Vapid()
        vapid.generate_keys()
        public = vapid.public_key.public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
        private = vapid.private_key.private_bytes(serialization.Encoding.DER, serialization.PrivateFormat.PKCS8, serialization.NoEncryption())
        self.stdout.write('Add these to your host\'s environment variables (NOT to git):\n')
        self.stdout.write(f'VAPID_PUBLIC_KEY={b64url(public)}')
        self.stdout.write(f'VAPID_PRIVATE_KEY={b64url(private)}')
        self.stdout.write('VAPID_CONTACT=mailto:you@yourdomain.com')
