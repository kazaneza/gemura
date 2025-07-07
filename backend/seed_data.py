import asyncio
from datetime import datetime, timedelta
from sqlmodel import Session, create_engine, SQLModel
from app.models import User, School, Ingredient, Week, UserRole, IngredientUnit, WeekStatus
from app.auth import get_password_hash
from app.database import engine

async def seed_database():
    print("🌱 Seeding database...")
    
    # First, create all tables
    print("📋 Creating database tables...")
    SQLModel.metadata.create_all(engine)
    print("✅ Database tables created")
    
    with Session(engine) as session:
        try:
            # Create admin user
            admin_password = get_password_hash("admin123")
            admin_user = User(
                email="admin@kitchen.com",
                password=admin_password,
                firstName="Kitchen",
                lastName="Administrator",
                role=UserRole.ADMIN,
                isActive=True
            )
            session.add(admin_user)
            print(f"✅ Created admin user: {admin_user.email}")
            
            # Create data entry user
            data_password = get_password_hash("data123")
            data_user = User(
                email="data@kitchen.com",
                password=data_password,
                firstName="Data",
                lastName="Entry",
                role=UserRole.DATA_ENTRY,
                isActive=True
            )
            session.add(data_user)
            print(f"✅ Created data entry user: {data_user.email}")
            
            # Create viewer user
            viewer_password = get_password_hash("viewer123")
            viewer_user = User(
                email="viewer@kitchen.com",
                password=viewer_password,
                firstName="Report",
                lastName="Viewer",
                role=UserRole.VIEWER,
                isActive=True
            )
            session.add(viewer_user)
            print(f"✅ Created viewer user: {viewer_user.email}")
            
            # Create sample hospitals
            hospitals_data = [
                {"name": "Central Hospital", "location": "Kigali, Gasabo", "beds": 450, "contact": "admin@central.hospital", "active": True},
                {"name": "Memorial Hospital", "location": "Kigali, Kicukiro", "beds": 620, "contact": "admin@memorial.hospital", "active": True},
                {"name": "University Hospital", "location": "Kigali, Nyarugenge", "beds": 850, "contact": "office@university.hospital", "active": True},
                {"name": "Community Hospital", "location": "Kigali, Gasabo", "beds": 280, "contact": "info@community.hospital", "active": True},
            ]
            
            for hospital_data in hospitals_data:
                hospital = Hospital(**hospital_data)
                session.add(hospital)
                print(f"✅ Created hospital: {hospital.name}")
            
            # Create sample ingredients
            ingredients_data = [
                {"name": "Rice", "unit": IngredientUnit.KG, "lastPrice": 2200},
                {"name": "Dry Beans", "unit": IngredientUnit.KG, "lastPrice": 3500},
                {"name": "White cabbage", "unit": IngredientUnit.KG, "lastPrice": 1800},
                {"name": "Onion", "unit": IngredientUnit.KG, "lastPrice": 2000},
                {"name": "Cooking oil", "unit": IngredientUnit.LTR, "lastPrice": 3200},
                {"name": "Tomato paste", "unit": IngredientUnit.PCS, "lastPrice": 1500},
                {"name": "Fresh tomatoes", "unit": IngredientUnit.KG, "lastPrice": 3000},
                {"name": "Starch", "unit": IngredientUnit.KG, "lastPrice": 2800},
                {"name": "Salt", "unit": IngredientUnit.KG, "lastPrice": 800},
            ]
            
            for ingredient_data in ingredients_data:
                ingredient = Ingredient(**ingredient_data)
                session.add(ingredient)
                print(f"✅ Created ingredient: {ingredient.name}")
            
            # Create sample weeks
            today = datetime.now()
            current_week_start = today - timedelta(days=today.weekday())
            
            for i in range(4):  # Create 4 weeks
                week_start = current_week_start - timedelta(weeks=i)
                week_end = week_start + timedelta(days=6)
                
                week = Week(
                    month=week_start.month,
                    year=week_start.year,
                    weekNumber=week_start.isocalendar()[1],
                    startDate=week_start,
                    endDate=week_end,
                    status=WeekStatus.ACTIVE if i == 0 else WeekStatus.COMPLETED
                )
                session.add(week)
                print(f"✅ Created week: {week.year}-W{week.weekNumber}")
            
            session.commit()
            print("🎉 Database seeded successfully!")
            print("\n📋 Login credentials:")
            print("Admin: admin@kitchen.com / admin123")
            print("Data Entry: data@kitchen.com / data123")
            print("Viewer: viewer@kitchen.com / viewer123")
            
        except Exception as e:
            print(f"❌ Error seeding database: {e}")
            session.rollback()
            raise

if __name__ == "__main__":
    asyncio.run(seed_database())