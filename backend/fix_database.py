import sqlite3
import os
from datetime import datetime

def fix_database():
    """Fix the database schema issues"""
    db_path = "kitchen_manager.db"
    
    if not os.path.exists(db_path):
        print("❌ Database file not found.")
        return
    
    print("🔄 Starting database schema fix...")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check current schema
        print("📋 Checking current schema...")
        
        # Check productions table
        cursor.execute("PRAGMA table_info(productions)")
        production_columns = {column[1]: column for column in cursor.fetchall()}
        print(f"Current productions columns: {', '.join(production_columns.keys())}")
        
        # Check purchases table
        cursor.execute("PRAGMA table_info(purchases)")
        purchase_columns = {column[1]: column for column in cursor.fetchall()}
        print(f"Current purchases columns: {', '.join(purchase_columns.keys())}")
        
        # Check hospitals table
        cursor.execute("PRAGMA table_info(hospitals)")
        hospital_columns = {column[1]: column for column in cursor.fetchall()}
        print(f"Current hospitals columns: {', '.join(hospital_columns.keys())}")
        
        # Backup tables before making changes
        print("📦 Creating backups of tables...")
        cursor.execute("CREATE TABLE IF NOT EXISTS productions_backup AS SELECT * FROM productions")
        cursor.execute("CREATE TABLE IF NOT EXISTS purchases_backup AS SELECT * FROM purchases")
        cursor.execute("CREATE TABLE IF NOT EXISTS hospitals_backup AS SELECT * FROM hospitals")
        
        # Fix hospitals table
        if 'beds' in hospital_columns and 'patientCapacity' not in hospital_columns:
            print("🏥 Fixing hospitals table: renaming beds to patientCapacity")
            cursor.execute("ALTER TABLE hospitals RENAME COLUMN beds TO patientCapacity")
        elif 'patientCapacity' in hospital_columns:
            print("✅ Hospitals table already has patientCapacity column")
        
        # Fix productions table - complete rebuild if needed
        if 'schoolId' in production_columns and 'hospitalId' not in production_columns:
            print("🏥 Rebuilding productions table with hospital-based schema")
            
            # Drop the table and recreate it
            cursor.execute("DROP TABLE productions")
            
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
            
            # Get first hospital ID as default for migration
            cursor.execute("SELECT id FROM hospitals LIMIT 1")
            default_hospital = cursor.fetchone()
            
            if default_hospital:
                default_hospital_id = default_hospital[0]
                print(f"🔄 Using default hospital ID: {default_hospital_id}")
                
                # Migrate data from backup
                cursor.execute("""
                    INSERT INTO productions (
                        id, weekId, hospitalId, service, productionDate, 
                        patientsServed, createdBy, createdAt, updatedAt
                    )
                    SELECT 
                        id,
                        weekId,
                        ? as hospitalId,
                        'LUNCH' as service,
                        productionDate,
                        COALESCE(beneficiaries, 0) as patientsServed,
                        createdBy,
                        createdAt,
                        updatedAt
                    FROM productions_backup
                """, (default_hospital_id,))
                
                migrated_count = cursor.rowcount
                print(f"✅ Migrated {migrated_count} production records")
            else:
                print("❌ No hospitals found - cannot migrate production data")
        
        # Fix purchases table
        if 'service' not in purchase_columns:
            print("🛒 Adding service column to purchases table")
            cursor.execute("ALTER TABLE purchases ADD COLUMN service TEXT DEFAULT 'LUNCH'")
            print("✅ Service column added to purchases table")
        
        # Commit changes
        conn.commit()
        print("✅ Database schema fixes applied successfully!")
        
        # Verify the changes
        print("\n📋 Verifying schema changes:")
        
        cursor.execute("PRAGMA table_info(productions)")
        production_columns = {column[1]: column for column in cursor.fetchall()}
        print(f"Updated productions columns: {', '.join(production_columns.keys())}")
        
        cursor.execute("PRAGMA table_info(purchases)")
        purchase_columns = {column[1]: column for column in cursor.fetchall()}
        print(f"Updated purchases columns: {', '.join(purchase_columns.keys())}")
        
        cursor.execute("PRAGMA table_info(hospitals)")
        hospital_columns = {column[1]: column for column in cursor.fetchall()}
        print(f"Updated hospitals columns: {', '.join(hospital_columns.keys())}")
        
    except Exception as e:
        print(f"❌ Database fix failed: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    fix_database()