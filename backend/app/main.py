from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.routers import auth, users, hospitals, ingredients, purchases, production, weeks, indirect_costs, reports
from app.database import connect_db, disconnect_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_db()
    yield
    # Shutdown
    await disconnect_db()

app = FastAPI(
    title="Hospital Kitchen Manager API",
    description="API for Hospital Kitchen Management System",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware - Allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://102.37.150.125:5173",
        "http://localhost:5173", 
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(hospitals.router, prefix="/api/hospitals", tags=["Hospitals"])
app.include_router(ingredients.router, prefix="/api/ingredients", tags=["Ingredients"])
app.include_router(purchases.router, prefix="/api/purchases", tags=["Purchases"])
app.include_router(production.router, prefix="/api/production", tags=["Production"])
app.include_router(weeks.router, prefix="/api/weeks", tags=["Weeks"])
app.include_router(indirect_costs.router, prefix="/api/indirect-costs", tags=["Indirect Costs"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])

@app.get("/")
async def root():
    return {"message": "Hospital Kitchen Manager API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}