from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from datetime import datetime
from app.database import get_session
from app.models import User, UserCreate, UserUpdate, UserRead, UserRole
from app.auth import get_current_active_user, require_role, get_password_hash

router = APIRouter()

@router.get("/", response_model=List[UserRead])
async def get_users(
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    session: Session = Depends(get_session)
):
    statement = select(User)
    users = session.exec(statement).all()
    return users

@router.get("/me", response_model=UserRead)
async def get_current_user_profile(current_user: User = Depends(get_current_active_user)):
    return current_user

@router.put("/me", response_model=UserRead)
async def update_current_user_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    update_data = user_update.dict(exclude_unset=True)
    # Remove role from update if user is not admin
    if current_user.role != UserRole.ADMIN and "role" in update_data:
        del update_data["role"]
    
    for field, value in update_data.items():
        setattr(current_user, field, value)
    
    current_user.updatedAt = datetime.utcnow()
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    return current_user

@router.post("/", response_model=UserRead)
async def create_user(
    user_data: UserCreate,
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    session: Session = Depends(get_session)
):
    # Check if user already exists
    statement = select(User).where(User.email == user_data.email)
    existing_user = session.exec(statement).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Hash password
    hashed_password = get_password_hash(user_data.password)
    
    # Create user
    user = User(
        email=user_data.email,
        password=hashed_password,
        firstName=user_data.firstName,
        lastName=user_data.lastName,
        role=user_data.role,
        isActive=user_data.isActive
    )
    
    session.add(user)
    session.commit()
    session.refresh(user)
    return user

@router.put("/{user_id}", response_model=UserRead)
async def update_user(
    user_id: str,
    user_update: UserUpdate,
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    session: Session = Depends(get_session)
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    update_data = user_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    
    user.updatedAt = datetime.utcnow()
    session.add(user)
    session.commit()
    session.refresh(user)
    return user

@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    session: Session = Depends(get_session)
):
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    session.delete(user)
    session.commit()
    return {"message": "User deleted successfully"}