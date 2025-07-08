from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime
from enum import Enum
import uuid

# Enums
class UserRole(str, Enum):
    ADMIN = "ADMIN"
    DATA_ENTRY = "DATA_ENTRY"
    VIEWER = "VIEWER"

class IngredientUnit(str, Enum):
    KG = "KG"
    LTR = "LTR"
    PCS = "PCS"

class WeekStatus(str, Enum):
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    LOCKED = "LOCKED"

class MealService(str, Enum):
    BREAKFAST = "BREAKFAST"
    LUNCH = "LUNCH"
    DINNER = "DINNER"

# Base Models
class UserBase(SQLModel):
    email: str = Field(unique=True, index=True)
    firstName: str
    lastName: str
    role: UserRole = UserRole.VIEWER
    isActive: bool = True

class User(UserBase, table=True):
    __tablename__ = "users"
    
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    password: str
    lastLogin: Optional[datetime] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    purchases: List["Purchase"] = Relationship(back_populates="user")
    productions: List["Production"] = Relationship(back_populates="user")
    indirectCosts: List["IndirectCost"] = Relationship(back_populates="user")

class UserCreate(UserBase):
    password: str

class UserUpdate(SQLModel):
    email: Optional[str] = None
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    role: Optional[UserRole] = None
    isActive: Optional[bool] = None

class UserRead(UserBase):
    id: str
    lastLogin: Optional[datetime] = None
    createdAt: datetime
    updatedAt: datetime

# Hospital Models (renamed from School)
class HospitalBase(SQLModel):
    name: str
    location: str
    patientCapacity: int = 0  # Maximum number of patients the hospital can serve
    contact: Optional[str] = None
    active: bool = True

class Hospital(HospitalBase, table=True):
    __tablename__ = "hospitals"
    
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    productions: List["Production"] = Relationship(back_populates="hospital")

class HospitalCreate(HospitalBase):
    pass

class HospitalUpdate(SQLModel):
    name: Optional[str] = None
    location: Optional[str] = None
    patientCapacity: Optional[int] = None
    contact: Optional[str] = None
    active: Optional[bool] = None

class HospitalRead(HospitalBase):
    id: str
    createdAt: datetime
    updatedAt: datetime

# Ingredient Models
class IngredientBase(SQLModel):
    name: str
    unit: IngredientUnit
    lastPrice: float = 0

class Ingredient(IngredientBase, table=True):
    __tablename__ = "ingredients"
    
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    purchases: List["Purchase"] = Relationship(back_populates="ingredient")

class IngredientCreate(IngredientBase):
    pass

class IngredientUpdate(SQLModel):
    name: Optional[str] = None
    unit: Optional[IngredientUnit] = None
    lastPrice: Optional[float] = None

class IngredientRead(IngredientBase):
    id: str
    createdAt: datetime
    updatedAt: datetime

# Week Models
class WeekBase(SQLModel):
    month: int
    year: int
    weekNumber: int
    startDate: datetime
    endDate: datetime
    mealsServed: int = 0
    ingredientCost: float = 0
    costPerMeal: float = 0
    overheadPerMeal: float = 0
    totalCPM: float = 0
    status: WeekStatus = WeekStatus.ACTIVE

class Week(WeekBase, table=True):
    __tablename__ = "weeks"
    
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    purchases: List["Purchase"] = Relationship(back_populates="week")
    productions: List["Production"] = Relationship(back_populates="week")

class WeekCreate(WeekBase):
    pass

class WeekUpdate(SQLModel):
    mealsServed: Optional[int] = None
    ingredientCost: Optional[float] = None
    costPerMeal: Optional[float] = None
    overheadPerMeal: Optional[float] = None
    totalCPM: Optional[float] = None
    status: Optional[WeekStatus] = None

class WeekRead(WeekBase):
    id: str
    createdAt: datetime
    updatedAt: datetime

# Purchase Models (now service-based)
class PurchaseBase(SQLModel):
    weekId: str = Field(foreign_key="weeks.id")
    ingredientId: str = Field(foreign_key="ingredients.id")
    service: MealService  # NEW: breakfast, lunch, or dinner
    purchaseDate: datetime
    quantity: float
    unitPrice: float
    totalPrice: float

class Purchase(PurchaseBase, table=True):
    __tablename__ = "purchases"
    
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    createdBy: str = Field(foreign_key="users.id")
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    ingredient: Optional[Ingredient] = Relationship(back_populates="purchases")
    user: Optional[User] = Relationship(back_populates="purchases")
    week: Optional[Week] = Relationship(back_populates="purchases")

class PurchaseCreate(PurchaseBase):
    pass

class PurchaseUpdate(SQLModel):
    service: Optional[MealService] = None
    quantity: Optional[float] = None
    unitPrice: Optional[float] = None
    totalPrice: Optional[float] = None

class PurchaseRead(PurchaseBase):
    id: str
    createdBy: str
    createdAt: datetime
    updatedAt: datetime
    ingredient: Optional[IngredientRead] = None

# Production Models (now hospital and service-based)
class ProductionBase(SQLModel):
    weekId: str = Field(foreign_key="weeks.id")
    hospitalId: str = Field(foreign_key="hospitals.id")  # Changed from schoolId
    service: MealService  # NEW: breakfast, lunch, or dinner
    productionDate: datetime
    patientsServed: int  # Changed from beneficiaries to patientsServed
    # Removed starch/vegetable tracking as it's now consolidated at service level

class Production(ProductionBase, table=True):
    __tablename__ = "productions"
    
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    createdBy: str = Field(foreign_key="users.id")
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    hospital: Optional[Hospital] = Relationship(back_populates="productions")
    user: Optional[User] = Relationship(back_populates="productions")
    week: Optional[Week] = Relationship(back_populates="productions")

class ProductionCreate(ProductionBase):
    pass

class ProductionUpdate(SQLModel):
    service: Optional[MealService] = None
    patientsServed: Optional[int] = None

class ProductionRead(ProductionBase):
    id: str
    createdBy: str
    createdAt: datetime
    updatedAt: datetime
    hospital: Optional[HospitalRead] = None

# Indirect Cost Models (unchanged)
class IndirectCostBase(SQLModel):
    month: int
    year: int
    category: str
    description: str
    amount: float
    code: Optional[str] = None

class IndirectCost(IndirectCostBase, table=True):
    __tablename__ = "indirect_costs"
    
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    createdBy: str = Field(foreign_key="users.id")
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    user: Optional[User] = Relationship(back_populates="indirectCosts")

class IndirectCostCreate(IndirectCostBase):
    pass

class IndirectCostUpdate(SQLModel):
    category: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    code: Optional[str] = None

class IndirectCostRead(IndirectCostBase):
    id: str
    createdBy: str
    createdAt: datetime
    updatedAt: datetime

# Monthly Summary Models (unchanged)
class MonthlySummaryBase(SQLModel):
    month: int
    year: int
    totalIndirectCosts: float = 0
    totalMealsProduced: int = 0
    overheadPerMeal: float = 0
    averageCPM: float = 0

class MonthlySummary(MonthlySummaryBase, table=True):
    __tablename__ = "monthly_summaries"
    
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

class MonthlySummaryCreate(MonthlySummaryBase):
    pass

class MonthlySummaryUpdate(SQLModel):
    totalIndirectCosts: Optional[float] = None
    totalMealsProduced: Optional[int] = None
    overheadPerMeal: Optional[float] = None
    averageCPM: Optional[float] = None

class MonthlySummaryRead(MonthlySummaryBase):
    id: str
    createdAt: datetime
    updatedAt: datetime

# Auth Models (unchanged)
class Token(SQLModel):
    access_token: str
    token_type: str

class TokenData(SQLModel):
    email: Optional[str] = None

class LoginRequest(SQLModel):
    email: str
    password: str

# Report Models
class IndirectCostDetail(SQLModel):
    code: str
    category: str
    description: str
    amount: float
    percentage: float

class IndirectCostBreakdown(SQLModel):
    totalAmount: float
    totalMeals: int
    costPerMeal: float
    details: List[IndirectCostDetail]

# Service Summary Models (NEW)
class ServiceSummary(SQLModel):
    service: MealService
    totalIngredientCost: float
    totalPatientsServed: int
    costPerMeal: float
    overheadPerMeal: float
    totalCPM: float