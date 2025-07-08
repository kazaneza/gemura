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
        print(f"Current production columns: {', '.join(production_columns.keys())}")
        
        # Check if we need to create a new productions table
        needs_rebuild = False
        
        if 'hospitalId' not in production_columns and 'schoolId' in production_columns:
            print("🔄 Need to rebuild productions table (missing hospitalId)")
            needs_rebuild = True
        
        if 'service' not in production_columns:
            print("🔄 Need to rebuild productions table (missing service)")
            needs_rebuild = True
            
        if 'patientsServed' not in production_columns:
            print("🔄 Need to rebuild productions table (missing patientsServed)")
            needs_rebuild = True
        
        if needs_rebuild:
            print("🏗️ Rebuilding productions table with correct schema")
            
            # Backup existing data
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS productions_backup AS 
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
            print("✅ Created new productions table with correct schema")
            
            # Get first hospital ID as default for migration
            cursor.execute("SELECT id FROM hospitals LIMIT 1")
            default_hospital = cursor.fetchone()
            
            if default_hospital:
                default_hospital_id = default_hospital[0]
                print(f"🔄 Using default hospital ID: {default_hospital_id}")
                
                # Check if backup has schoolId
                cursor.execute("PRAGMA table_info(productions_backup)")
                backup_columns = {column[1]: column for column in cursor.fetchall()}
                
                if 'schoolId' in backup_columns:
                    # Migrate data from backup, mapping schoolId to hospitalId
                    cursor.execute("""
                        INSERT INTO productions (
                            id, weekId, hospitalId, service, productionDate, 
                            patientsServed, createdBy, createdAt, updatedAt
                        )
                        SELECT 
                            id,
                            weekId,
                            schoolId as hospitalId,
                            'LUNCH' as service,
                            productionDate,
                            COALESCE(beneficiaries, 0) as patientsServed,
                            createdBy,
                            createdAt,
                            updatedAt
                        FROM productions_backup
                    """)
                else:
                    # If no schoolId, use default hospital
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
        
        # Check purchases table
        cursor.execute("PRAGMA table_info(purchases)")
        purchase_columns = {column[1]: column for column in cursor.fetchall()}
        print(f"Current purchase columns: {', '.join(purchase_columns.keys())}")
        
        if 'service' not in purchase_columns:
            print("🛒 Adding service column to purchases table")
            cursor.execute("ALTER TABLE purchases ADD COLUMN service TEXT DEFAULT 'LUNCH'")
            print("✅ Purchases table updated with service column")
        
        # Check hospitals table
        cursor.execute("PRAGMA table_info(hospitals)")
        hospital_columns = {column[1]: column for column in cursor.fetchall()}
        print(f"Current hospital columns: {', '.join(hospital_columns.keys())}")
        
        if 'beds' in hospital_columns and 'patientCapacity' not in hospital_columns:
            print("🏥 Migrating hospitals table: beds -> patientCapacity")
            cursor.execute("ALTER TABLE hospitals RENAME COLUMN beds TO patientCapacity")
            print("✅ Hospitals table migrated")
        
        # Commit all changes
        conn.commit()
        print("✅ Database schema fix completed successfully!")
        
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
        
    except Exception as e:
        print(f"❌ Schema fix failed: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    fix_database()