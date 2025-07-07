from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy.pool import StaticPool
import os

# Database URL - using SQLite for development
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./kitchen_manager.db")

# Create engine
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
    poolclass=StaticPool if "sqlite" in DATABASE_URL else None,
    echo=True  # Set to False in production
)

def create_db_and_tables():
    """Create database tables"""
    SQLModel.metadata.create_all(engine)
    print("✅ Database tables created")

def get_session():
    """Get database session"""
    with Session(engine) as session:
        yield session

# For backwards compatibility
def get_db():
    """Alias for get_session"""
    return next(get_session())

async def connect_db():
    """Initialize database"""
    create_db_and_tables()
    print("✅ Database connected")

async def disconnect_db():
    """Cleanup database connections"""
    print("✅ Database disconnected")