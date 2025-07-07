from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select
from datetime import datetime
from app.database import get_session
from app.models import IndirectCost, IndirectCostCreate, IndirectCostUpdate, IndirectCostRead, User, UserRole
from app.auth import get_current_active_user, require_role

router = APIRouter()

@router.get("/", response_model=List[IndirectCostRead])
async def get_indirect_costs(
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    statement = select(IndirectCost)
    
    if year:
        statement = statement.where(IndirectCost.year == year)
    if month:
        statement = statement.where(IndirectCost.month == month)
    
    statement = statement.order_by(IndirectCost.createdAt.desc())
    costs = session.exec(statement).all()
    return costs

@router.get("/{cost_id}", response_model=IndirectCostRead)
async def get_indirect_cost(
    cost_id: str,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    cost = session.get(IndirectCost, cost_id)
    if not cost:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Indirect cost not found"
        )
    return cost

@router.post("/", response_model=IndirectCostRead)
async def create_indirect_cost(
    cost_data: IndirectCostCreate,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.DATA_ENTRY])),
    session: Session = Depends(get_session)
):
    cost = IndirectCost(
        **cost_data.dict(),
        createdBy=current_user.id
    )
    session.add(cost)
    session.commit()
    session.refresh(cost)
    return cost

@router.put("/{cost_id}", response_model=IndirectCostRead)
async def update_indirect_cost(
    cost_id: str,
    cost_update: IndirectCostUpdate,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.DATA_ENTRY])),
    session: Session = Depends(get_session)
):
    cost = session.get(IndirectCost, cost_id)
    if not cost:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Indirect cost not found"
        )
    
    # Check if user can edit (only creator or admin)
    if current_user.role != UserRole.ADMIN and cost.createdBy != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to edit this indirect cost"
        )
    
    update_data = cost_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(cost, field, value)
    
    cost.updatedAt = datetime.utcnow()
    session.add(cost)
    session.commit()
    session.refresh(cost)
    return cost

@router.delete("/{cost_id}")
async def delete_indirect_cost(
    cost_id: str,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.DATA_ENTRY])),
    session: Session = Depends(get_session)
):
    cost = session.get(IndirectCost, cost_id)
    if not cost:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Indirect cost not found"
        )
    
    # Check if user can delete (only creator or admin)
    if current_user.role != UserRole.ADMIN and cost.createdBy != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this indirect cost"
        )
    
    session.delete(cost)
    session.commit()
    return {"message": "Indirect cost deleted successfully"}