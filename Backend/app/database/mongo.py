from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

uri = os.getenv("MONGODB_URI")
db_name = os.getenv("MONGODB_NAME", "DataAgenda")

if not uri:
    raise RuntimeError("MONGODB_URI no está definida en .env")

client = AsyncIOMotorClient(uri)
db = client[db_name]
collection_user = db["estilista"]
collection_superadmin = db["users_auth"]
collection_estilista = db["estilista"]
collection_admin_sede = db["users_auth"]
collection_admin_franquicia = db["admin_franquicia"]
collection_horarios = db["schedules"]
collection_block = db["block"]
collection_citas = db["quotes"]
collection_servicios = db["services"]
collection_locales = db["branch"]
collection_productos = db["products"]
collection_pedidos = db["orders"]
collection_salidas = db["exits"]




def connect_to_mongo():
    pass