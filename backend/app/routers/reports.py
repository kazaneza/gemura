from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from datetime import datetime, timedelta
from sqlmodel import Session, select, func
from app.database import get_session
from app.models import User, Production, Purchase, IndirectCost, School, Week
from app.auth import get_current_active_user

router = APIRouter()

@router.get("/dashboard")
async def get_dashboard_data(
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """Get dashboard data with real calculations"""
    
    # Get yesterday's date (since people report at night)
    today = datetime.now().date()
    yesterday = today - timedelta(days=1)
    
    # Get week start (Monday)
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)
    
    # Get month start
    month_start = today.replace(day=1)
    
    # Yesterday's meals served
    yesterday_productions = session.exec(
        select(Production).where(
            func.date(Production.productionDate) == yesterday
        )
    ).all()
    yesterday_meals = sum(p.mealsCalculated for p in yesterday_productions)
    
    # Week-to-date meals
    week_productions = session.exec(
        select(Production).where(
            func.date(Production.productionDate) >= week_start,
            func.date(Production.productionDate) <= week_end
        )
    ).all()
    week_meals = sum(p.mealsCalculated for p in week_productions)
    
    # Week purchases for CPM calculation
    week_purchases = session.exec(
        select(Purchase).where(
            func.date(Purchase.purchaseDate) >= week_start,
            func.date(Purchase.purchaseDate) <= week_end
        )
    ).all()
    week_ingredient_cost = sum(p.totalPrice for p in week_purchases)
    
    # Current week CPM (ingredients only for now)
    current_week_cpm = week_ingredient_cost / week_meals if week_meals > 0 else 0
    
    # Month-to-date calculations
    month_productions = session.exec(
        select(Production).where(
            func.date(Production.productionDate) >= month_start
        )
    ).all()
    month_meals = sum(p.mealsCalculated for p in month_productions)
    
    month_purchases = session.exec(
        select(Purchase).where(
            func.date(Purchase.purchaseDate) >= month_start
        )
    ).all()
    month_ingredient_cost = sum(p.totalPrice for p in month_purchases)
    
    # Get indirect costs for the month
    month_indirect_costs = session.exec(
        select(IndirectCost).where(
            IndirectCost.month == month_start.month,
            IndirectCost.year == month_start.year
        )
    ).all()
    month_indirect_total = sum(c.amount for c in month_indirect_costs)
    
    month_avg_cpm = (month_ingredient_cost + month_indirect_total) / month_meals if month_meals > 0 else 0
    
    # Yesterday's school contribution
    schools_contribution = []
    if yesterday_meals > 0:
        # Group yesterday's production by school
        school_meals = {}
        for production in yesterday_productions:
            school_id = production.schoolId
            if school_id not in school_meals:
                school_meals[school_id] = {
                    'meals': 0,
                    'school': None
                }
            school_meals[school_id]['meals'] += production.mealsCalculated
            
            # Get school info
            if not school_meals[school_id]['school']:
                school = session.get(School, school_id)
                school_meals[school_id]['school'] = school
        
        # Calculate percentages
        for school_data in school_meals.values():
            if school_data['school']:
                percentage = (school_data['meals'] / yesterday_meals) * 100
                schools_contribution.append({
                    'name': school_data['school'].name,
                    'meals': school_data['meals'],
                    'percentage': round(percentage, 1)
                })
        
        # Sort by meals descending
        schools_contribution.sort(key=lambda x: x['meals'], reverse=True)
    
    # 7-day trend
    seven_day_trend = []
    for i in range(7):
        date = today - timedelta(days=6-i)
        day_productions = session.exec(
            select(Production).where(
                func.date(Production.productionDate) == date
            )
        ).all()
        day_meals = sum(p.mealsCalculated for p in day_productions)
        
        seven_day_trend.append({
            'date': date.strftime('%a'),
            'meals': day_meals
        })
    
    # Monthly CPM trend (last 4 weeks + current)
    month_cpm_trend = []
    for i in range(5):
        week_start_trend = week_start - timedelta(weeks=4-i)
        week_end_trend = week_start_trend + timedelta(days=6)
        
        week_productions_trend = session.exec(
            select(Production).where(
                func.date(Production.productionDate) >= week_start_trend,
                func.date(Production.productionDate) <= week_end_trend
            )
        ).all()
        week_meals_trend = sum(p.mealsCalculated for p in week_productions_trend)
        
        week_purchases_trend = session.exec(
            select(Purchase).where(
                func.date(Purchase.purchaseDate) >= week_start_trend,
                func.date(Purchase.purchaseDate) <= week_end_trend
            )
        ).all()
        week_cost_trend = sum(p.totalPrice for p in week_purchases_trend)
        
        week_cpm = week_cost_trend / week_meals_trend if week_meals_trend > 0 else 0
        
        week_label = 'Current' if i == 4 else f'W{i+1}'
        month_cpm_trend.append({
            'week': week_label,
            'cpm': round(week_cpm)
        })
    
    return {
        "yesterdayMeals": yesterday_meals,
        "weekToDateMeals": week_meals,
        "currentWeekCPM": round(current_week_cpm),
        "monthToDateAvgCPM": round(month_avg_cpm),
        "schoolsContribution": schools_contribution,
        "sevenDayTrend": seven_day_trend,
        "monthCPMTrend": month_cpm_trend
    }

@router.get("/weekly")
async def get_weekly_report(
    year: int = Query(...),
    week_number: int = Query(...),
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    # Calculate week date range from year and week number
    jan_1 = datetime(year, 1, 1)
    week_start = jan_1 + timedelta(weeks=week_number-1) - timedelta(days=jan_1.weekday())
    week_end = week_start + timedelta(days=6)
    
    # Get week's purchases
    purchases = session.exec(
        select(Purchase).where(
            func.date(Purchase.purchaseDate) >= week_start.date(),
            func.date(Purchase.purchaseDate) <= week_end.date()
        )
    ).all()
    
    # Get week's productions
    productions = session.exec(
        select(Production).where(
            func.date(Production.productionDate) >= week_start.date(),
            func.date(Production.productionDate) <= week_end.date()
        )
    ).all()
    
    # Calculate daily breakdown
    daily_data = {}
    for production in productions:
        date_str = production.productionDate.date().isoformat()
        if date_str not in daily_data:
            daily_data[date_str] = {
                "date": date_str,
                "meals": 0,
                "cost": 0
            }
        daily_data[date_str]["meals"] += production.mealsCalculated
    
    for purchase in purchases:
        date_str = purchase.purchaseDate.date().isoformat()
        if date_str not in daily_data:
            daily_data[date_str] = {
                "date": date_str,
                "meals": 0,
                "cost": 0
            }
        daily_data[date_str]["cost"] += purchase.totalPrice
    
    # Create week object for compatibility
    week_obj = {
        "id": f"{year}-W{week_number}",
        "year": year,
        "weekNumber": week_number,
        "startDate": week_start.isoformat(),
        "endDate": week_end.isoformat()
    }
    
    return {
        "week": week_obj,
        "purchases": purchases,
        "productions": productions,
        "dailyData": list(daily_data.values())
    }

@router.get("/monthly")
async def get_monthly_report(
    year: int = Query(...),
    month: int = Query(...),
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    # Get month's weeks
    weeks = session.exec(
        select(Week).where(
            Week.year == year,
            Week.month == month
        ).order_by(Week.weekNumber)
    ).all()
    
    # Get month's indirect costs
    indirect_costs = session.exec(
        select(IndirectCost).where(
            IndirectCost.year == year,
            IndirectCost.month == month
        )
    ).all()
    
    return {
        "weeks": weeks,
        "indirectCosts": indirect_costs
    }

@router.get("/indirect-costs-breakdown")
async def get_indirect_costs_breakdown(
    year: int = Query(...),
    month: int = Query(...),
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """Get detailed breakdown of indirect costs for a specific month"""
    
    # Get all indirect costs for the month
    indirect_costs = session.exec(
        select(IndirectCost).where(
            IndirectCost.year == year,
            IndirectCost.month == month
        )
    ).all()
    
    # Get total meals for the month
    month_start = datetime(year, month, 1)
    if month == 12:
        month_end = datetime(year + 1, 1, 1) - timedelta(days=1)
    else:
        month_end = datetime(year, month + 1, 1) - timedelta(days=1)
    
    month_productions = session.exec(
        select(Production).where(
            Production.productionDate >= month_start,
            Production.productionDate <= month_end
        )
    ).all()
    
    total_meals = sum(p.mealsCalculated for p in month_productions)
    total_amount = sum(c.amount for c in indirect_costs)
    
    # Group costs by category and calculate percentages
    cost_groups = {}
    for cost in indirect_costs:
        key = f"{cost.code}_{cost.category}" if cost.code else cost.category
        if key not in cost_groups:
            cost_groups[key] = {
                "code": cost.code or "",
                "category": cost.category,
                "description": cost.description,
                "amount": 0
            }
        cost_groups[key]["amount"] += cost.amount
    
    # Create detailed breakdown
    details = []
    for group in cost_groups.values():
        percentage = (group["amount"] / total_amount * 100) if total_amount > 0 else 0
        details.append({
            "code": group["code"],
            "category": group["category"],
            "description": group["description"],
            "amount": group["amount"],
            "percentage": round(percentage, 1)
        })
    
    # Sort by amount (descending)
    details.sort(key=lambda x: x["amount"], reverse=True)
    
    cost_per_meal = total_amount / total_meals if total_meals > 0 else 0
    
    return {
        "totalAmount": total_amount,
        "totalMeals": total_meals,
        "costPerMeal": round(cost_per_meal, 2),
        "details": details
    }

@router.get("/cost-analysis")
async def get_cost_analysis(
    year: int = Query(...),
    month: int = Query(...),
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    """Get comprehensive cost analysis for a month"""
    
    # Get month date range
    month_start = datetime(year, month, 1)
    if month == 12:
        month_end = datetime(year + 1, 1, 1) - timedelta(days=1)
    else:
        month_end = datetime(year, month + 1, 1) - timedelta(days=1)
    
    # Get ingredient costs
    month_purchases = session.exec(
        select(Purchase).where(
            Purchase.purchaseDate >= month_start,
            Purchase.purchaseDate <= month_end
        )
    ).all()
    
    # Get production data
    month_productions = session.exec(
        select(Production).where(
            Production.productionDate >= month_start,
            Production.productionDate <= month_end
        )
    ).all()
    
    # Get indirect costs
    indirect_costs = session.exec(
        select(IndirectCost).where(
            IndirectCost.year == year,
            IndirectCost.month == month
        )
    ).all()
    
    # Calculate totals
    total_ingredient_cost = sum(p.totalPrice for p in month_purchases)
    total_indirect_cost = sum(c.amount for c in indirect_costs)
    total_meals = sum(p.mealsCalculated for p in month_productions)
    
    # Calculate cost per meal
    ingredient_cpm = total_ingredient_cost / total_meals if total_meals > 0 else 0
    indirect_cpm = total_indirect_cost / total_meals if total_meals > 0 else 0
    total_cpm = ingredient_cpm + indirect_cpm
    
    # Group by schools
    school_data = {}
    for production in month_productions:
        school_id = production.schoolId
        if school_id not in school_data:
            school = session.get(School, school_id)
            school_data[school_id] = {
                "name": school.name if school else "Unknown",
                "meals": 0
            }
        school_data[school_id]["meals"] += production.mealsCalculated
    
    # Convert to list and calculate percentages
    schools = []
    for school in school_data.values():
        percentage = (school["meals"] / total_meals * 100) if total_meals > 0 else 0
        schools.append({
            "name": school["name"],
            "meals": school["meals"],
            "percentage": round(percentage, 1)
        })
    
    schools.sort(key=lambda x: x["meals"], reverse=True)
    
    return {
        "totalIngredientCost": total_ingredient_cost,
        "totalIndirectCost": total_indirect_cost,
        "totalMeals": total_meals,
        "ingredientCPM": round(ingredient_cpm, 2),
        "indirectCPM": round(indirect_cpm, 2),
        "totalCPM": round(total_cpm, 2),
        "schools": schools,
        "purchases": month_purchases,
        "productions": month_productions,
        "indirectCosts": indirect_costs
    }