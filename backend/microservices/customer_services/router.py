import time
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import insert, select
from sqlalchemy.orm import selectinload
from fastapi.responses import StreamingResponse
import qrcode
import io
from database.model.menu_items import MenuItem
from database.model.menu_category import MenuCategory
from database.model.orders import Orders
from database.model import OrderItem
from database.model import User
from database.model import Restaurants
from database.db_manager import AsyncDatabaseManager
from sqlalchemy.exc import SQLAlchemyError
from .schema import OrderRequestBody, RestaurantCreate
from .utils import decode_access_token
from fastapi.security import OAuth2PasswordBearer

# Create a single DB manager instance
db_manager = AsyncDatabaseManager()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")
async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    email: str = payload.get("sub")
    if not email:
        raise HTTPException(status_code=401, detail="Invalid token")

    async_session = await db_manager.get_session()
    async with async_session() as session:
        result = await session.execute(select(User).where(User.email == email))
        db_user = result.scalar_one_or_none()
        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")
        return db_user

def create_base_router() -> APIRouter:
    router = APIRouter()

    @router.get("/menu-items/{restaurant_id}")
    async def get_menu_items(restaurant_id: int, request: Request):
        await db_manager.initialize()
        async_session = await db_manager.get_session()

        async with async_session() as session:
            # Query menu items with their category using selectinload
            query = select(MenuItem).options(selectinload(MenuItem.category)) \
                                   .where(MenuItem.restaurant_id == restaurant_id)
            result = await session.execute(query)
            menu_items = result.scalars().all()

        # Format response
        items_response = []
        for item in menu_items:
            items_response.append({
                "id": item.id,
                "name": item.name,
                "price": str(item.price),
                "description": item.description,
                "image_url": item.image_url,
                "is_available": item.is_available,
                "category": {
                    "name": item.category.name if item.category else None
                }
            })

        return items_response
    
    # @router.post("/place-order/{restaurant_id}")
    # async def place_order(restaurant_id: int, order_data: dict):
    #     """
    #     order_data example:
    #     {
    #         "table_number": "5",
    #         "customer_name": "John",
    #         "items": [
    #             {"item_id": 1, "qty": 2},
    #             {"item_id": 3, "qty": 1}
    #         ]
    #     }
    #     """
    #     await db_manager.initialize()
    #     async_session = await db_manager.get_session()

    #     if "items" not in order_data or len(order_data["items"]) == 0:
    #         raise HTTPException(status_code=400, detail="No items in order.")

    #     async with async_session() as session:
    #         # Create order
    #         new_order = Order(
    #             restaurant_id=restaurant_id,
    #             table_number=order_data.get("table_number"),
    #             customer_name=order_data.get("customer_name")
    #         )
    #         session.add(new_order)
    #         await session.flush()  # Get order.id

    #         # Create order items
    #         for item in order_data["items"]:
    #             order_item = OrderItem(
    #                 order_id=new_order.id,
    #                 menu_item_id=item["item_id"],
    #                 quantity=item["qty"]
    #             )
    #             session.add(order_item)

    #         await session.commit()

    #     return {"message": "Order placed successfully!", "order_id": new_order.id}
    





    @router.post("/orders")
    async def post_orders(request: OrderRequestBody):
        await db_manager.initialize()
        async_session = await db_manager.get_session()
        
        async with async_session() as session:
            try:
                # Validate menu items exist
                menu_item_ids = [item.menu_item_id for item in request.order_items]
                result = await session.execute(select(MenuItem).where(MenuItem.id.in_(menu_item_ids)))
                existing_items = result.scalars().all()
                if len(existing_items) != len(menu_item_ids):
                    raise HTTPException(status_code=400, detail="One or more menu items not found")

                # Create the main order
                new_order = Orders(
                    restaurant_id=request.restaurant_id,
                    table_number=request.table_number,
                    total_amount=request.total_amount,
                    status=request.status or "pending"
                )

                # Add order to session and flush to get ID
                session.add(new_order)
                await session.commit()
                await session.flush()
                await session.refresh(new_order)
                # Ensure we have the ID before proceeding
                if new_order.id is None:
                    raise HTTPException(status_code=500, detail="Failed to generate order ID")

                # Create order items with explicit order_id
                order_items = []
                for item in request.order_items:
                    order_item = OrderItem(
                        order_id=new_order.id,
                        menu_item_id=item.menu_item_id,
                        quantity=item.quantity,
                        price=item.price
                    )
                    order_items.append(order_item)
                
                # Add all order items
                session.add_all(order_items)
                
                # Commit everything together
                await session.commit()
                
                # Refresh to get the latest state
                

                return {
                    "order_id": new_order.id,
                    "created_at": new_order.created_at,
                    "status": new_order.status,
                    "items_count": len(order_items)
                }

            except HTTPException:
                await session.rollback()
                raise
            except SQLAlchemyError as e:
                await session.rollback()
                raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
            except Exception as e:
                await session.rollback()
                raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")   
    




    @router.post("/restaurants-with-menu")
    async def create_restaurant_with_menu(
    data: RestaurantCreate,
    current_user: User = Depends(get_current_user)   # ✅ require auth
):
        async_session = await db_manager.get_session()
        async with async_session() as session:
            try:
                # Step 1: Insert restaurant with user_id
                query = insert(Restaurants).values(
                    name=data.name,
                    address=data.address,
                    phone=data.phone,
                    user_id=current_user.id  # ✅ link restaurant to user
                ).returning(Restaurants.id)
                result = await session.execute(query)
                restaurant_id = result.scalar_one()

                # Step 2: Insert menu items
                if data.menu_items:
                    menu_items_to_insert = [
                        {
                            "restaurant_id": restaurant_id,
                            "name": item.name,
                            "description": item.description,
                            "price": item.price,
                            "category_id": item.category_id,
                            "image_url": item.image_url,
                            "is_available": item.is_available,
                        }
                        for item in data.menu_items
                    ]
                    await session.execute(insert(MenuItem), menu_items_to_insert)

                await session.commit()

                return {
                    "restaurant_id": restaurant_id,
                    "name": data.name,
                    "menu_items_count": len(data.menu_items),
                    "message": "Restaurant and menu items created successfully"
                }

            except Exception as e:
                await session.rollback()
                raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

    @router.get("/get-categories")
    async def get_categories():
        await db_manager.initialize()
        async_session = await db_manager.get_session()

        async with async_session() as session:
            stmt = select(MenuCategory).order_by(MenuCategory.sort_order, MenuCategory.name)
            result = await session.execute(stmt)
            categories = result.scalars().all()
            return [
                {"id": c.id, "name": c.name}
                for c in categories
            ]
    



    @router.get("/generate-qr/{restaurant_id}")
    async def generate_qr(restaurant_id: int,
                        #   current_user: User = Depends(get_current_user) 
                        ):

        try:
            # 👇 Encode your restaurant_id into a customer-facing URL
            data = f"http://localhost:3000/order/{restaurant_id}"  # Local link for now

            # 👇 Generate QR Code
            qr = qrcode.make(data)
            buf = io.BytesIO()
            qr.save(buf, format="PNG")
            buf.seek(0)

            # 👇 Return PNG image
            return StreamingResponse(buf, media_type="image/png")

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error generating QR: {str(e)}")

    return router

