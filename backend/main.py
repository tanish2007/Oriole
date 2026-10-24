from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import group


app = FastAPI(generate_unique_id_function=lambda route: route.name)
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000"], allow_methods=["*"], allow_headers=["*"])

app.include_router(group.router)

@app.get("/")
async def root():
    return {"message": "Hello World"}