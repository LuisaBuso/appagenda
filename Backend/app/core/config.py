from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware  # Importa el middleware CORS
from dotenv import load_dotenv

# Importar routers de cada módulo
from app.auth.routes import router as auth_router
from app.scheduling.routes import app_router as scheduling_router
from app.admin.routes_locales import router as admin_locales_router
from app.admin.routes_servicios import router as admin_servicios_router
from app.admin.routes_profesionales import router as admin_profesionales_router
from app.inventary.routes import app_router as inventary_router
from app.analytics.routes_churn import router as churn_router
from app.analytics.routes_analytics import router as analytics_router
from app.database.indexes import create_indexes
from app.database.mongo import db  
from app.database.indexes import create_indexes  

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def read_root():
    return {"message": "Bienvenido a la API de Agenda"}


@app.on_event("startup")
async def startup_event():
    await create_indexes(db)
    print("ÍNDICES CREADOS EN MONGODB")

# Incluir todos los routers
app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
app.include_router(scheduling_router, prefix="/scheduling")
app.include_router(admin_locales_router)
app.include_router(admin_servicios_router)
app.include_router(admin_profesionales_route)
app.include_router(churn_router)
app.include_router(analytics_router)
app.include_router(inventary_router, prefix="/inventary")


