from sqlalchemy import Column, Integer, Numeric, String, Text, DECIMAL, ForeignKey, TIMESTAMP, func
from sqlalchemy.orm import relationship
from database.base import Base

class OrderItem(Base):
    __tablename__ = "order_items"
    __table_args__ = {"schema": "app"}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # Foreign keys
    order_id = Column(Integer, ForeignKey("app.orders.id", ondelete="CASCADE"), nullable=False)
    menu_item_id = Column(Integer, ForeignKey("menu_items.id", ondelete="CASCADE"), nullable=False)

    # Details
    quantity = Column(Integer, nullable=False)
    price = Column(Numeric(10, 2), nullable=False)

    # Relationships
    order = relationship("Orders", back_populates="items")
    menu_item = relationship("MenuItem", back_populates="order_items")