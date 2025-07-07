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

# School Models
class SchoolBase(SQLModel):
    name: str
    location: str
    students: int = 0
    contact: Optional[str] = None
    active: bool = True

class School(SchoolBase, table=True):
    __tablename__ = "schools"
    
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    productions: List["Production"] = Relationship(back_populates="school")

class SchoolCreate(SchoolBase):
    pass

class SchoolUpdate(SQLModel):
    name: Optional[str] = None
    location: Optional[str] = None
    students: Optional[int] = None
    contact: Optional[str] = None
    active: Optional[bool] = None

class SchoolRead(SchoolBase):
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

# Week Models (moved before Purchase to avoid forward reference issues)
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

# Purchase Models
class PurchaseBase(SQLModel):
    weekId: str = Field(foreign_key="weeks.id")
    ingredientId: str = Field(foreign_key="ingredients.id")
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
    quantity: Optional[float] = None
    unitPrice: Optional[float] = None
    totalPrice: Optional[float] = None

class PurchaseRead(PurchaseBase):
    id: str
    createdBy: str
    createdAt: datetime
    updatedAt: datetime
    ingredient: Optional[IngredientRead] = None

# Production Models
class ProductionBase(SQLModel):
    weekId: str = Field(foreign_key="weeks.id")
    schoolId: str = Field(foreign_key="schools.id")
    productionDate: datetime
    starchKg: float
    vegetablesKg: float
    totalKg: float
    starchPortionPerKg: float
    vegPortionPerKg: float
    beneficiaries: int
    mealsCalculated: int = 0

class Production(ProductionBase, table=True):
    __tablename__ = "productions"
    
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    createdBy: str = Field(foreign_key="users.id")
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    school: Optional[School] = Relationship(back_populates="productions")
    user: Optional[User] = Relationship(back_populates="productions")
    week: Optional[Week] = Relationship(back_populates="productions")

class ProductionCreate(ProductionBase):
    pass

class ProductionUpdate(SQLModel):
    starchKg: Optional[float] = None
    vegetablesKg: Optional[float] = None
    totalKg: Optional[float] = None
    starchPortionPerKg: Optional[float] = None
    vegPortionPerKg: Optional[float] = None
    beneficiaries: Optional[int] = None
    mealsCalculated: Optional[int] = None

class ProductionRead(ProductionBase):
    id: str
    createdBy: str
    createdAt: datetime
    updatedAt: datetime
    school: Optional[SchoolRead] = None

# Indirect Cost Models
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

# Monthly Summary Models
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

# Auth Models
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