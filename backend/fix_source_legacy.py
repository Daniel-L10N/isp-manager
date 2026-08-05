"""
Fix legacy CashMovement records that were incorrectly marked as 'cash_direct'.

This script matches CashMovement records with their corresponding
Income/ExpensePayment records and updates the source field accordingly.
"""

import sqlite3
import sys
import os

DB_PATH = os.environ.get("DB_PATH", "/root/isp-manager/backend/isp_manager.db")


def fix_sources(db_path: str):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Check if source column exists
    cursor.execute("PRAGMA table_info(cash_movements)")
    columns = [row[1] for row in cursor.fetchall()]
    if "source" not in columns:
        print("ERROR: 'source' column does not exist. Run migrate_source.py first.")
        conn.close()
        return

    # 1. Fix Income records: Income has cash_movement_id pointing to CashMovement
    cursor.execute("""
        UPDATE cash_movements
        SET source = 'income_module'
        WHERE id IN (
            SELECT cash_movement_id FROM incomes
            WHERE cash_movement_id IS NOT NULL
        )
        AND source != 'income_module'
    """)
    income_fixed = cursor.rowcount
    print(f"[INCOME] Updated {income_fixed} records to 'income_module'")

    # 2. Fix ExpensePayment records: Match by date + amount
    #    ExpensePayment doesn't have cash_movement_id, so we match by date and amount
    cursor.execute("""
        UPDATE cash_movements
        SET source = 'expense_module'
        WHERE type = 'egreso'
        AND source = 'cash_direct'
        AND id IN (
            SELECT cm.id
            FROM cash_movements cm
            INNER JOIN expense_payments ep
                ON cm.date = ep.date
                AND ABS(cm.amount - ep.amount) < 0.01
        )
    """)
    expense_fixed = cursor.rowcount
    print(f"[EXPENSE] Updated {expense_fixed} records to 'expense_module'")

    # 3. Show summary
    cursor.execute("""
        SELECT source, type, COUNT(*), SUM(amount)
        FROM cash_movements
        GROUP BY source, type
        ORDER BY source, type
    """)
    rows = cursor.fetchall()
    print("\n=== Summary after fix ===")
    print(f"{'Source':<20} {'Type':<10} {'Count':<8} {'Total':>12}")
    print("-" * 52)
    for source, typ, count, total in rows:
        print(f"{source or 'NULL':<20} {typ:<10} {count:<8} ${total:>10.2f}")

    conn.commit()
    conn.close()
    print(f"\nDone. {income_fixed} income + {expense_fixed} expense records fixed.")


if __name__ == "__main__":
    db = sys.argv[1] if len(sys.argv) > 1 else DB_PATH
    print(f"Fixing source field for legacy records in: {db}")
    fix_sources(db)
