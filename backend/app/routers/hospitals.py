from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from datetime import datetime
from app.database import get_session
from app.models import Hospital, HospitalCreate, HospitalUpdate, HospitalRead, User, UserRole
from app.auth import get_current_active_user, require_role

router = APIRouter()

@router.get("/", response_model=List[HospitalRead])
async def get_hospitals(
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    statement = select(Hospital).order_by(Hospital.name)
    hospitals = session.exec(statement).all()
    return hospitals

@router.get("/{hospital_id}", response_model=HospitalRead)
async def get_hospital(
    hospital_id: str,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    hospital = session.get(Hospital, hospital_id)
    if not hospital:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hospital not found"
        )
    return hospital

@router.post("/", response_model=HospitalRead)
async def create_hospital(
    hospital_data: HospitalCreate,
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    session: Session = Depends(get_session)
):
    hospital = Hospital(**hospital_data.dict())
    session.add(hospital)
    session.commit()
    session.refresh(hospital)
    return hospital

@router.put("/{hospital_id}", response_model=HospitalRead)
async def update_hospital(
    hospital_id: str,
    hospital_update: HospitalUpdate,
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    session: Session = Depends(get_session)
):
    hospital = session.get(Hospital, hospital_id)
    if not hospital:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hospital not found"
        )
    
    update_data = hospital_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(hospital, field, value)
    
    hospital.updatedAt = datetime.utcnow()
    session.add(hospital)
    session.commit()
    session.refresh(hospital)
    return hospital

@router.delete("/{hospital_id}")
async def delete_hospital(
    hospital_id: str,
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    session: Session = Depends(get_session)
):
    hospital = session.get(Hospital, hospital_id)
    if not hospital:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hospital not found"
        )
    
    # Check if hospital has productions
    if hospital.productions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete hospital with existing production data"
        )
    
    session.delete(hospital)
    session.commit()
    return {"message": "Hospital deleted successfully"}