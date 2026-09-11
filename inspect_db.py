import sqlite3
import json

con = sqlite3.connect("backend/landslide.db")
cur = con.cursor()

tables = [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'")]
print("TABLES:", tables)

for t in tables:
    cols = list(cur.execute(f"PRAGMA table_info({t})"))
    rows = cur.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
    print(f"\n== {t} == columns={len(cols)} rows={rows}")
    for c in cols:
        print(f"  {c[1]}: {c[2]} nullable={not c[3]} pk={c[5]}")

print("\n== SAMPLE DATA ==")
for t in tables:
    cols = [c[1] for c in cur.execute(f"PRAGMA table_info({t})")]
    sample = cur.execute(f"SELECT * FROM {t} LIMIT 3").fetchall()
    print(f"\n--- {t} ---")
    print("cols:", cols)
    for row in sample:
        print(row)

print("\n== DATA QUALITY ==")
for t in tables:
    cols = [c[1] for c in cur.execute(f"PRAGMA table_info({t})")]
    total = cur.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
    if total == 0:
        continue
    print(f"\n--- {t} (total={total}) ---")
    for c in cols:
        nulls = cur.execute(f"SELECT COUNT(*) FROM {t} WHERE {c} IS NULL").fetchone()[0]
        if nulls > 0:
            print(f"  NULL {c}: {nulls} ({nulls/total*100:.1f}%)")

con.close()
