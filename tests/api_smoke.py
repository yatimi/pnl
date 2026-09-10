# Created by Tommy.
"""Exercise the real local Worker, without browser automation or production data."""
import json
import sys
import uuid
import urllib.request
import urllib.error
from urllib.parse import urlparse

base = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8787'
assert urlparse(base).hostname in ('localhost', '127.0.0.1'), 'Local test server only'
user_a = 'pnl-test-' + uuid.uuid4().hex
user_b = 'pnl-test-' + uuid.uuid4().hex

def request(method, path, body=None, user=None, origin=None):
    headers = {'Content-Type': 'application/json', 'Origin': origin or base}
    if user:
        headers.update({'oai-authenticated-user-id': user, 'oai-authenticated-user-email': 'test@example.invalid'})
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(base + path, data=data, headers=headers, method=method)
    try:
        response = urllib.request.urlopen(req)
    except urllib.error.HTTPError as error:
        response = error
    return response.status, json.loads(response.read())

entry = {'date': '2026-09-01', 'category': 'trading', 'amount': 29, 'note': '<script>text only</script>'}
try:
    assert request('GET', '/api/entries?month=2026-09')[0] == 401
    assert request('PUT', '/api/entries', entry)[0] == 401
    assert request('DELETE', '/api/entries?date=2026-09-01&category=trading')[0] == 401
    assert request('PUT', '/api/entries', entry, user_a, 'https://untrusted.invalid')[0] == 403
    assert request('PUT', '/api/entries', {**entry, 'date': '2026-09-31'}, user_a)[0] == 400
    assert request('PUT', '/api/entries', {**entry, 'amount': 1.5}, user_a)[0] == 400
    assert request('GET', '/api/entries?month=invalid', user=user_a)[0] == 400
    assert request('PUT', '/api/entries', entry, user_a)[0] == 200
    assert request('GET', '/api/entries?month=2026-09', user=user_a)[1]['entries'] == [entry]
    assert request('GET', '/api/entries?month=2026-09', user=user_b)[1]['entries'] == []
    assert request('DELETE', '/api/entries?date=2026-09-01&category=trading', user=user_b)[0] == 200
    assert request('GET', '/api/entries?month=2026-09', user=user_a)[1]['entries'] == [entry]
    updated = {**entry, 'amount': -500, 'note': 'Updated'}
    assert request('PUT', '/api/entries', updated, user_a)[0] == 200
    assert request('PUT', '/api/entries', updated, user_a)[0] == 200
    assert request('GET', '/api/entries?month=2026-09', user=user_a)[1]['entries'] == [updated]
    salary = {**entry, 'category': 'salary', 'amount': 250000, 'note': ''}
    assert request('PUT', '/api/entries', salary, user_a)[0] == 200
    assert len(request('GET', '/api/entries?month=2026-09', user=user_a)[1]['entries']) == 2
    assert request('DELETE', '/api/entries?date=2026-09-01&category=trading', user=user_a)[0] == 200
    assert request('GET', '/api/entries?month=2026-09', user=user_a)[1]['entries'] == [salary]
    print('API passed: authentication, origin protection, validation, exact cents, durable reads, idempotent edits, user isolation and scoped deletion.')
finally:
    for category in ('trading', 'salary'):
        request('DELETE', '/api/entries?date=2026-09-01&category=' + category, user=user_a)
