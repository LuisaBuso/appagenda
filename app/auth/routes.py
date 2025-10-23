from fastapi import APIRouter, HTTPException, Form, Depends, status
from datetime import datetime, timedelta
from jose import jwt, JWTError
from fastapi.security import OAuth2PasswordBearer
from app.auth.controllers import (
    create_access_token,
    pwd_context,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    SECRET_KEY,
    ALGORITHM
)
from app.auth.models import TokenResponse, UserCreate, UserInDB
from app.database.mongo import (
    collection_user,
    collection_superadmin,
    collection_estilista,
    collection_admin_sede,
    collection_admin_franquicia
)

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")


# =========================================================
# 🔑 GET CURRENT USER FROM TOKEN
# =========================================================
async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        rol: str = payload.get("rol")

        if not email or not rol:
            raise credentials_exception

        # Buscar usuario según el rol
        role_collections = {
            "super_admin": collection_superadmin,
            "admin_franquicia": collection_admin_franquicia,
            "admin_sede": collection_admin_sede,
            "estilista": collection_estilista,
            "usuario": collection_user
        }

        collection = role_collections.get(rol)
        if not collection:
            raise credentials_exception

        user = await collection.find_one({"correo_electronico": email})
        if not user:
            raise credentials_exception

        return {"email": email, "rol": rol, "nombre": user.get("nombre")}
    except JWTError:
        raise credentials_exception


# =========================================================
# 👤 CREATE NEW USER (only super_admin)
# =========================================================
@router.post("/register")
async def create_user(
    nombre: str = Form(...),
    correo_electronico: str = Form(...),
    password: str = Form(...),
    rol: str = Form(...),
    franquicia_id: str = Form(None),
    sede_id: str = Form(None),
    current_user: dict = Depends(get_current_user)
):
    # Solo super_admin puede crear usuarios
    if current_user["rol"] != "super_admin":
        raise HTTPException(status_code=403, detail="No autorizado para crear usuarios")

    # Verificar rol válido
    valid_roles = ["super_admin", "admin_franquicia", "admin_sede", "estilista", "usuario"]
    if rol not in valid_roles:
        raise HTTPException(status_code=400, detail="Rol inválido")

    # Seleccionar la colección correcta según rol
    role_collections = {
        "super_admin": collection_superadmin,
        "admin_franquicia": collection_admin_franquicia,
        "admin_sede": collection_admin_sede,
        "estilista": collection_estilista,
        "usuario": collection_user
    }
    collection = role_collections[rol]

    existing_user = await collection.find_one({"correo_electronico": correo_electronico.lower()})
    if existing_user:
        raise HTTPException(status_code=400, detail="El usuario ya existe")

    hashed_password = pwd_context.hash(password)
    nuevo_usuario = {
        "nombre": nombre,
        "correo_electronico": correo_electronico.lower(),
        "hashed_password": hashed_password,
        "rol": rol,
        "franquicia_id": franquicia_id,
        "sede_id": sede_id,
        "fecha_creacion": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "activo": True
    }

    await collection.insert_one(nuevo_usuario)

    return {"msg": "Usuario creado exitosamente", "rol": rol, "correo": correo_electronico}


# =========================================================
# 🔓 LOGIN AND TOKEN (LOGIN)
# =========================================================
@router.post("/token", response_model=TokenResponse)
async def login(
    username: str = Form(...),
    password: str = Form(...)
):
    username = username.lower()

    # Buscar usuario en todas las colecciones según el rol
    collections = [
        (collection_superadmin, "super_admin"),
        (collection_admin_franquicia, "admin_franquicia"),
        (collection_admin_sede, "admin_sede"),
        (collection_estilista, "estilista"),
        (collection_user, "usuario"),
    ]

    user = None
    rol = None
    collection_found = None

    for collection, role_name in collections:
        user = await collection.find_one({"correo_electronico": username})
        if user:
            rol = role_name
            collection_found = collection
            break

    if not user:
        raise HTTPException(status_code=400, detail="Usuario no encontrado")

    if not pwd_context.verify(password, user.get("hashed_password")):
        raise HTTPException(status_code=401, detail="Contraseña incorrecta")

    # Actualizar último acceso
    await collection_found.update_one(
        {"_id": user["_id"]},
        {"$set": {"ultimo_acceso": datetime.now().strftime("%Y-%m-%d %H:%M")}}
    )

    # Crear el token con los claims correctos
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "sub": user["correo_electronico"],
            "rol": rol,
            "nombre": user.get("nombre"),
            "franquicia_id": user.get("franquicia_id"),
            "sede_id": user.get("sede_id")
        },
        expires_delta=access_token_expires
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        rol=rol,
        nombre=user.get("nombre"),
        email=user.get("correo_electronico"),
        franquicia_id=user.get("franquicia_id"),
        sede_id=user.get("sede_id")
    )


# =========================================================
# 🔍 VALIDATE TOKEN
# =========================================================
@router.get("/validate_token")
async def validate_token(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return {"valid": True, "exp": payload.get("exp")}
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")

# =========================================================
# 🛠 CREATE INITIAL SUPER ADMIN (WITHOUT AUTHENTICATION)
# =========================================================
@router.post("/create-superadmin")
async def create_initial_superadmin(
    nombre: str = Form(...),
    correo_electronico: str = Form(...),
    password: str = Form(...)
):
    """
    Crea el primer usuario super_admin sin requerir autenticación.
    Si ya existe un super_admin, bloquea la creación.
    """

    # Verificar si ya existe un super_admin
    existing_admin = await collection_superadmin.find_one({})
    if existing_admin:
        raise HTTPException(
            status_code=400,
            detail="Ya existe un super_admin registrado. Usa /auth/token para iniciar sesión."
        )

    # Encriptar la contraseña
    hashed_password = pwd_context.hash(password)

    # Crear documento
    super_admin = {
        "nombre": nombre,
        "correo_electronico": correo_electronico.lower(),
        "hashed_password": hashed_password,
        "rol": "super_admin",
        "franquicia_id": None,
        "sede_id": None,
        "fecha_creacion": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "activo": True
    }

    # Insertar en la colección
    await collection_superadmin.insert_one(super_admin)

    return {
        "msg": "✅ Super admin creado exitosamente.",
        "correo": correo_electronico,
        "rol": "super_admin"
    }


# =========================================================
# 🔑 CHANGE PASSWORD DIRECTLY (without token)
# =========================================================
@router.post("/change-password")
async def change_password(
    email: str = Form(...),
    new_password: str = Form(...),
    confirm_password: str = Form(...)
):
    email = email.lower()

    # Validar contraseñas coincidan
    if new_password != confirm_password:
        raise HTTPException(status_code=400, detail="Las contraseñas no coinciden")

    # Buscar usuario en las colecciones
    collections = [
        collection_superadmin,
        collection_admin_franquicia,
        collection_admin_sede,
        collection_estilista,
        collection_user
    ]

    user = None
    collection_found = None

    for col in collections:
        user = await col.find_one({"correo_electronico": email})
        if user:
            collection_found = col
            break

    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Actualizar la contraseña
    hashed_password = pwd_context.hash(new_password)
    await collection_found.update_one(
        {"_id": user["_id"]},
        {"$set": {"hashed_password": hashed_password}}
    )

    return {
        "msg": f"Contraseña actualizada correctamente para {email}",
        "rol": user.get("rol")
    }

