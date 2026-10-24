from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import chores
import rewards

app = FastAPI(generate_unique_id_function=lambda route: route.name)
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000"], allow_methods=["*"], allow_headers=["*"])

app.include_router(chores.router)
app.include_router(rewards.router)

@app.get("/")
async def root():
    return {"message": "Hello World"}
