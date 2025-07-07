from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select
from datetime import datetime
from app.database import get_session
from app.models import Week, WeekCreate, WeekUpdate, WeekRead, User, UserRole
from app.auth import get_current_active_user, require_role

router = APIRouter()

@router.get("/", response_model=List[WeekRead])
async def get_weeks(
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    statement = select(Week)
    
    if year:
        statement = statement.where(Week.year == year)
    if month:
        statement = statement.where(Week.month == month)
    
    statement = statement.order_by(Week.startDate.desc())
    weeks = session.exec(statement).all()
    return weeks

@router.get("/{week_id}", response_model=WeekRead)
async def get_week(
    week_id: str,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    week = session.get(Week, week_id)
    if not week:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Week not found"
        )
    return week

@router.post("/", response_model=WeekRead)
async def create_week(
    week_data: WeekCreate,
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    session: Session = Depends(get_session)
):
    # Check if week already exists
    existing_week_statement = select(Week).where(
        Week.year == week_data.year,
        Week.weekNumber == week_data.weekNumber
    )
    existing_week = session.exec(existing_week_statement).first()
    
    if existing_week:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Week already exists"
        )
    
    week = Week(**week_data.dict())
    session.add(week)
    session.commit()
    session.refresh(week)
    return week

@router.put("/{week_id}", response_model=WeekRead)
async def update_week(
    week_id: str,
    week_update: WeekUpdate,
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    session: Session = Depends(get_session)
):
    week = session.get(Week, week_id)
    if not week:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Week not found"
        )
    
    update_data = week_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(week, field, value)
    
    week.updatedAt = datetime.utcnow()
    session.add(week)
    session.commit()
    session.refresh(week)
    return week

@router.delete("/{week_id}")
async def delete_week(
    week_id: str,
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    session: Session = Depends(get_session)
):
    week = session.get(Week, week_id)
    if not week:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Week not found"
        )
    
    # Check if week has data
    if week.purchases or week.productions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete week with existing data"
        )
    
    session.delete(week)
    session.commit()
    return {"message": "Week deleted successfully"}