# database/db_manager.py
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from .base import Base  # Import from the separate base file

# Database URL - change based on your driver
# For psycopg (v3):
# DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg://postgres:postgres@localhost:5432/barcode_db")

# For psycopg2:
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:SATYAM2001@localhost:5432/barcode_db")


class AsyncDatabaseManager:
    def __init__(self, database_url: str = DATABASE_URL):
        self.engine = create_async_engine(database_url, echo=True, future=True)
        self.session_factory = sessionmaker(
            bind=self.engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )

    async def initialize(self):
        """Create all tables from models if they don't exist."""
        # Import models here to avoid circular imports
        from .model import MenuCategory, MenuItem, Orders,Restaurants
        
        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("created")

    async def get_session(self) -> AsyncSession:
        """Provide a session (use async with)."""
        return self.session_factory

    # ---------- CRUD METHODS ----------

    async def insert(self, obj):
        async with self.session_factory() as session:
            session.add(obj)
            await session.commit()
            await session.refresh(obj)
            return obj

    async def upsert(self, table: str, values: dict, conflict_cols: list[str]):
        """
        Insert or update if conflict.
        """
        async with self.session_factory() as session:
            cols = ", ".join(values.keys())
            placeholders = ", ".join([f":{k}" for k in values.keys()])
            updates = ", ".join([f"{col}=EXCLUDED.{col}" for col in values.keys() if col not in conflict_cols])

            sql = text(
                f"""
                INSERT INTO {table} ({cols})
                VALUES ({placeholders})
                ON CONFLICT ({", ".join(conflict_cols)})
                DO UPDATE SET {updates}
                RETURNING *;
                """
            )

            result = await session.execute(sql, values)
            await session.commit()
            return result.fetchone()

    async def delete(self, table: str, condition: str, params: dict):
        async with self.session_factory() as session:
            sql = text(f"DELETE FROM {table} WHERE {condition} RETURNING *;")
            result = await session.execute(sql, params)
            await session.commit()
            return result.fetchall()

    async def fetch_all(self, query: str, params: dict = None):
        async with self.session_factory() as session:
            result = await session.execute(text(query), params or {})
            return result.fetchall()

    async def fetch_one(self, query: str, params: dict = None):
        async with self.session_factory() as session:
            result = await session.execute(text(query), params or {})
            return result.fetchone()