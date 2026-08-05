"""
Migration: Add 'source' column to cash_movements table.
Existing records default to 'cash_direct' (direct cash movements).
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "isp_manager.db")

def migrate():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}, skipping migration.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Check if column already exists
    cursor.execute("PRAGMA table_info(cash_movements)")
    columns = [row[1] for row in cursor.fetchall()]

    if "source" not in columns:
        print("Adding 'source' column to cash_movements...")
        cursor.execute(
            "ALTER TABLE cash_movements ADD COLUMN source VARCHAR(20) DEFAULT 'cash_direct'"
        )
        # Update existing records to mark as cash_direct
        cursor.execute(
            "UPDATE cash_movements SET source = 'cash_direct' WHERE source IS NULL"
        )
        conn.commit()
        print("Migration complete. All existing records marked as 'cash_direct'.")
    else:
        print("'source' column already exists. Skipping migration.")

    conn.close()

if __name__ == "__main__":
    migrate()
