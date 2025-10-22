from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware  # Importa el middleware CORS
from dotenv import load_dotenv

# Importar routers de cada módulo

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",         # Desarrollo local
        "http://127.0.0.1:3000",         # Alternativa local
        ""  # Producción
    ],
    allow_credentials=True,
    allow_methods=["*"],  # Permite todos los métodos HTTP
    allow_headers=["*"],  # Permite todos los headers
)
# Incluir todos los routers
@app.get("/")
async def read_root():
    return {"message": "Bienvenido a la API de Agenda"}


