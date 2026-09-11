"""Inspect the configured database before any ML training is attempted."""
import argparse
import json
import sqlite3
from pathlib import Path


def inspect_database(database_url: str) -> dict:
    if not database_url.startswith("sqlite:///"):
        raise ValueError("The inspection utility currently supports sqlite:/// URLs only")
    path = database_url.replace("sqlite:///", "", 1)
    connection = sqlite3.connect(path)
    try:
        tables = [row[0] for row in connection.execute("SELECT name FROM sqlite_master WHERE type='table'")]
        result = {"database": path, "tables": {}, "label_status": {"available": False, "reason": "No historical event table found"}}
        for table in tables:
            columns = [row[1] for row in connection.execute(f'PRAGMA table_info("{table}")')]
            count = connection.execute(f'SELECT COUNT(*) FROM "{table}"').fetchone()[0]
            result["tables"][table] = {"columns": columns, "row_count": count}
        event_tables = [name for name in tables if name in {"historical_landslides", "landslide_events", "events"}]
        if event_tables:
            result["label_status"] = {"available": True, "event_tables": event_tables}
        return result
    finally:
        connection.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--database-url", default="sqlite:///./landslide.db")
    parser.add_argument("--output", default="ml/reports/dataset_report.json")
    args = parser.parse_args()
    report = inspect_database(args.database_url)
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
