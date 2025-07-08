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
        
        # Handle different migration scenarios
        if 'schoolId' in production_columns and 'hospitalId' not in production_columns:
            print("🏥 Migrating productions table from school-based to hospital-based")
            
            # Add hospitalId column and copy data from schoolId
            cursor.execute("ALTER TABLE productions ADD COLUMN hospitalId TEXT")
            cursor.execute("UPDATE productions SET hospitalId = schoolId")
            print("✅ Added hospitalId column and migrated data from schoolId")
            
        elif 'hospitalId' not in production_columns:
            print("🏥 Adding hospitalId column to productions table")
            cursor.execute("ALTER TABLE productions ADD COLUMN hospitalId TEXT")
            print("✅ HospitalId column added")
        else:
            print("✅ Productions table already has hospitalId column")
        
        # Handle service column for productions (check if it already exists)
        if 'service' not in production_columns:
            print("🍽️ Adding service column to productions table")
            cursor.execute("ALTER TABLE productions ADD COLUMN service TEXT DEFAULT 'LUNCH'")
            print("✅ Service column added to productions")
        else:
            print("✅ Productions table already has service column")
        
        # Handle patientsServed column
        if 'beneficiaries' in production_columns and 'patientsServed' not in production_columns:
            print("👥 Adding patientsServed column and migrating from beneficiaries")
            cursor.execute("ALTER TABLE productions ADD COLUMN patientsServed INTEGER DEFAULT 0")
            cursor.execute("UPDATE productions SET patientsServed = beneficiaries")
            print("✅ Beneficiaries migrated to patientsServed")
        elif 'patientsServed' not in production_columns:
            print("👥 Adding patientsServed column")
            cursor.execute("ALTER TABLE productions ADD COLUMN patientsServed INTEGER DEFAULT 0")
            print("✅ PatientsServed column added")
        else:
            print("✅ Productions table already has patientsServed column")
        
        # Ensure all productions have valid hospitalId values
        cursor.execute("SELECT COUNT(*) FROM productions WHERE hospitalId IS NULL OR hospitalId = ''")
        null_hospital_count = cursor.fetchone()[0]
        
        if null_hospital_count > 0:
            print(f"🔧 Found {null_hospital_count} productions with null hospitalId, setting default values")
            # Get first hospital ID as default
            cursor.execute("SELECT id FROM hospitals LIMIT 1")
            default_hospital = cursor.fetchone()
            if default_hospital:
                cursor.execute("UPDATE productions SET hospitalId = ? WHERE hospitalId IS NULL OR hospitalId = ''", 
                             (default_hospital[0],))
                print("✅ Set default hospitalId for productions with null values")
        
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
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_database()