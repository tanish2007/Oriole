from fastapi import FastAPI

import chores
import rewards

app = FastAPI()

app.include_router(chores.router)
app.include_router(rewards.router)

@app.get("/")
async def root():
    return {"message": "Hello World"}
