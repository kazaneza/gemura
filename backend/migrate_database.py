import sqlite3
import os
from datetime import datetime

def migrate_database():
    """Migrate the existing database to match the new schema"""
    db_path = "kitchen_manager.db"
    
    if not os.path.exists(db_path):
        print("❌ Database file not found. Please run seed_data.py first.")
        return
    
    print("🔄 Starting database migration...")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if we need to migrate hospitals table
        cursor.execute("PRAGMA table_info(hospitals)")
        hospital_columns = [column[1] for column in cursor.fetchall()]
        
        if 'beds' in hospital_columns and 'patientCapacity' not in hospital_columns:
            print("🏥 Migrating hospitals table: beds -> patientCapacity")
            cursor.execute("ALTER TABLE hospitals RENAME COLUMN beds TO patientCapacity")
            print("✅ Hospitals table migrated")
        
        # Check if we need to add service column to purchases
        cursor.execute("PRAGMA table_info(purchases)")
        purchase_columns = [column[1] for column in cursor.fetchall()]
        
        if 'service' not in purchase_columns:
            print("🛒 Adding service column to purchases table")
            cursor.execute("ALTER TABLE purchases ADD COLUMN service TEXT DEFAULT 'LUNCH'")
            print("✅ Purchases table updated")
        
        # Check if we need to migrate productions table
        cursor.execute("PRAGMA table_info(productions)")
        production_columns = [column[1] for column in cursor.fetchall()]
        
        # Check if we have old school-based structure
        if 'schoolId' in production_columns:
            print("🏥 Migrating productions table from school-based to hospital-based")
            
            # Create new productions table with hospital structure
            cursor.execute("""
                CREATE TABLE productions_new (
                    id TEXT PRIMARY KEY,
                    weekId TEXT NOT NULL,
                    hospitalId TEXT NOT NULL,
                    service TEXT NOT NULL DEFAULT 'LUNCH',
                    productionDate DATETIME NOT NULL,
                    patientsServed INTEGER NOT NULL DEFAULT 0,
                    createdBy TEXT NOT NULL,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (weekId) REFERENCES weeks (id),
                    FOREIGN KEY (hospitalId) REFERENCES hospitals (id),
                    FOREIGN KEY (createdBy) REFERENCES users (id)
                )
            """)
            
            # Migrate data from old table to new table
            cursor.execute("""
                INSERT INTO productions_new (
                    id, weekId, hospitalId, service, productionDate, 
                    patientsServed, createdBy, createdAt, updatedAt
                )
                SELECT 
                    id, weekId, schoolId, 'LUNCH', productionDate,
                    beneficiaries, createdBy, createdAt, updatedAt
                FROM productions
            """)
            
            # Drop old table and rename new one
            cursor.execute("DROP TABLE productions")
            cursor.execute("ALTER TABLE productions_new RENAME TO productions")
            print("✅ Productions table migrated to hospital-based structure")
            
        elif 'hospitalId' not in production_columns:
            print("🏥 Adding hospitalId column to productions table")
            cursor.execute("ALTER TABLE productions ADD COLUMN hospitalId TEXT")
            cursor.execute("ALTER TABLE productions ADD COLUMN service TEXT DEFAULT 'LUNCH'")
            
            # If we have schoolId, copy it to hospitalId
            if 'schoolId' in production_columns:
                cursor.execute("UPDATE productions SET hospitalId = schoolId")
            
            print("✅ Productions table updated")
        
        # Add service column if missing
        if 'service' not in production_columns:
            print("🍽️ Adding service column to productions table")
            cursor.execute("ALTER TABLE productions ADD COLUMN service TEXT DEFAULT 'LUNCH'")
            print("✅ Service column added to productions")
        
        # Update patientsServed column if we have beneficiaries
        if 'beneficiaries' in production_columns and 'patientsServed' not in production_columns:
            print("👥 Migrating beneficiaries to patientsServed")
            cursor.execute("ALTER TABLE productions ADD COLUMN patientsServed INTEGER DEFAULT 0")
            cursor.execute("UPDATE productions SET patientsServed = beneficiaries")
            print("✅ Beneficiaries migrated to patientsServed")
        
        # Commit all changes
        conn.commit()
        print("✅ Database migration completed successfully!")
        
        # Show current schema
        print("\n📋 Current database schema:")
        for table in ['hospitals', 'purchases', 'productions']:
            cursor.execute(f"PRAGMA table_info({table})")
            columns = cursor.fetchall()
            print(f"\n{table.upper()} table columns:")
            for col in columns:
                print(f"  - {col[1]} ({col[2]})")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_database()