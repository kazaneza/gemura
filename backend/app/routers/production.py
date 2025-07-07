from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select
from datetime import datetime, timedelta
from app.database import get_session
from app.models import Production, ProductionCreate, ProductionUpdate, ProductionRead, User, UserRole, School, Week
from app.auth import get_current_active_user, require_role

router = APIRouter()

@router.get("/", response_model=List[ProductionRead])
async def get_productions(
    week_id: Optional[str] = Query(None),
    school_id: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    statement = select(Production)
    
    if week_id:
        statement = statement.where(Production.weekId == week_id)
    if school_id:
        statement = statement.where(Production.schoolId == school_id)
    if start_date and end_date:
        statement = statement.where(
            Production.productionDate >= start_date,
            Production.productionDate <= end_date
        )
    
    statement = statement.order_by(Production.productionDate.desc())
    productions = session.exec(statement).all()
    return productions

@router.get("/{production_id}", response_model=ProductionRead)
async def get_production(
    production_id: str,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    production = session.get(Production, production_id)
    if not production:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Production not found"
        )
    return production

@router.post("/", response_model=ProductionRead)
async def create_production(
    production_data: ProductionCreate,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.DATA_ENTRY])),
    session: Session = Depends(get_session)
):
    # Verify school exists
    school = session.get(School, production_data.schoolId)
    if not school:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="School not found"
        )
    
    # Create or get week record based on production date
    production_date = production_data.productionDate
    week_number = production_date.isocalendar()[1]
    year = production_date.year
    month = production_date.month
    
    # Try to find existing week
    week_statement = select(Week).where(
        Week.year == year,
        Week.weekNumber == week_number
    )
    week = session.exec(week_statement).first()
    
    if not week:
        # Create new week automatically
        week_start = production_date - timedelta(days=production_date.weekday())
        week_end = week_start + timedelta(days=6)
        
        week = Week(
            month=month,
            year=year,
            weekNumber=week_number,
            startDate=week_start,
            endDate=week_end
        )
        session.add(week)
        session.commit()
        session.refresh(week)
        print(f"✅ Auto-created week {year}-W{week_number} for production on {production_date.date()}")
    
    # Create production
    production = Production(
        weekId=week.id,
        schoolId=production_data.schoolId,
        productionDate=production_data.productionDate,
        starchKg=production_data.starchKg,
        vegetablesKg=production_data.vegetablesKg,
        totalKg=production_data.totalKg,
        starchPortionPerKg=production_data.starchPortionPerKg,
        vegPortionPerKg=production_data.vegPortionPerKg,
        beneficiaries=production_data.beneficiaries,
        mealsCalculated=production_data.mealsCalculated,
        createdBy=current_user.id
    )
    
    session.add(production)
    session.commit()
    session.refresh(production)
    
    print(f"✅ Created production: {production_data.mealsCalculated} meals for {school.name} on {production_date.date()}")
    
    return production

@router.put("/{production_id}", response_model=ProductionRead)
async def update_production(
    production_id: str,
    production_update: ProductionUpdate,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.DATA_ENTRY])),
    session: Session = Depends(get_session)
):
    production = session.get(Production, production_id)
    if not production:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Production not found"
        )
    
    # Check if user can edit (only creator or admin)
    if current_user.role != UserRole.ADMIN and production.createdBy != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to edit this production"
        )
    
    update_data = production_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(production, field, value)
    
    production.updatedAt = datetime.utcnow()
    session.add(production)
    session.commit()
    session.refresh(production)
    return production

@router.delete("/{production_id}")
async def delete_production(
    production_id: str,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.DATA_ENTRY])),
    session: Session = Depends(get_session)
):
    production = session.get(Production, production_id)
    if not production:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Production not found"
        )
    
    # Check if user can delete (only creator or admin)
    if current_user.role != UserRole.ADMIN and production.createdBy != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this production"
        )
    
    session.delete(production)
    session.commit()
    return {"message": "Production deleted successfully"}