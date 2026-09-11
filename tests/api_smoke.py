# Created by Tommy.
"""Exercise the real local Worker, without browser automation or production data."""
import json
import sys
import time
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
    # Wrangler may restart its local worker just after reporting readiness.
    # Retry only that exact transport response, never application failures.
    for attempt in range(3):
        try:
            response = urllib.request.urlopen(req, timeout=10)
        except urllib.error.HTTPError as error:
            response = error
        raw = response.read()
        if response.status != 503 or not raw.startswith(b'Your worker restarted mid-request.') or attempt == 2:
            break
        time.sleep(0.5)
    try:
        result = json.loads(raw)
    except json.JSONDecodeError as error:
        raise AssertionError(f'{method} {path}: HTTP {response.status}, non-JSON response: {raw[:500]!r}') from error
    return response.status, result

entry = {'id': uuid.uuid4().hex, 'date': '2026-09-01', 'category': 'trading', 'currency': 'USD', 'amount': 10000, 'note': '<script>text only</script>'}
second = {**entry, 'id': uuid.uuid4().hex, 'amount': -100000, 'currency': 'EUR', 'note': 'second entry'}
salary = {**entry, 'id': uuid.uuid4().hex, 'category': 'salary', 'amount': 250000, 'note': ''}
def records(user):
    status, result = request('GET', '/api/entries?month=2026-09', user=user)
    assert status == 200
    return {record['id']: record for record in result['entries']}

try:
    assert request('GET', '/api/entries?month=2026-09')[0] == 401
    assert request('PUT', '/api/entries', entry)[0] == 401
    assert request('DELETE', '/api/entries?id=' + entry['id'])[0] == 401
    assert request('PUT', '/api/entries', entry, user_a, 'https://untrusted.invalid')[0] == 403
    assert request('PUT', '/api/entries', {**entry, 'date': '2026-09-31'}, user_a)[0] == 400
    assert request('PUT', '/api/entries', {**entry, 'amount': 1.5}, user_a)[0] == 400
    assert request('PUT', '/api/entries', {**entry, 'id': 'invalid'}, user_a)[0] == 400
    assert request('GET', '/api/entries?month=invalid', user=user_a)[0] == 400
    assert request('PUT', '/api/entries', {**entry, 'currency': 'GBP'}, user_a)[0] == 400
    assert request('PUT', '/api/entries', entry, user_a)[0] == 200
    assert request('PUT', '/api/entries', second, user_a)[0] == 200
    assert records(user_a) == {entry['id']: entry, second['id']: second}
    assert sum(record['amount'] for record in records(user_a).values()) == -90000
    assert request('PUT', '/api/entries', second, user_a)[0] == 200
    assert len(records(user_a)) == 2, 'Retry duplicated an entry'
    assert records(user_b) == {}
    assert request('DELETE', '/api/entries?id=' + entry['id'], user=user_b)[0] == 200
    assert request('PUT', '/api/entries', {**entry, 'amount': 99}, user_b)[0] == 200
    assert records(user_a)[entry['id']] == entry, 'Another user changed this record'
    updated = {**entry, 'amount': -500, 'note': 'Updated', 'date': '2026-09-02', 'category': 'other'}
    assert request('PUT', '/api/entries', updated, user_a)[0] == 400
    updated['amount'] = 500
    updated['currency'] = 'UAH'
    assert request('PUT', '/api/entries', updated, user_a)[0] == 200
    assert records(user_a) == {entry['id']: updated, second['id']: second}
    assert request('PUT', '/api/entries', salary, user_a)[0] == 200
    assert request('DELETE', '/api/entries?id=' + entry['id'], user=user_a)[0] == 200
    assert records(user_a) == {second['id']: second, salary['id']: salary}
    print('API passed: multiple daily entries, exact totals, retry safety, isolated edits/deletions, validation and ownership.')
finally:
    for user in (user_a, user_b):
        for record in (entry, second, salary):
            request('DELETE', '/api/entries?id=' + record['id'], user=user)
