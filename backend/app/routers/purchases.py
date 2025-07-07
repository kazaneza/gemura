from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select
from datetime import datetime, timedelta
from app.database import get_session
from app.models import Purchase, PurchaseCreate, PurchaseUpdate, PurchaseRead, User, UserRole, Ingredient, Week, MealService
from app.auth import get_current_active_user, require_role

router = APIRouter()

@router.get("/", response_model=List[PurchaseRead])
async def get_purchases(
    week_id: Optional[str] = Query(None),
    service: Optional[MealService] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    statement = select(Purchase)
    
    if week_id:
        statement = statement.where(Purchase.weekId == week_id)
    if service:
        statement = statement.where(Purchase.service == service)
    if start_date and end_date:
        statement = statement.where(
            Purchase.purchaseDate >= start_date,
            Purchase.purchaseDate <= end_date
        )
    
    statement = statement.order_by(Purchase.purchaseDate.desc())
    purchases = session.exec(statement).all()
    return purchases

@router.get("/{purchase_id}", response_model=PurchaseRead)
async def get_purchase(
    purchase_id: str,
    current_user: User = Depends(get_current_active_user),
    session: Session = Depends(get_session)
):
    purchase = session.get(Purchase, purchase_id)
    if not purchase:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase not found"
        )
    return purchase

@router.post("/", response_model=PurchaseRead)
async def create_purchase(
    purchase_data: PurchaseCreate,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.DATA_ENTRY])),
    session: Session = Depends(get_session)
):
    # Verify ingredient exists
    ingredient = session.get(Ingredient, purchase_data.ingredientId)
    if not ingredient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ingredient not found"
        )
    
    # Create or get week record based on purchase date
    purchase_date = purchase_data.purchaseDate
    week_number = purchase_date.isocalendar()[1]
    year = purchase_date.year
    month = purchase_date.month
    
    # Try to find existing week
    week_statement = select(Week).where(
        Week.year == year,
        Week.weekNumber == week_number
    )
    week = session.exec(week_statement).first()
    
    if not week:
        # Create new week automatically
        week_start = purchase_date - timedelta(days=purchase_date.weekday())
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
        print(f"✅ Auto-created week {year}-W{week_number} for purchase on {purchase_date.date()}")
    
    # Create purchase
    purchase = Purchase(
        weekId=week.id,
        ingredientId=purchase_data.ingredientId,
        service=purchase_data.service,
        purchaseDate=purchase_data.purchaseDate,
        quantity=purchase_data.quantity,
        unitPrice=purchase_data.unitPrice,
        totalPrice=purchase_data.totalPrice,
        createdBy=current_user.id
    )
    
    session.add(purchase)
    session.commit()
    session.refresh(purchase)
    
    # Update ingredient last price
    ingredient.lastPrice = purchase_data.unitPrice
    ingredient.updatedAt = datetime.utcnow()
    session.add(ingredient)
    session.commit()
    
    print(f"✅ Created purchase: {purchase_data.quantity} {ingredient.unit} of {ingredient.name} for {purchase_data.service.value} on {purchase_date.date()}")
    
    return purchase

@router.put("/{purchase_id}", response_model=PurchaseRead)
async def update_purchase(
    purchase_id: str,
    purchase_update: PurchaseUpdate,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.DATA_ENTRY])),
    session: Session = Depends(get_session)
):
    purchase = session.get(Purchase, purchase_id)
    if not purchase:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase not found"
        )
    
    # Check if user can edit (only creator or admin)
    if current_user.role != UserRole.ADMIN and purchase.createdBy != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to edit this purchase"
        )
    
    update_data = purchase_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(purchase, field, value)
    
    purchase.updatedAt = datetime.utcnow()
    session.add(purchase)
    session.commit()
    session.refresh(purchase)
    return purchase

@router.delete("/{purchase_id}")
async def delete_purchase(
    purchase_id: str,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.DATA_ENTRY])),
    session: Session = Depends(get_session)
):
    purchase = session.get(Purchase, purchase_id)
    if not purchase:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase not found"
        )
    
    # Check if user can delete (only creator or admin)
    if current_user.role != UserRole.ADMIN and purchase.createdBy != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this purchase"
        )
    
    session.delete(purchase)
    session.commit()
    return {"message": "Purchase deleted successfully"}