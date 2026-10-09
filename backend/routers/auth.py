from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from typing import Optional
import jwt
from passlib.context import CryptContext
from pydantic import BaseModel, ConfigDict, EmailStr

from database import get_db
from models.user import User, UserPreferences
from config import settings
from rate_limit import by_ip

router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

# --- Security Utilities ---
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=60)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise credentials_exception
    
    user = db.query(User).filter(User.email == email).first()
    # A deactivated account must stop working immediately, including any
    # token it was issued before deactivation.
    if user is None or not user.is_active:
        raise credentials_exception
    return user

# --- Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

# Checked in the handler rather than with Field(min_length=...): a validation
# failure there returns detail as a list, and the Register page renders detail
# as text. These return a plain string it can show directly.
MIN_PASSWORD = 8
MAX_PASSWORD = 128   # bounds the request; bcrypt itself only reads 72 bytes
MAX_NAME = 100

class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    is_active: bool

    model_config = ConfigDict(from_attributes=True)

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    theme: Optional[str] = None

# --- Endpoints ---

@router.post(
    "/register",
    response_model=UserResponse,
    dependencies=[Depends(by_ip("register", 5, 3600))],
)
async def register(user: UserCreate, db: Session = Depends(get_db)):
    if not MIN_PASSWORD <= len(user.password) <= MAX_PASSWORD:
        raise HTTPException(
            status_code=400,
            detail=f"Password must be between {MIN_PASSWORD} and {MAX_PASSWORD} characters",
        )
    if not user.name.strip() or len(user.name) > MAX_NAME:
        raise HTTPException(status_code=400, detail=f"Name must be 1-{MAX_NAME} characters")

    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    new_user = User(
        email=user.email,
        password_hash=hashed_password,
        name=user.name
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create default preferences
    prefs = UserPreferences(user_id=new_user.id, theme="dark")
    db.add(prefs)
    db.commit()
    
    return new_user

# 10 attempts a minute per IP: plenty for a person mistyping, far too slow for
# guessing passwords.
@router.post(
    "/login",
    response_model=Token,
    dependencies=[Depends(by_ip("login", 10, 60))],
)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not user.is_active or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=60*24*7) # 7 days
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name
        }
    }

@router.post("/logout")
async def logout():
    # In a stateless JWT auth, logout is primarily handled client-side by deleting the token.
    # A true server-side logout would require a token blocklist. We return success.
    return {"message": "Successfully logged out"}

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/profile", response_model=UserResponse)
async def update_profile(
    profile_data: ProfileUpdate, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if profile_data.name:
        if len(profile_data.name) > MAX_NAME:
            raise HTTPException(status_code=400, detail=f"Name must be at most {MAX_NAME} characters")
        current_user.name = profile_data.name
    
    if profile_data.theme:
        if not current_user.preferences:
            prefs = UserPreferences(user_id=current_user.id, theme=profile_data.theme)
            db.add(prefs)
        else:
            current_user.preferences.theme = profile_data.theme
            
    db.commit()
    db.refresh(current_user)
    return current_user
