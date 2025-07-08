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
        elif 'patientCapacity' in hospital_columns:
            print("✅ Hospitals table already has patientCapacity column")
        
        # Check if we need to add service column to purchases
        cursor.execute("PRAGMA table_info(purchases)")
        purchase_columns = [column[1] for column in cursor.fetchall()]

        if 'service' not in purchase_columns:
            print("🛒 Adding service column to purchases table")
            cursor.execute("ALTER TABLE purchases ADD COLUMN service TEXT DEFAULT 'LUNCH'")
            print("✅ Purchases table updated")
        else:
            print("✅ Purchases table already has service column")
        
        # Check productions table structure
        cursor.execute("PRAGMA table_info(productions)")
        production_columns = [column[1] for column in cursor.fetchall()]

        print(f"📋 Current productions columns: {production_columns}")

        # Handle the complex productions table migration
        needs_full_migration = False

        # Check if we have the old schema with schoolId
        if 'schoolId' in production_columns:
            print("🔄 Detected old schema with schoolId - performing full table migration")
            needs_full_migration = True

        if needs_full_migration:
            # Create new productions table with correct schema
            print("🏗️ Creating new productions table with hospital-based schema")

            # First, backup existing data
            cursor.execute("""
                CREATE TABLE productions_backup AS 
                SELECT * FROM productions
            """)
            print("✅ Backed up existing productions data")

            # Drop the old table
            cursor.execute("DROP TABLE productions")
            print("✅ Dropped old productions table")

            # Create new table with correct schema
            cursor.execute("""
                CREATE TABLE productions (
                    id TEXT PRIMARY KEY,
                    weekId TEXT NOT NULL,
                    hospitalId TEXT NOT NULL,
                    service TEXT DEFAULT 'LUNCH',
                    productionDate DATETIME NOT NULL,
                    patientsServed INTEGER DEFAULT 0,
                    createdBy TEXT NOT NULL,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (weekId) REFERENCES weeks (id),
                    FOREIGN KEY (hospitalId) REFERENCES hospitals (id),
                    FOREIGN KEY (createdBy) REFERENCES users (id)
                )
            """)
            print("✅ Created new productions table")

            # Get first hospital ID as default for migration
            cursor.execute("SELECT id FROM hospitals LIMIT 1")
            default_hospital = cursor.fetchone()

            if default_hospital:
                default_hospital_id = default_hospital[0]
                print(f"🔄 Using default hospital ID: {default_hospital_id}")

                # Migrate data from backup, mapping schoolId to hospitalId
                cursor.execute("""
                    INSERT INTO productions (
                        id, weekId, hospitalId, service, productionDate, 
                        patientsServed, createdBy, createdAt, updatedAt
                    )
                    SELECT 
                        id,
                        weekId,
                        ? as hospitalId,
                        COALESCE(service, 'LUNCH') as service,
                        productionDate,
                        COALESCE(beneficiaries, patientsServed, 0) as patientsServed,
                        createdBy,
                        createdAt,
                        updatedAt
                    FROM productions_backup
                """, (default_hospital_id,))

                migrated_count = cursor.rowcount
                print(f"✅ Migrated {migrated_count} production records")
            else:
                print("❌ No hospitals found - cannot migrate production data")

            # Drop backup table
            cursor.execute("DROP TABLE productions_backup")
            print("✅ Cleaned up backup table")

        else:
            # Handle individual column additions for partial migrations
            if 'hospitalId' not in production_columns:
                print("🏥 Adding hospitalId column to productions table")
                cursor.execute("ALTER TABLE productions ADD COLUMN hospitalId TEXT")

                # Set default hospital ID for existing records
                cursor.execute("SELECT id FROM hospitals LIMIT 1")
                default_hospital = cursor.fetchone()
                if default_hospital:
                    cursor.execute("UPDATE productions SET hospitalId = ?", (default_hospital[0],))
                print("✅ HospitalId column added and populated")

            if 'service' not in production_columns:
                print("🍽️ Adding service column to productions table")
                cursor.execute("ALTER TABLE productions ADD COLUMN service TEXT DEFAULT 'LUNCH'")
                print("✅ Service column added")

            if 'patientsServed' not in production_columns:
                if 'beneficiaries' in production_columns:
                    print("👥 Adding patientsServed column and migrating from beneficiaries")
                    cursor.execute("ALTER TABLE productions ADD COLUMN patientsServed INTEGER DEFAULT 0")
                    cursor.execute("UPDATE productions SET patientsServed = beneficiaries")
                    print("✅ Beneficiaries migrated to patientsServed")
                else:
                    print("👥 Adding patientsServed column")
                    cursor.execute("ALTER TABLE productions ADD COLUMN patientsServed INTEGER DEFAULT 0")
                    print("✅ PatientsServed column added")

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
                nullable = "NULL" if col[3] == 0 else "NOT NULL"
                default = f" DEFAULT {col[4]}" if col[4] else ""
                print(f"  - {col[1]} ({col[2]}) {nullable}{default}")

        # Show sample data to verify migration
        print("\n📊 Sample data verification:")
        cursor.execute("SELECT COUNT(*) FROM productions")
        prod_count = cursor.fetchone()[0]
        print(f"Total productions: {prod_count}")

        cursor.execute("SELECT COUNT(*) FROM productions WHERE hospitalId IS NOT NULL")
        valid_hospital_count = cursor.fetchone()[0]
        print(f"Productions with valid hospitalId: {valid_hospital_count}")

        cursor.execute("SELECT COUNT(*) FROM productions WHERE service IS NOT NULL")
        valid_service_count = cursor.fetchone()[0]
        print(f"Productions with valid service: {valid_service_count}")

        if prod_count > 0:
            print("\n📋 Sample production record:")
            cursor.execute("SELECT id, hospitalId, service, patientsServed FROM productions LIMIT 1")
            sample = cursor.fetchone()
            if sample:
                print(f"  ID: {sample[0]}")
                print(f"  Hospital ID: {sample[1]}")
                print(f"  Service: {sample[2]}")
                print(f"  Patients Served: {sample[3]}")

    except Exception as e:
        print(f"❌ Migration failed: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_database()