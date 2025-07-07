from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from datetime import datetime
from app.database import get_session
from app.models import School, SchoolCreate, SchoolUpdate, SchoolRead, User, UserRole
from app.auth import get_current_active_user, require_role

router = APIRouter()

@router.get("/", response_model=List[SchoolRead])
async def get_schools(
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    statement = select(School).order_by(School.name)
    schools = session.exec(statement).all()
    return schools

@router.get("/{school_id}", response_model=SchoolRead)
async def get_school(
    school_id: str,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    school = session.get(School, school_id)
    if not school:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="School not found"
        )
    return school

@router.post("/", response_model=SchoolRead)
async def create_school(
    school_data: SchoolCreate,
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    session: Session = Depends(get_session)
):
    school = School(**school_data.dict())
    session.add(school)
    session.commit()
    session.refresh(school)
    return school

@router.put("/{school_id}", response_model=SchoolRead)
async def update_school(
    school_id: str,
    school_update: SchoolUpdate,
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    session: Session = Depends(get_session)
):
    school = session.get(School, school_id)
    if not school:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="School not found"
        )
    
    update_data = school_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(school, field, value)
    
    school.updatedAt = datetime.utcnow()
    session.add(school)
    session.commit()
    session.refresh(school)
    return school

@router.delete("/{school_id}")
async def delete_school(
    school_id: str,
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    session: Session = Depends(get_session)
):
    school = session.get(School, school_id)
    if not school:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="School not found"
        )
    
    # Check if school has productions
    if school.productions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete school with existing production data"
        )
    
    session.delete(school)
    session.commit()
    return {"message": "School deleted successfully"}