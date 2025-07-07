from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from datetime import datetime
from app.database import get_session
from app.models import Ingredient, IngredientCreate, IngredientUpdate, IngredientRead, User, UserRole
from app.auth import get_current_active_user, require_role

router = APIRouter()

@router.get("/", response_model=List[IngredientRead])
async def get_ingredients(
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    statement = select(Ingredient).order_by(Ingredient.name)
    ingredients = session.exec(statement).all()
    return ingredients

@router.get("/{ingredient_id}", response_model=IngredientRead)
async def get_ingredient(
    ingredient_id: str,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    ingredient = session.get(Ingredient, ingredient_id)
    if not ingredient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ingredient not found"
        )
    return ingredient

@router.post("/", response_model=IngredientRead)
async def create_ingredient(
    ingredient_data: IngredientCreate,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.DATA_ENTRY])),
    session: Session = Depends(get_session)
):
    ingredient = Ingredient(**ingredient_data.dict())
    session.add(ingredient)
    session.commit()
    session.refresh(ingredient)
    return ingredient

@router.put("/{ingredient_id}", response_model=IngredientRead)
async def update_ingredient(
    ingredient_id: str,
    ingredient_update: IngredientUpdate,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.DATA_ENTRY])),
    session: Session = Depends(get_session)
):
    ingredient = session.get(Ingredient, ingredient_id)
    if not ingredient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ingredient not found"
        )
    
    update_data = ingredient_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(ingredient, field, value)
    
    ingredient.updatedAt = datetime.utcnow()
    session.add(ingredient)
    session.commit()
    session.refresh(ingredient)
    return ingredient

@router.delete("/{ingredient_id}")
async def delete_ingredient(
    ingredient_id: str,
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    session: Session = Depends(get_session)
):
    ingredient = session.get(Ingredient, ingredient_id)
    if not ingredient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ingredient not found"
        )
    
    # Check if ingredient has purchases
    if ingredient.purchases:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete ingredient with existing purchase data"
        )
    
    session.delete(ingredient)
    session.commit()
    return {"message": "Ingredient deleted successfully"}