from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer

import chores
import rewards
import group
import auth
import os

security_scheme = HTTPBearer(auto_error=False)

app = FastAPI(generate_unique_id_function=lambda route: route.name, dependencies=[Depends(security_scheme)])
app.middleware("http")(auth.require_auth)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("FRONTEND_URLS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chores.router)
app.include_router(rewards.router)
app.include_router(group.router)
app.include_router(auth.router)

@app.get("/")
async def root():
    return {"message": "Hello World"}
