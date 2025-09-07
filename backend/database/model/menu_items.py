from sqlalchemy import Column, Integer, String, Text, DECIMAL, ForeignKey, TIMESTAMP, func, Boolean
from sqlalchemy.orm import relationship
from database.base import Base

class MenuItem(Base):
    __tablename__ = "menu_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id", ondelete="CASCADE"))
    category_id = Column(Integer, ForeignKey("menu_categories.id", ondelete="CASCADE"))
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    price = Column(DECIMAL(10, 2), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    image_url = Column(String, nullable=True)
    is_available = Column(Boolean, nullable=False, default=True)  # ✅ Boolean instead of bool


    # Relationships
    restaurant = relationship("Restaurants", back_populates="menu_items")
    category = relationship("MenuCategory", back_populates="items")
    order_items = relationship("OrderItem", back_populates="menu_item") 