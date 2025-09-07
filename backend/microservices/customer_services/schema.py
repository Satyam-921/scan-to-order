from pydantic import BaseModel
from typing import Optional

from typing import List, Optional
from pydantic import BaseModel

class MenuItemList(BaseModel):
    menu_item_id: int
    quantity: int
    price: float  # Use float for money/price in request body

class OrderRequestBody(BaseModel):
    order_id : Optional[int] = None
    restaurant_id: int
    table_number: int
    total_amount: float
    status: Optional[str] = "pending"
    order_items: List[MenuItemList]  # ✅ Correct type hint


# Pydantic schemas
class MenuItemCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    category_id: Optional[int] = None
    image_url: Optional[str] = None
    is_available: bool = True

class RestaurantCreate(BaseModel):
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    menu_items: List[MenuItemCreate] = []