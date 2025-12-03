from django.http import JsonResponse
from django.views.decorators.http import require_GET, require_POST
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from pathlib import Path
from django.http import HttpResponse
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.views.decorators.http import require_http_methods
import json

from .models import Offers, Users


def _icon_for_genre(genre: str) -> str:
    """Map genre values to Font Awesome icons."""
    if not genre:
        return "fa-ticket-alt"
    
    genre_lower = genre.lower().strip()
    if "sport" in genre_lower:
        return "fa-basketball-ball"
    if "show" in genre_lower or "performance" in genre_lower:
        return "fa-theater-masks"
    # sightseeing (or similar) -> camera icon
    if "sight" in genre_lower or "sightseeing" in genre_lower:
        return "fa-camera"
    # explicit other -> ticket icon
    if genre_lower == "other" or "other" in genre_lower:
        return "fa-ticket-alt"

    # fallback
    return "fa-ticket-alt"


@csrf_exempt
@require_GET
def offers_list(request):
    # Only return offers that have no buyer (i.e. available offers)
    queryset = Offers.objects.filter(buyer__isnull=True)[:50]
    data = []
    for offer in queryset:
        genre = getattr(offer, "genre", None) or ""

# This is your custom Users row, e.g. with fields: id, name, introduction
        seller_profile = getattr(offer, "seller", None)
        seller_name = getattr(seller_profile, "name", None)

        # Try to find the matching Django auth user by username
        auth_user = None
        if seller_name:
            auth_user = User.objects.filter(username=seller_name).first()

        data.append({
            "id": offer.id if hasattr(offer, "id") else None,
            "title": getattr(offer, "item", None) or "Untitled",
            "genre": genre,
            "description": getattr(offer, "description", None) or "",
            # format price if available, keep a friendly string otherwise
            "price": (f"${float(offer.price):.2f}" if getattr(offer, "price", None) is not None else "$0.00"),
            # seller name (if available)
            "seller": seller_name or "Unknown",
            #seller id (if available)
            "seller_id": auth_user.id if auth_user else None,
            # date as ISO string (if available)
            "date": (offer.date.isoformat() if getattr(offer, "date", None) is not None else None),
            "icon": _icon_for_genre(genre),
            "image_path": getattr(offer, "image_path", None),
        })
        
        

    resp = JsonResponse({"results": data})
    # Allow simple cross-origin GETs from the static frontend
    resp["Access-Control-Allow-Origin"] = "*"
    return resp



def index_html(request):
    """Return the frontend/index.html file so the root URL serves the static frontend in dev.

    This reads the file from the repository `frontend` folder (two levels above BASE_DIR).
    """
    # BASE_DIR in settings is backend/UFTicketer, so go up two levels to repo root
    frontend_dir = Path(settings.BASE_DIR).parent.parent / 'frontend'
    index_file = frontend_dir / 'index.html'
    try:
        content = index_file.read_text(encoding='utf-8')
        return HttpResponse(content, content_type='text/html')
    except FileNotFoundError:
        return HttpResponse('index.html not found', status=404)


@csrf_exempt
@require_POST
def login_view(request):
    """Handle user login using Django's built-in authentication."""
    try:
        data = json.loads(request.body)
        username = data.get('username', '').strip()
        password = data.get('password', '')
        
        if not username or not password:
            return JsonResponse({'success': False, 'error': 'Username and password are required'}, status=400)
        
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            return JsonResponse({
                'success': True,
                'username': user.username,
                'user_id': user.id,
                'message': 'Login successful'
            })
        else:
            return JsonResponse({'success': False, 'error': 'Invalid username or password'}, status=401)
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


@csrf_exempt
@require_POST
def signup_view(request):
    """Handle user signup using Django's built-in User model."""
    try:
        data = json.loads(request.body)
        username = data.get('username', '').strip()
        password = data.get('password', '')
        
        if not username or not password:
            return JsonResponse({'success': False, 'error': 'Username and password are required'}, status=400)
        
        if len(password) < 8:
            return JsonResponse({'success': False, 'error': 'Password must be at least 8 characters long'}, status=400)
        
        if User.objects.filter(username=username).exists():
            return JsonResponse({'success': False, 'error': 'Username already exists'}, status=400)
        
        user = User.objects.create_user(username=username, password=password)
        login(request, user)
        
        return JsonResponse({
            'success': True,
            'username': user.username,
            'user_id': user.id,
            'message': 'Account created successfully'
        })
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


@csrf_exempt
@require_POST
def logout_view(request):
    """Handle user logout."""
    logout(request)
    return JsonResponse({'success': True, 'message': 'Logged out successfully'})


@require_GET
def check_auth_status(request):
    """Check if user is authenticated."""
    if request.user.is_authenticated:
        return JsonResponse({
            'authenticated': True,
            'username': request.user.username,
            'user_id': request.user.id,
        })
    else:
        return JsonResponse({'authenticated': False})


@csrf_exempt
@require_POST
def password_reset_request(request):
    """Handle password reset request (forgot password)."""
    try:
        data = json.loads(request.body)
        username = data.get('username', '').strip()
        
        if not username:
            return JsonResponse({'success': False, 'error': 'Username is required'}, status=400)
        
        try:
            user = User.objects.get(username=username)
            # In a real application, you would send an email here
            # For now, we'll just return success
            return JsonResponse({
                'success': True,
                'message': 'If an account exists with this username, a password reset link has been sent.'
            })
        except User.DoesNotExist:
            # Don't reveal if user exists or not for security
            return JsonResponse({
                'success': True,
                'message': 'If an account exists with this username, a password reset link has been sent.'
            })
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


@require_GET
def get_user_profile(request):
    """Get user profile information (username and introduction)."""
    if not request.user.is_authenticated:
        return JsonResponse({'success': False, 'error': 'Not authenticated'}, status=401)
    
    try:
        # Try to find Users record matching the Django User's username
        user_profile = Users.objects.filter(name=request.user.username).first()
        
        introduction = user_profile.introduction if user_profile else ""
        
        return JsonResponse({
            'success': True,
            'username': request.user.username,
            'introduction': introduction or ""
        })
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)


@csrf_exempt
@require_POST
def update_user_profile(request):
    """Update user profile (username, password, introduction)."""
    if not request.user.is_authenticated:
        return JsonResponse({'success': False, 'error': 'Not authenticated'}, status=401)
    
    try:
        data = json.loads(request.body)
        user = request.user
        
        # Update username if provided
        new_username = data.get('username', '').strip()
        if new_username and new_username != user.username:
            if User.objects.filter(username=new_username).exclude(pk=user.pk).exists():
                return JsonResponse({'success': False, 'error': 'Username already exists'}, status=400)
            user.username = new_username
            user.save()
        
        # Update password if provided
        new_password = data.get('password', '').strip()
        if new_password:
            if len(new_password) < 8:
                return JsonResponse({'success': False, 'error': 'Password must be at least 8 characters long'}, status=400)
            user.set_password(new_password)
            user.save()
            # Re-login user after password change
            login(request, user)
        
        # Update introduction in Users table
        introduction = data.get('introduction', '').strip()
        if introduction is not None:
            user_profile, created = Users.objects.get_or_create(name=user.username)
            user_profile.introduction = introduction
            user_profile.save()
        
        # Get updated introduction
        user_profile = Users.objects.filter(name=user.username).first()
        introduction = user_profile.introduction if user_profile else ""
        
        return JsonResponse({
            'success': True,
            'username': user.username,
            'introduction': introduction or "",
            'message': 'Profile updated successfully'
        })
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)