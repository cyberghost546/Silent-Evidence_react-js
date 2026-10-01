from django.test import RequestFactory, SimpleTestCase, override_settings

from moderation.security import client_ip


# Tests for the live-site settings: finding the visitor's real IP
# behind the host's proxies. Run with:  python manage.py test

class ClientIpTests(SimpleTestCase):
    def request(self, forwarded=None):
        extra = {'REMOTE_ADDR': '10.0.0.1'}          # the proxy's own address
        if forwarded:
            extra['HTTP_X_FORWARDED_FOR'] = forwarded
        return RequestFactory().get('/', **extra)

    def test_on_your_computer_it_is_remote_addr(self):
        # TRUSTED_PROXY_COUNT is 0 by default: the header is ignored,
        # so nobody can fake their IP by sending it.
        self.assertEqual(client_ip(self.request('6.6.6.6')), '10.0.0.1')

    @override_settings(TRUSTED_PROXY_COUNT=1)
    def test_behind_one_proxy(self):
        self.assertEqual(client_ip(self.request('203.0.113.7')), '203.0.113.7')

    @override_settings(TRUSTED_PROXY_COUNT=1)
    def test_a_faked_address_at_the_start_is_ignored(self):
        # The visitor sent "X-Forwarded-For: 6.6.6.6" themselves; the
        # proxy added their real address at the end.
        self.assertEqual(client_ip(self.request('6.6.6.6, 203.0.113.7')), '203.0.113.7')

    @override_settings(TRUSTED_PROXY_COUNT=2)
    def test_behind_two_proxies(self):
        self.assertEqual(client_ip(self.request('203.0.113.7, 198.51.100.2')), '203.0.113.7')
