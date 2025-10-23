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
collection_user = db["usuario"]
collection_superadmin = db["super_admin"]
collection_estilista = db["estilista"]
collection_admin_sede = db["admin_sede"]
collection_admin_franquicia = db["admin_franquicia"]

def connect_to_mongo():
    pass