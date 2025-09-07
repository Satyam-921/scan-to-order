from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from .schema import UserCreate, UserLogin, UserOut
from .utils import hash_password, verify_password, create_access_token, decode_access_token
from fastapi.security import OAuth2PasswordBearer
from database.db_manager import AsyncDatabaseManager
from database.model import User

router = APIRouter(prefix="/auth", tags=["Authentication"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")
db_manager = AsyncDatabaseManager()

def create_base_router() -> APIRouter:
    router = APIRouter()

# Signup
    @router.post("/register", response_model=UserOut)
    async def signup(user: UserCreate):
        await db_manager.initialize()
        async_session = await db_manager.get_session()

        async with async_session() as session:
            result = await session.execute(select(User).where(User.email == user.email))
            existing_user = result.scalar_one_or_none()
            if existing_user:
                raise HTTPException(status_code=400, detail="Email already registered")

            new_user = User(
                name=user.name,
                email=user.email,
                password=hash_password(user.password),
            )
            session.add(new_user)
            await session.commit()
            await session.refresh(new_user)
            return new_user

    # Login
    @router.post("/login")
    async def login(user: UserLogin):
        await db_manager.initialize()
        async_session = await db_manager.get_session()

        async with async_session() as session:
            result = await session.execute(select(User).where(User.email == user.email))
            db_user = result.scalar_one_or_none()

            if not db_user or not verify_password(user.password, db_user.password):
                raise HTTPException(status_code=401, detail="Invalid credentials")

            access_token = create_access_token({"sub": db_user.email})
            return {"access_token": access_token, "token_type": "bearer"}

    # Get current user
    @router.get("/me", response_model=UserOut)
    async def get_me(token: str = Depends(oauth2_scheme)):
        payload = decode_access_token(token)
        if not payload:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        email: str = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid token")

        await db_manager.initialize()
        async_session = await db_manager.get_session()

        async with async_session() as session:
            result = await session.execute(select(User).where(User.email == email))
            db_user = result.scalar_one_or_none()
            if not db_user:
                raise HTTPException(status_code=404, detail="User not found")

            return db_user
    
    return router