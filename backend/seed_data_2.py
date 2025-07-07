import asyncio
from datetime import datetime, timedelta
from sqlmodel import Session, create_engine, SQLModel, select
from app.models import (
    User, School, Ingredient, Week, Purchase, Production, IndirectCost,
    UserRole, IngredientUnit, WeekStatus
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
                    beds=1608,
                    active=True
                )
                session.add(central)
                session.commit()
                print("✅ Created hospital: Central Hospital")
            
            if not memorial:
                memorial = Hospital(
                    name="Memorial Hospital",
                    location="Kigali",
                    beds=5887,
                    active=True
                )
                session.add(memorial)
                session.commit()
                print("✅ Created hospital: Memorial Hospital")
            
            # Define purchases for each week
            week_purchases = {
                9: [  # Week 1 (March 3-9)
                    # March 3
                    {"name": "Rice", "quantity": 925, "unitPrice": 863, "totalPrice": 798275, "date": datetime(2025, 3, 3)},
                    {"name": "Dry Beans", "quantity": 160, "unitPrice": 1150, "totalPrice": 184000, "date": datetime(2025, 3, 3)},
                    {"name": "White cabbage", "quantity": 250, "unitPrice": 250, "totalPrice": 62500, "date": datetime(2025, 3, 3)},
                    {"name": "Onion", "quantity": 12, "unitPrice": 800, "totalPrice": 9600, "date": datetime(2025, 3, 3)},
                    {"name": "Cooking oil", "quantity": 16, "unitPrice": 2300, "totalPrice": 36800, "date": datetime(2025, 3, 3)},
                    {"name": "Tomato paste", "quantity": 100, "unitPrice": 220, "totalPrice": 22000, "date": datetime(2025, 3, 3)},
                    {"name": "Fresh tomatoes", "quantity": 30, "unitPrice": 1500, "totalPrice": 45000, "date": datetime(2025, 3, 3)},
                    {"name": "Starch", "quantity": 25, "unitPrice": 1120, "totalPrice": 28000, "date": datetime(2025, 3, 3)},
                    {"name": "Salt", "quantity": 20, "unitPrice": 420, "totalPrice": 8400, "date": datetime(2025, 3, 3)},
                    # March 4
                    {"name": "Kawunga", "quantity": 600, "unitPrice": 740, "totalPrice": 444000, "date": datetime(2025, 3, 4)},
                    {"name": "Isombe", "quantity": 300, "unitPrice": 800, "totalPrice": 240000, "date": datetime(2025, 3, 4)},
                    {"name": "Palm Oil", "quantity": 4, "unitPrice": 2700, "totalPrice": 10800, "date": datetime(2025, 3, 4)},
                    {"name": "Peanut powder", "quantity": 80, "unitPrice": 2900, "totalPrice": 232000, "date": datetime(2025, 3, 4)},
                    {"name": "Celery", "quantity": 4, "unitPrice": 700, "totalPrice": 2800, "date": datetime(2025, 3, 4)},
                    {"name": "Garlic", "quantity": 1, "unitPrice": 6500, "totalPrice": 6500, "date": datetime(2025, 3, 4)},
                    {"name": "Salt", "quantity": 21, "unitPrice": 410, "totalPrice": 8610, "date": datetime(2025, 3, 4)},
                    {"name": "Cooking oil", "quantity": 9, "unitPrice": 2300, "totalPrice": 20700, "date": datetime(2025, 3, 4)},
                    {"name": "Onion", "quantity": 7, "unitPrice": 800, "totalPrice": 5600, "date": datetime(2025, 3, 4)},
                    # March 5
                    {"name": "Sweet Potatoes", "quantity": 3700, "unitPrice": 550, "totalPrice": 2035000, "date": datetime(2025, 3, 5)},
                    {"name": "Dry Beans", "quantity": 160, "unitPrice": 1150, "totalPrice": 184000, "date": datetime(2025, 3, 5)},
                    {"name": "White cabbage", "quantity": 120, "unitPrice": 250, "totalPrice": 30000, "date": datetime(2025, 3, 5)},
                    {"name": "Dodo", "quantity": 110, "unitPrice": 500, "totalPrice": 55000, "date": datetime(2025, 3, 5)},
                    {"name": "Onion", "quantity": 12, "unitPrice": 800, "totalPrice": 9600, "date": datetime(2025, 3, 5)},
                    {"name": "Cooking oil", "quantity": 9, "unitPrice": 2300, "totalPrice": 20700, "date": datetime(2025, 3, 5)},
                    {"name": "Fresh tomatoes", "quantity": 40, "unitPrice": 1500, "totalPrice": 60000, "date": datetime(2025, 3, 5)},
                    {"name": "Starch", "quantity": 25, "unitPrice": 1120, "totalPrice": 28000, "date": datetime(2025, 3, 5)},
                    {"name": "Salt", "quantity": 20, "unitPrice": 420, "totalPrice": 8400, "date": datetime(2025, 3, 5)},
                ],
                10: [  # Week 2 (March 10-16)
                    # March 10
                    {"name": "Kawunga", "quantity": 600, "unitPrice": 740, "totalPrice": 444000, "date": datetime(2025, 3, 10)},
                    {"name": "Dry Beans", "quantity": 160, "unitPrice": 1150, "totalPrice": 184000, "date": datetime(2025, 3, 10)},
                    {"name": "White cabbage", "quantity": 250, "unitPrice": 250, "totalPrice": 62500, "date": datetime(2025, 3, 10)},
                    {"name": "Garlic", "quantity": 1, "unitPrice": 6500, "totalPrice": 6500, "date": datetime(2025, 3, 10)},
                    {"name": "Onion", "quantity": 12, "unitPrice": 800, "totalPrice": 9600, "date": datetime(2025, 3, 10)},
                    {"name": "Cooking oil", "quantity": 17, "unitPrice": 2300, "totalPrice": 39100, "date": datetime(2025, 3, 10)},
                    {"name": "Fresh tomatoes", "quantity": 50, "unitPrice": 1500, "totalPrice": 75000, "date": datetime(2025, 3, 10)},
                    {"name": "Starch", "quantity": 25, "unitPrice": 1120, "totalPrice": 28000, "date": datetime(2025, 3, 10)},
                    {"name": "Salt", "quantity": 20, "unitPrice": 420, "totalPrice": 8400, "date": datetime(2025, 3, 10)},
                    # March 11
                    {"name": "Rice", "quantity": 925, "unitPrice": 863, "totalPrice": 798275, "date": datetime(2025, 3, 11)},
                    {"name": "Isombe", "quantity": 300, "unitPrice": 800, "totalPrice": 240000, "date": datetime(2025, 3, 11)},
                    {"name": "Peanut powder", "quantity": 80, "unitPrice": 2900, "totalPrice": 232000, "date": datetime(2025, 3, 11)},
                    {"name": "Garlic", "quantity": 1, "unitPrice": 6500, "totalPrice": 6500, "date": datetime(2025, 3, 11)},
                    {"name": "Starch", "quantity": 25, "unitPrice": 1120, "totalPrice": 28000, "date": datetime(2025, 3, 11)},
                    {"name": "Salt", "quantity": 20, "unitPrice": 420, "totalPrice": 8400, "date": datetime(2025, 3, 11)},
                    {"name": "Palm Oil", "quantity": 4, "unitPrice": 2700, "totalPrice": 10800, "date": datetime(2025, 3, 11)},
                    {"name": "Cooking oil", "quantity": 4, "unitPrice": 2300, "totalPrice": 9200, "date": datetime(2025, 3, 11)},
                    {"name": "Onion", "quantity": 7, "unitPrice": 800, "totalPrice": 5600, "date": datetime(2025, 3, 11)},
                    # March 12
                    {"name": "Sweet Potatoes", "quantity": 3800, "unitPrice": 550, "totalPrice": 2090000, "date": datetime(2025, 3, 12)},
                    {"name": "Rice", "quantity": 925, "unitPrice": 863, "totalPrice": 798275, "date": datetime(2025, 3, 12)},
                    {"name": "Dry Beans", "quantity": 160, "unitPrice": 1150, "totalPrice": 184000, "date": datetime(2025, 3, 12)},
                    {"name": "White cabbage", "quantity": 300, "unitPrice": 250, "totalPrice": 75000, "date": datetime(2025, 3, 12)},
                    {"name": "Onion", "quantity": 12, "unitPrice": 800, "totalPrice": 9600, "date": datetime(2025, 3, 12)},
                    {"name": "Cooking oil", "quantity": 17, "unitPrice": 2300, "totalPrice": 39100, "date": datetime(2025, 3, 12)},
                    {"name": "Fresh tomatoes", "quantity": 60, "unitPrice": 1500, "totalPrice": 90000, "date": datetime(2025, 3, 12)},
                    {"name": "Starch", "quantity": 20, "unitPrice": 1120, "totalPrice": 22400, "date": datetime(2025, 3, 12)},
                    {"name": "Small Fish", "quantity": 12, "unitPrice": 6500, "totalPrice": 78000, "date": datetime(2025, 3, 12)},
                ],
                11: [  # Week 3 (March 17-23)
                    # March 17
                    {"name": "Kawunga", "quantity": 600, "unitPrice": 740, "totalPrice": 444000, "date": datetime(2025, 3, 17)},
                    {"name": "Dry Beans", "quantity": 160, "unitPrice": 863, "totalPrice": 138080, "date": datetime(2025, 3, 17)},
                    {"name": "White cabbage", "quantity": 250, "unitPrice": 250, "totalPrice": 62500, "date": datetime(2025, 3, 17)},
                    {"name": "Eggplant", "quantity": 100, "unitPrice": 350, "totalPrice": 35000, "date": datetime(2025, 3, 17)},
                    {"name": "Onion", "quantity": 12, "unitPrice": 750, "totalPrice": 9000, "date": datetime(2025, 3, 17)},
                    {"name": "Cooking oil", "quantity": 17, "unitPrice": 2300, "totalPrice": 39100, "date": datetime(2025, 3, 17)},
                    {"name": "Fresh tomatoes", "quantity": 60, "unitPrice": 1500, "totalPrice": 90000, "date": datetime(2025, 3, 17)},
                    {"name": "Starch", "quantity": 25, "unitPrice": 1120, "totalPrice": 28000, "date": datetime(2025, 3, 17)},
                    {"name": "Salt", "quantity": 20, "unitPrice": 420, "totalPrice": 8400, "date": datetime(2025, 3, 17)},
                    # March 18
                    {"name": "Rice", "quantity": 900, "unitPrice": 863, "totalPrice": 776700, "date": datetime(2025, 3, 18)},
                    {"name": "Isombe", "quantity": 300, "unitPrice": 800, "totalPrice": 240000, "date": datetime(2025, 3, 18)},
                    {"name": "Peanut powder", "quantity": 80, "unitPrice": 2900, "totalPrice": 232000, "date": datetime(2025, 3, 18)},
                    {"name": "Garlic", "quantity": 1, "unitPrice": 6500, "totalPrice": 6500, "date": datetime(2025, 3, 18)},
                    {"name": "Starch", "quantity": 25, "unitPrice": 1120, "totalPrice": 28000, "date": datetime(2025, 3, 18)},
                    {"name": "Salt", "quantity": 20, "unitPrice": 420, "totalPrice": 8400, "date": datetime(2025, 3, 18)},
                    {"name": "Palm Oil", "quantity": 4, "unitPrice": 2700, "totalPrice": 10800, "date": datetime(2025, 3, 18)},
                    {"name": "Cooking oil", "quantity": 9, "unitPrice": 2300, "totalPrice": 20700, "date": datetime(2025, 3, 18)},
                    {"name": "Onion", "quantity": 7, "unitPrice": 750, "totalPrice": 5250, "date": datetime(2025, 3, 18)},
                    # March 19
                    {"name": "Sweet Potatoes", "quantity": 3800, "unitPrice": 550, "totalPrice": 2090000, "date": datetime(2025, 3, 19)},
                    {"name": "Dry Beans", "quantity": 170, "unitPrice": 1050, "totalPrice": 178500, "date": datetime(2025, 3, 19)},
                    {"name": "White cabbage", "quantity": 300, "unitPrice": 250, "totalPrice": 75000, "date": datetime(2025, 3, 19)},
                    {"name": "Onion", "quantity": 12, "unitPrice": 750, "totalPrice": 9000, "date": datetime(2025, 3, 19)},
                    {"name": "Cooking oil", "quantity": 17, "unitPrice": 2300, "totalPrice": 39100, "date": datetime(2025, 3, 19)},
                    {"name": "Fresh tomatoes", "quantity": 60, "unitPrice": 1500, "totalPrice": 90000, "date": datetime(2025, 3, 19)},
                    {"name": "Starch", "quantity": 20, "unitPrice": 1120, "totalPrice": 22400, "date": datetime(2025, 3, 19)},
                    {"name": "Small Fish", "quantity": 12, "unitPrice": 6500, "totalPrice": 78000, "date": datetime(2025, 3, 19)},
                    {"name": "Salt", "quantity": 20, "unitPrice": 420, "totalPrice": 8400, "date": datetime(2025, 3, 19)},
                ],
                12: [  # Week 4 (March 24-30)
                    # March 24
                    {"name": "Kawunga", "quantity": 640, "unitPrice": 740, "totalPrice": 473600, "date": datetime(2025, 3, 24)},
                    {"name": "Dry Beans", "quantity": 180, "unitPrice": 863, "totalPrice": 155340, "date": datetime(2025, 3, 24)},
                    {"name": "White cabbage", "quantity": 300, "unitPrice": 250, "totalPrice": 75000, "date": datetime(2025, 3, 24)},
                    {"name": "Eggplant", "quantity": 100, "unitPrice": 350, "totalPrice": 35000, "date": datetime(2025, 3, 24)},
                    {"name": "Onion", "quantity": 12, "unitPrice": 750, "totalPrice": 9000, "date": datetime(2025, 3, 24)},
                    {"name": "Cooking oil", "quantity": 17, "unitPrice": 2300, "totalPrice": 39100, "date": datetime(2025, 3, 24)},
                    {"name": "Fresh tomatoes", "quantity": 60, "unitPrice": 1500, "totalPrice": 90000, "date": datetime(2025, 3, 24)},
                    {"name": "Starch", "quantity": 25, "unitPrice": 1120, "totalPrice": 28000, "date": datetime(2025, 3, 24)},
                    {"name": "Salt", "quantity": 20, "unitPrice": 420, "totalPrice": 8400, "date": datetime(2025, 3, 24)},
                    # March 25
                    {"name": "Rice", "quantity": 900, "unitPrice": 863, "totalPrice": 776700, "date": datetime(2025, 3, 25)},
                    {"name": "Isombe", "quantity": 300, "unitPrice": 800, "totalPrice": 240000, "date": datetime(2025, 3, 25)},
                    {"name": "Peanut powder", "quantity": 80, "unitPrice": 2900, "totalPrice": 232000, "date": datetime(2025, 3, 25)},
                    {"name": "Garlic", "quantity": 1, "unitPrice": 6500, "totalPrice": 6500, "date": datetime(2025, 3, 25)},
                    {"name": "Starch", "quantity": 25, "unitPrice": 1120, "totalPrice": 28000, "date": datetime(2025, 3, 25)},
                    {"name": "Salt", "quantity": 20, "unitPrice": 420, "totalPrice": 8400, "date": datetime(2025, 3, 25)},
                    {"name": "Palm Oil", "quantity": 4, "unitPrice": 2700, "totalPrice": 10800, "date": datetime(2025, 3, 25)},
                    {"name": "Cooking oil", "quantity": 9, "unitPrice": 2300, "totalPrice": 20700, "date": datetime(2025, 3, 25)},
                    {"name": "Onion", "quantity": 7, "unitPrice": 750, "totalPrice": 5250, "date": datetime(2025, 3, 25)},
                    # March 26
                    {"name": "Sweet Potatoes", "quantity": 3700, "unitPrice": 550, "totalPrice": 2035000, "date": datetime(2025, 3, 26)},
                    {"name": "Dry Beans", "quantity": 180, "unitPrice": 1050, "totalPrice": 189000, "date": datetime(2025, 3, 26)},
                    {"name": "White cabbage", "quantity": 300, "unitPrice": 250, "totalPrice": 75000, "date": datetime(2025, 3, 26)},
                    {"name": "Onion", "quantity": 12, "unitPrice": 750, "totalPrice": 9000, "date": datetime(2025, 3, 26)},
                    {"name": "Cooking oil", "quantity": 17, "unitPrice": 2300, "totalPrice": 39100, "date": datetime(2025, 3, 26)},
                    {"name": "Fresh tomatoes", "quantity": 60, "unitPrice": 1500, "totalPrice": 90000, "date": datetime(2025, 3, 26)},
                    {"name": "Starch", "quantity": 25, "unitPrice": 1120, "totalPrice": 28000, "date": datetime(2025, 3, 26)},
                    {"name": "Small Fish", "quantity": 12, "unitPrice": 6500, "totalPrice": 78000, "date": datetime(2025, 3, 26)},
                    {"name": "Salt", "quantity": 20, "unitPrice": 420, "totalPrice": 8400, "date": datetime(2025, 3, 26)},
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
                    {"school": "ruhanga", "date": datetime(2025, 3, 3), "starch": 547, "veg": 313, "total": 860, "starchPortion": 283.3, "vegPortion": 133.3, "beneficiaries": 1608},
                    {"school": "kagugu", "date": datetime(2025, 3, 3), "starch": 1778, "veg": 1045, "total": 2823, "starchPortion": 325, "vegPortion": 150, "beneficiaries": 5887},
                    # March 4
                    {"school": "ruhanga", "date": datetime(2025, 3, 4), "starch": 570, "veg": 303, "total": 873, "starchPortion": 283.3, "vegPortion": 133.3, "beneficiaries": 1608},
                    {"school": "kagugu", "date": datetime(2025, 3, 4), "starch": 1888, "veg": 1126, "total": 3014, "starchPortion": 325, "vegPortion": 150, "beneficiaries": 5887},
                    # March 5
                    {"school": "ruhanga", "date": datetime(2025, 3, 5), "starch": 1150, "veg": 450, "total": 1600, "starchPortion": 600, "vegPortion": 200, "beneficiaries": 1800},
                    {"school": "kagugu", "date": datetime(2025, 3, 5), "starch": 3700, "veg": 1500, "total": 5200, "starchPortion": 600, "vegPortion": 200, "beneficiaries": 5695}
                ],
                10: [  # Week 2
                    # March 10
                    {"school": "ruhanga", "date": datetime(2025, 3, 10), "starch": 535, "veg": 315, "total": 850, "starchPortion": 283.3, "vegPortion": 133.3, "beneficiaries": 1608},
                    {"school": "kagugu", "date": datetime(2025, 3, 10), "starch": 1910, "veg": 1125, "total": 3035, "starchPortion": 325, "vegPortion": 150, "beneficiaries": 5887},
                    # March 11
                    {"school": "ruhanga", "date": datetime(2025, 3, 11), "starch": 570, "veg": 303, "total": 873, "starchPortion": 283.3, "vegPortion": 133.3, "beneficiaries": 1608},
                    {"school": "kagugu", "date": datetime(2025, 3, 11), "starch": 1888, "veg": 1126, "total": 3014, "starchPortion": 325, "vegPortion": 150, "beneficiaries": 5887},
                    # March 12
                    {"school": "ruhanga", "date": datetime(2025, 3, 12), "starch": 1200, "veg": 480, "total": 1680, "starchPortion": 600, "vegPortion": 200, "beneficiaries": 1800},
                    {"school": "kagugu", "date": datetime(2025, 3, 12), "starch": 3700, "veg": 1500, "total": 5200, "starchPortion": 600, "vegPortion": 200, "beneficiaries": 5695}
                ],
                11: [  # Week 3
                    # March 17
                    {"school": "ruhanga", "date": datetime(2025, 3, 17), "starch": 535, "veg": 315, "total": 850, "starchPortion": 283.3, "vegPortion": 133.3, "beneficiaries": 1608},
                    {"school": "kagugu", "date": datetime(2025, 3, 17), "starch": 1910, "veg": 1125, "total": 3035, "starchPortion": 325, "vegPortion": 150, "beneficiaries": 5887},
                    # March 18
                    {"school": "ruhanga", "date": datetime(2025, 3, 18), "starch": 560, "veg": 313, "total": 873, "starchPortion": 283.3, "vegPortion": 133.3, "beneficiaries": 1608},
                    {"school": "kagugu", "date": datetime(2025, 3, 18), "starch": 1855, "veg": 1141, "total": 2996, "starchPortion": 325, "vegPortion": 150, "beneficiaries": 5887},
                    # March 19
                    {"school": "ruhanga", "date": datetime(2025, 3, 19), "starch": 1200, "veg": 480, "total": 1680, "starchPortion": 600, "vegPortion": 200, "beneficiaries": 1800},
                    {"school": "kagugu", "date": datetime(2025, 3, 19), "starch": 3700, "veg": 1500, "total": 5200, "starchPortion": 600, "vegPortion": 200, "beneficiaries": 5695}
                ],
                12: [  # Week 4
                    # March 24
                    {"school": "ruhanga", "date": datetime(2025, 3, 24), "starch": 535, "veg": 315, "total": 850, "starchPortion": 283.3, "vegPortion": 133.3, "beneficiaries": 1608},
                    {"school": "kagugu", "date": datetime(2025, 3, 24), "starch": 1910, "veg": 1125, "total": 3035, "starchPortion": 325, "vegPortion": 150, "beneficiaries": 5887},
                    # March 25
                    {"school": "ruhanga", "date": datetime(2025, 3, 25), "starch": 560, "veg": 313, "total": 873, "starchPortion": 283.3, "vegPortion": 133.3, "beneficiaries": 1608},
                    {"school": "kagugu", "date": datetime(2025, 3, 25), "starch": 1855, "veg": 1141, "total": 2996, "starchPortion": 325, "vegPortion": 150, "beneficiaries": 5887},
                    # March 26
                    {"school": "ruhanga", "date": datetime(2025, 3, 26), "starch": 1200, "veg": 480, "total": 1680, "starchPortion": 600, "vegPortion": 200, "beneficiaries": 1800},
                    {"school": "kagugu", "date": datetime(2025, 3, 26), "starch": 3700, "veg": 1500, "total": 5200, "starchPortion": 600, "vegPortion": 200, "beneficiaries": 5695}
                ]
            }
            
            # Process productions for each week
            total_productions = 0
            for week_num, productions in week_productions.items():
                # Skip production data for now as the model has changed
                print(f"\n🍽️ Skipping productions for Week {week_num} due to model changes...")
            
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
            print(f"  - Total meals served: 149,900")
            print(f"  - Total ingredient cost: RWF 26,570,465")
            print(f"  - Total indirect costs: RWF 31,584,430")
            
        except Exception as e:
            print(f"❌ Error seeding March 2025 data: {e}")
            session.rollback()
            raise

if __name__ == "__main__":
    asyncio.run(seed_march_2025_data())