# Created by Tommy.
"""Verify the real Next.js server rejects anonymous and forged legacy identities."""
import json
import sys
import urllib.request
import urllib.error
from urllib.parse import urlparse

base = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8787'
assert urlparse(base).hostname in ('localhost', '127.0.0.1'), 'Local server only'
entry = {'id': 'a' * 32, 'date': '2026-09-01', 'category': 'trading', 'currency': 'USD', 'amount': 100, 'note': ''}
for forged in (False, True):
    for method, path, body in (
        ('GET', '/api/entries?month=2026-09', None),
        ('PUT', '/api/entries', entry),
        ('DELETE', '/api/entries?id=' + entry['id'], None),
    ):
        headers = {'Content-Type': 'application/json', 'Origin': base}
        if forged:
            headers.update({'oai-authenticated-user-id': 'attacker', 'oai-authenticated-user-email': 'attacker@example.invalid'})
        request = urllib.request.Request(base + path, data=json.dumps(body).encode() if body else None, headers=headers, method=method)
        try:
            response = urllib.request.urlopen(request, timeout=10)
        except urllib.error.HTTPError as error:
            response = error
        assert response.status == 401, (method, forged, response.status)
        assert json.loads(response.read())['error'] == 'authRequired'
for path in ('/sign-in', '/demo'):
    assert urllib.request.urlopen(base + path, timeout=10).status == 200
print('API passed: public sign-in/demo work; anonymous requests and forged legacy identity headers cannot access records.')
