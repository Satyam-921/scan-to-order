# database/model/orders.py
from sqlalchemy import Column, Integer, ForeignKey, String, DECIMAL, TIMESTAMP, func
from sqlalchemy.orm import relationship
from database.base import Base

class Orders(Base):
    __tablename__ = "orders"
    __table_args__ = {"schema": "app"}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id", ondelete="CASCADE"))
    table_number = Column(Integer, nullable=True)
    total_amount = Column(DECIMAL(10, 2), nullable=False)
    status = Column(String(20), default="pending")
    created_at = Column(TIMESTAMP, server_default=func.now())

    # Relationships
    restaurant = relationship("Restaurants", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")  # ADDED THIS LINE
