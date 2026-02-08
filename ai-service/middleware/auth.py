"""Firebase authentication middleware for AI service"""
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import firebase_admin
from firebase_admin import credentials, auth
import os

# Initialize Firebase Admin SDK
if not firebase_admin._apps:
    service_account_path = os.getenv(
        'FIREBASE_SERVICE_ACCOUNT_PATH', '../firebase-service-account.json')

    if os.path.exists(service_account_path):
        cred = credentials.Certificate(service_account_path)
        firebase_admin.initialize_app(cred)
        print("✅ Firebase Admin SDK initialized successfully")
    else:
        print(
            f"⚠️ Firebase service account file not found at: {service_account_path}")
        print("⚠️ Firebase authentication will be disabled")

security = HTTPBearer()


async def verify_firebase_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    """
    Verify Firebase ID token from Authorization header.
    Returns the decoded token with user information.
    """
    if not firebase_admin._apps:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized - Firebase not configured"
        )

    token = credentials.credentials

    try:
        # Verify the ID token
        decoded_token = auth.verify_id_token(token)
        return {
            'uid': decoded_token.get('uid'),
            'email': decoded_token.get('email'),
            'name': decoded_token.get('name')
        }
    except auth.InvalidIdTokenError:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized - Invalid token"
        )
    except auth.ExpiredIdTokenError:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized - Token expired"
        )
    except Exception as e:
        print(f"Auth error: {str(e)}")
        raise HTTPException(
            status_code=401,
            detail="Unauthorized - Authentication failed"
        )


async def optional_verify_firebase_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    """
    Optional Firebase token verification - allows unauthenticated requests.
    Returns user info if token is valid, None otherwise.
    """
    if not firebase_admin._apps:
        return None

    if not credentials:
        return None

    token = credentials.credentials

    try:
        decoded_token = auth.verify_id_token(token)
        return {
            'uid': decoded_token.get('uid'),
            'email': decoded_token.get('email'),
            'name': decoded_token.get('name')
        }
    except Exception:
        return None
