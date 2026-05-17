from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import chat, health

app = FastAPI(title="NEON PAW API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router)
app.include_router(health.router)


@app.get("/")
def root():
    return {"status": "NEON PAW API is running"}
