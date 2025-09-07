from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .router import create_base_router

app = FastAPI()

# Allow React frontend to communicate
origins = [
    "http://localhost:3000",  # React dev server
    "http://127.0.0.1:3000",  # Another common localhost URL
    # Add your deployed frontend URLs here if needed
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Can also use ["*"] for all origins (not recommended for production)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include router
app.include_router(
    create_base_router(),
    prefix="/auth",
    tags=["menu"]
)
