import asyncio
from datetime import datetime, timedelta
from sqlmodel import Session, create_engine, SQLModel, select
from app.models import (
    User, Hospital, Ingredient, Week, Purchase, Production, IndirectCost,
    UserRole, IngredientUnit, WeekStatus, MealService
)
from app.database import engine

async def seed_march_2025_data():
    print("🌱 Seeding March 2025 data...")
    
    with Session(engine) as session:
        try:
            # Get the admin user for created_by fields
            admin_user = session.exec(
                select(User).where(User.email == "admin@kitchen.com")
            ).first()
            
            if not admin_user:
                print("❌ Admin user not found. Please run seed_data.py first.")
                return
            
            # Create March 2025 weeks
            march_weeks = [
                {
                    "weekNumber": 9,
                    "startDate": datetime(2025, 3, 3),
                    "endDate": datetime(2025, 3, 9),
                    "mealsServed": 37475,
                    "ingredientCost": 6536360,
                    "costPerMeal": 174.4,
                    "overheadPerMeal": 65.7,
                    "totalCPM": 240.1
                },
                {
                    "weekNumber": 10,
                    "startDate": datetime(2025, 3, 10),
                    "endDate": datetime(2025, 3, 16),
                    "mealsServed": 37475,
                    "ingredientCost": 6904180,
                    "costPerMeal": 184.2,
                    "overheadPerMeal": 65.7,
                    "totalCPM": 249.9
                },
                {
                    "weekNumber": 11,
                    "startDate": datetime(2025, 3, 17),
                    "endDate": datetime(2025, 3, 23),
                    "mealsServed": 37475,
                    "ingredientCost": 6603335,
                    "costPerMeal": 176.2,
                    "overheadPerMeal": 65.7,
                    "totalCPM": 241.9
                },
                {
                    "weekNumber": 12,
                    "startDate": datetime(2025, 3, 24),
                    "endDate": datetime(2025, 3, 30),
                    "mealsServed": 37475,
                    "ingredientCost": 6526590,
                    "costPerMeal": 174.2,
                    "overheadPerMeal": 65.7,
                    "totalCPM": 239.9
                }
            ]
            
            created_weeks = {}
            for week_data in march_weeks:
                week = Week(
                    month=3,
                    year=2025,
                    weekNumber=week_data["weekNumber"],
                    startDate=week_data["startDate"],
                    endDate=week_data["endDate"],
                    mealsServed=week_data["mealsServed"],
                    ingredientCost=week_data["ingredientCost"],
                    costPerMeal=week_data["costPerMeal"],
                    overheadPerMeal=week_data["overheadPerMeal"],
                    totalCPM=week_data["totalCPM"],
                    status=WeekStatus.COMPLETED
                )
                session.add(week)
                session.commit()
                created_weeks[week.weekNumber] = week
                print(f"✅ Created week: 2025-W{week.weekNumber}")
            
            # Get existing hospitals
            central = session.exec(
                select(Hospital).where(Hospital.name.contains("Central"))
            ).first()
            memorial = session.exec(
                select(Hospital).where(Hospital.name.contains("Memorial"))
            ).first()
            
            # If hospitals don't exist, create them
            if not central:
                central = Hospital(
                    name="Central Hospital",
                    location="Kigali",
                    patientCapacity=450,
                    contact="admin@central.hospital",
                    active=True
                )
                session.add(central)
                session.commit()
                print("✅ Created hospital: Central Hospital")
            
            if not memorial:
                memorial = Hospital(
                    name="Memorial Hospital",
                    location="Kigali",
                    patientCapacity=620,
                    contact="admin@memorial.hospital",
                    active=True
                )
                session.add(memorial)
                session.commit()
                print("✅ Created hospital: Memorial Hospital")
            
            # Define purchases for each week and service
            week_purchases = {
                9: [  # Week 1 (March 3-9)
                    # March 3 - Breakfast
                    {"name": "Rice", "quantity": 325, "unitPrice": 863, "totalPrice": 280475, "date": datetime(2025, 3, 3), "service": MealService.BREAKFAST},
                    {"name": "Dry Beans", "quantity": 60, "unitPrice": 1150, "totalPrice": 69000, "date": datetime(2025, 3, 3), "service": MealService.BREAKFAST},
                    {"name": "White cabbage", "quantity": 80, "unitPrice": 250, "totalPrice": 20000, "date": datetime(2025, 3, 3), "service": MealService.BREAKFAST},
                    {"name": "Onion", "quantity": 4, "unitPrice": 800, "totalPrice": 3200, "date": datetime(2025, 3, 3), "service": MealService.BREAKFAST},
                    
                    # March 3 - Lunch
                    {"name": "Rice", "quantity": 300, "unitPrice": 863, "totalPrice": 258900, "date": datetime(2025, 3, 3), "service": MealService.LUNCH},
                    {"name": "Dry Beans", "quantity": 50, "unitPrice": 1150, "totalPrice": 57500, "date": datetime(2025, 3, 3), "service": MealService.LUNCH},
                    {"name": "White cabbage", "quantity": 90, "unitPrice": 250, "totalPrice": 22500, "date": datetime(2025, 3, 3), "service": MealService.LUNCH},
                    {"name": "Cooking oil", "quantity": 8, "unitPrice": 2300, "totalPrice": 18400, "date": datetime(2025, 3, 3), "service": MealService.LUNCH},
                    
                    # March 3 - Dinner
                    {"name": "Rice", "quantity": 300, "unitPrice": 863, "totalPrice": 258900, "date": datetime(2025, 3, 3), "service": MealService.DINNER},
                    {"name": "Dry Beans", "quantity": 50, "unitPrice": 1150, "totalPrice": 57500, "date": datetime(2025, 3, 3), "service": MealService.DINNER},
                    {"name": "White cabbage", "quantity": 80, "unitPrice": 250, "totalPrice": 20000, "date": datetime(2025, 3, 3), "service": MealService.DINNER},
                    {"name": "Cooking oil", "quantity": 8, "unitPrice": 2300, "totalPrice": 18400, "date": datetime(2025, 3, 3), "service": MealService.DINNER},
                    
                    # March 4 - Breakfast
                    {"name": "Kawunga", "quantity": 200, "unitPrice": 740, "totalPrice": 148000, "date": datetime(2025, 3, 4), "service": MealService.BREAKFAST},
                    {"name": "Isombe", "quantity": 100, "unitPrice": 800, "totalPrice": 80000, "date": datetime(2025, 3, 4), "service": MealService.BREAKFAST},
                    {"name": "Palm Oil", "quantity": 2, "unitPrice": 2700, "totalPrice": 5400, "date": datetime(2025, 3, 4), "service": MealService.BREAKFAST},
                    
                    # March 4 - Lunch
                    {"name": "Kawunga", "quantity": 200, "unitPrice": 740, "totalPrice": 148000, "date": datetime(2025, 3, 4), "service": MealService.LUNCH},
                    {"name": "Isombe", "quantity": 100, "unitPrice": 800, "totalPrice": 80000, "date": datetime(2025, 3, 4), "service": MealService.LUNCH},
                    {"name": "Peanut powder", "quantity": 40, "unitPrice": 2900, "totalPrice": 116000, "date": datetime(2025, 3, 4), "service": MealService.LUNCH},
                    
                    # March 4 - Dinner
                    {"name": "Kawunga", "quantity": 200, "unitPrice": 740, "totalPrice": 148000, "date": datetime(2025, 3, 4), "service": MealService.DINNER},
                    {"name": "Isombe", "quantity": 100, "unitPrice": 800, "totalPrice": 80000, "date": datetime(2025, 3, 4), "service": MealService.DINNER},
                    {"name": "Peanut powder", "quantity": 40, "unitPrice": 2900, "totalPrice": 116000, "date": datetime(2025, 3, 4), "service": MealService.DINNER},
                ],
                10: [  # Week 2 (March 10-16)
                    # March 10 - Breakfast
                    {"name": "Kawunga", "quantity": 200, "unitPrice": 740, "totalPrice": 148000, "date": datetime(2025, 3, 10), "service": MealService.BREAKFAST},
                    {"name": "Dry Beans", "quantity": 50, "unitPrice": 1150, "totalPrice": 57500, "date": datetime(2025, 3, 10), "service": MealService.BREAKFAST},
                    
                    # March 10 - Lunch
                    {"name": "Kawunga", "quantity": 200, "unitPrice": 740, "totalPrice": 148000, "date": datetime(2025, 3, 10), "service": MealService.LUNCH},
                    {"name": "Dry Beans", "quantity": 60, "unitPrice": 1150, "totalPrice": 69000, "date": datetime(2025, 3, 10), "service": MealService.LUNCH},
                    {"name": "White cabbage", "quantity": 125, "unitPrice": 250, "totalPrice": 31250, "date": datetime(2025, 3, 10), "service": MealService.LUNCH},
                    
                    # March 10 - Dinner
                    {"name": "Kawunga", "quantity": 200, "unitPrice": 740, "totalPrice": 148000, "date": datetime(2025, 3, 10), "service": MealService.DINNER},
                    {"name": "Dry Beans", "quantity": 50, "unitPrice": 1150, "totalPrice": 57500, "date": datetime(2025, 3, 10), "service": MealService.DINNER},
                    {"name": "White cabbage", "quantity": 125, "unitPrice": 250, "totalPrice": 31250, "date": datetime(2025, 3, 10), "service": MealService.DINNER},
                ]
            }
            
            # Create or get ingredients
            ingredients = {}
            ingredient_units = {
                "Rice": IngredientUnit.KG,
                "Kawunga": IngredientUnit.KG,
                "Dry Beans": IngredientUnit.KG,
                "White cabbage": IngredientUnit.KG,
                "Onion": IngredientUnit.KG,
                "Cooking oil": IngredientUnit.LTR,
                "Tomato paste": IngredientUnit.PCS,
                "Fresh tomatoes": IngredientUnit.KG,
                "Starch": IngredientUnit.KG,
                "Salt": IngredientUnit.KG,
                "Isombe": IngredientUnit.KG,
                "Palm Oil": IngredientUnit.LTR,
                "Peanut powder": IngredientUnit.KG,
                "Celery": IngredientUnit.PCS,
                "Garlic": IngredientUnit.KG,
                "Sweet Potatoes": IngredientUnit.KG,
                "Dodo": IngredientUnit.KG,
                "Small Fish": IngredientUnit.KG,
                "Eggplant": IngredientUnit.KG
            }
            
            for ing_name, unit in ingredient_units.items():
                ingredient = session.exec(
                    select(Ingredient).where(Ingredient.name == ing_name)
                ).first()
                
                if not ingredient:
                    ingredient = Ingredient(
                        name=ing_name,
                        unit=unit,
                        lastPrice=0  # Will be updated with purchases
                    )
                    session.add(ingredient)
                    session.commit()
                    print(f"✅ Created ingredient: {ing_name}")
                
                ingredients[ing_name] = ingredient
            
            # Process purchases for each week
            total_purchases = 0
            for week_num, purchases in week_purchases.items():
                week = created_weeks[week_num]
                print(f"\n📦 Processing purchases for Week {week_num}...")
                
                for purchase_data in purchases:
                    ingredient = ingredients[purchase_data["name"]]
                    
                    # Update ingredient's last price
                    ingredient.lastPrice = purchase_data["unitPrice"]
                    
                    purchase = Purchase(
                        weekId=week.id,
                        ingredientId=ingredient.id,
                        service=purchase_data["service"],
                        purchaseDate=purchase_data["date"],
                        quantity=purchase_data["quantity"],
                        unitPrice=purchase_data["unitPrice"],
                        totalPrice=purchase_data["totalPrice"],
                        createdBy=admin_user.id
                    )
                    session.add(purchase)
                    total_purchases += 1
                
                session.commit()
                print(f"✅ Added {len(purchases)} purchases for Week {week_num}")
            
            # Define productions for each week
            week_productions = {
                9: [  # Week 1
                    # March 3
                    {"hospital": "central", "date": datetime(2025, 3, 3), "service": MealService.BREAKFAST, "patients": 420},
                    {"hospital": "memorial", "date": datetime(2025, 3, 3), "service": MealService.BREAKFAST, "patients": 580},
                    {"hospital": "central", "date": datetime(2025, 3, 3), "service": MealService.LUNCH, "patients": 430},
                    {"hospital": "memorial", "date": datetime(2025, 3, 3), "service": MealService.LUNCH, "patients": 590},
                    {"hospital": "central", "date": datetime(2025, 3, 3), "service": MealService.DINNER, "patients": 410},
                    {"hospital": "memorial", "date": datetime(2025, 3, 3), "service": MealService.DINNER, "patients": 570},
                    
                    # March 4
                    {"hospital": "central", "date": datetime(2025, 3, 4), "service": MealService.BREAKFAST, "patients": 425},
                    {"hospital": "memorial", "date": datetime(2025, 3, 4), "service": MealService.BREAKFAST, "patients": 585},
                    {"hospital": "central", "date": datetime(2025, 3, 4), "service": MealService.LUNCH, "patients": 435},
                    {"hospital": "memorial", "date": datetime(2025, 3, 4), "service": MealService.LUNCH, "patients": 595},
                    {"hospital": "central", "date": datetime(2025, 3, 4), "service": MealService.DINNER, "patients": 415},
                    {"hospital": "memorial", "date": datetime(2025, 3, 4), "service": MealService.DINNER, "patients": 575},
                ],
                10: [  # Week 2
                    # March 10
                    {"hospital": "central", "date": datetime(2025, 3, 10), "service": MealService.BREAKFAST, "patients": 430},
                    {"hospital": "memorial", "date": datetime(2025, 3, 10), "service": MealService.BREAKFAST, "patients": 590},
                    {"hospital": "central", "date": datetime(2025, 3, 10), "service": MealService.LUNCH, "patients": 440},
                    {"hospital": "memorial", "date": datetime(2025, 3, 10), "service": MealService.LUNCH, "patients": 600},
                    {"hospital": "central", "date": datetime(2025, 3, 10), "service": MealService.DINNER, "patients": 420},
                    {"hospital": "memorial", "date": datetime(2025, 3, 10), "service": MealService.DINNER, "patients": 580},
                ]
            }
            
            # Process productions for each week
            total_productions = 0
            for week_num, productions in week_productions.items():
                week = created_weeks[week_num]
                print(f"\n🍽️ Processing productions for Week {week_num}...")
                
                for prod_data in productions:
                    hospital_name = prod_data["hospital"]
                    hospital = central if hospital_name == "central" else memorial
                    
                    production = Production(
                        weekId=week.id,
                        hospitalId=hospital.id,
                        service=prod_data["service"],
                        productionDate=prod_data["date"],
                        patientsServed=prod_data["patients"],
                        createdBy=admin_user.id
                    )
                    session.add(production)
                    total_productions += 1
                
                session.commit()
                print(f"✅ Added {len(productions)} productions for Week {week_num}")
            
            # Create indirect costs for March 2025
            indirect_costs_data = [
                {"category": "Staff Salaries", "description": "PC Staff Salaries", "amount": 13113063, "code": "5117"},
                {"category": "Kitchen Operations", "description": "DCOI Kitchen Fuel - Gas", "amount": 13095000, "code": "5215"},
                {"category": "Labor", "description": "ICOI Casual Labour", "amount": 50588, "code": "5313"},
                {"category": "Utilities", "description": "ICOI Electricity", "amount": 1742473, "code": "5411"},
                {"category": "Utilities", "description": "ICOI Water", "amount": 503949, "code": "5412"},
                {"category": "Maintenance", "description": "Vehicle & Equipment repairs", "amount": 2539357, "code": ""},
                {"category": "Transportation", "description": "Staff delivery fees", "amount": 540000, "code": ""}
            ]
            
            print("\n💰 Creating indirect costs for March 2025...")
            for cost_data in indirect_costs_data:
                indirect_cost = IndirectCost(
                    month=3,
                    year=2025,
                    category=cost_data["category"],
                    description=cost_data["description"],
                    amount=cost_data["amount"],
                    code=cost_data["code"] if cost_data["code"] else None,
                    createdBy=admin_user.id
                )
                session.add(indirect_cost)
            
            session.commit()
            print(f"✅ Created {len(indirect_costs_data)} indirect costs")
            
            print("\n🎉 March 2025 data seeded successfully!")
            print(f"📊 Summary:")
            print(f"  - Weeks created: {len(created_weeks)}")
            print(f"  - Purchases added: {total_purchases}")
            print(f"  - Productions added: {total_productions}")
            print(f"  - Indirect costs added: {len(indirect_costs_data)}")
            
        except Exception as e:
            print(f"❌ Error seeding March 2025 data: {e}")
            session.rollback()
            raise

if __name__ == "__main__":
    asyncio.run(seed_march_2025_data())