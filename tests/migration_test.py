# Created by Tommy.
"""Check that the entry-ID migration preserves records and permits repeated days."""
import re
import sqlite3
from pathlib import Path

root = Path(__file__).resolve().parent.parent
connection = sqlite3.connect(':memory:')
connection.executescript((root / 'drizzle/0000_uneven_randall.sql').read_text())
rows = [
    ('user-a', '2026-09-01', 'trading', 10000, 'original note'),
    ('user-a', '2026-09-01', 'salary', 20000, 'salary note'),
    ('user-a', '2026-09-02', 'trading', -5000, ''),
    ('user-b', '2026-09-01', 'trading', 50000, 'another user'),
]
connection.executemany('INSERT INTO journal_entries VALUES (?, ?, ?, ?, ?)', rows)
connection.commit()
connection.executescript((root / 'drizzle/0001_complex_giant_girl.sql').read_text())
assert sorted(connection.execute('SELECT user_id, date, category, amount, note FROM journal_entries').fetchall()) == sorted(rows)
ids = [row[0] for row in connection.execute('SELECT id FROM journal_entries')]
assert len(set(ids)) == len(rows)
assert all(re.fullmatch('[a-f0-9]{32}', value) for value in ids)
connection.execute('INSERT INTO journal_entries (user_id, date, category, amount, note) VALUES (?, ?, ?, ?, ?)', ('user-a', '2026-09-01', 'trading', -100000, 'second entry'))
assert connection.execute("SELECT SUM(amount) FROM journal_entries WHERE user_id='user-a' AND date='2026-09-01' AND category='trading'").fetchone()[0] == -90000
assert connection.execute("SELECT COUNT(*) FROM journal_entries WHERE user_id='user-b'").fetchone()[0] == 1
print('Migration passed: existing values and owners preserved; unique IDs generated; repeated daily entries accepted.')
connection.executescript((root / 'drizzle/0002_lonely_firestar.sql').read_text())
assert connection.execute("SELECT COUNT(*) FROM journal_entries WHERE currency != 'USD'").fetchone()[0] == 0
assert sorted(connection.execute('SELECT user_id, date, category, amount, note FROM journal_entries WHERE note != ?', ('second entry',)).fetchall()) == sorted(rows)
print('Currency migration passed: existing amounts and owners retained, USD default applied.')
