# database/base.py
from sqlalchemy.orm import declarative_base
from sqlalchemy import MetaData

# Create MetaData with schema
metadata = MetaData(schema="app")

# Create a single Base instance that all models will inherit from
Base = declarative_base(metadata=metadata)
