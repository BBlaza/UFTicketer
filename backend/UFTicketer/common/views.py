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
        seller = getattr(offer, "seller", None)
        seller_name = getattr(seller, "name", None) if seller else None
        seller_id = None
        # Try to get Django User ID from seller name
        if seller_name:
            try:
                from django.contrib.auth.models import User
                django_user = User.objects.filter(username=seller_name).first()
                if django_user:
                    seller_id = django_user.id
            except:
                pass
        
        data.append({
            "id": offer.id if hasattr(offer, "id") else None,
            "title": getattr(offer, "item", None) or "Untitled",
            "genre": genre,
            "description": getattr(offer, "description", None) or "",
            # format price if available, keep a friendly string otherwise
            "price": (f"${float(offer.price):.2f}" if getattr(offer, "price", None) is not None else "$0.00"),
            # seller name (if available)
            "seller": seller_name or "Unknown",
            "seller_id": seller_id,
            # date as ISO string (if available)
            "date": (offer.date.isoformat() if getattr(offer, "date", None) is not None else None),
            "icon": _icon_for_genre(genre),
            "image_path": getattr(offer, "image_path", None),
        })
        
        

    resp = JsonResponse({"results": data})
    # Allow simple cross-origin GETs from the static frontend
    resp["Access-Control-Allow-Origin"] = "*"
    return resp


@csrf_exempt
@require_GET
def get_user_offers(request):
    """Get all offers created by the currently authenticated user."""
    if not request.user.is_authenticated:
        resp = JsonResponse({'success': False, 'error': 'Authentication required'}, status=401)
        resp["Access-Control-Allow-Origin"] = "*"
        return resp
    
    try:
        # Get or create Users record for the authenticated user
        user_profile, created = Users.objects.get_or_create(name=request.user.username)
        
        # Get all offers where user is the seller
        queryset = Offers.objects.filter(seller=user_profile)
        
        data = []
        for offer in queryset:
            genre = getattr(offer, "genre", None) or ""
            data.append({
                "id": offer.id if hasattr(offer, "id") else None,
                "title": getattr(offer, "item", None) or "Untitled",
                "genre": genre,
                "description": getattr(offer, "description", None) or "",
                "price": (f"${float(offer.price):.2f}" if getattr(offer, "price", None) is not None else "$0.00"),
                "seller": (getattr(getattr(offer, "seller", None), "name", None) or "Unknown"),
                "date": (offer.date.isoformat() if getattr(offer, "date", None) is not None else None),
                "icon": _icon_for_genre(genre),
                "image_path": getattr(offer, "image_path", None),
                "buyer": (getattr(getattr(offer, "buyer", None), "name", None) if getattr(offer, "buyer", None) else None),
            })
        
        resp = JsonResponse({"success": True, "results": data})
        resp["Access-Control-Allow-Origin"] = "*"
        return resp
    except Exception as e:
        resp = JsonResponse({'success': False, 'error': str(e)}, status=500)
        resp["Access-Control-Allow-Origin"] = "*"
        return resp


@csrf_exempt
@require_POST
def create_offer(request):
    """Create a new offer. Requires authentication."""
    if not request.user.is_authenticated:
        resp = JsonResponse({'success': False, 'error': 'Authentication required'}, status=401)
        resp["Access-Control-Allow-Origin"] = "*"
        return resp
    
    try:
        data = json.loads(request.body)
        
        # Get or create Users record for the authenticated user
        user_profile, created = Users.objects.get_or_create(name=request.user.username)
        
        # Extract offer data
        item = data.get('title', '').strip() or data.get('item', '').strip()
        description = data.get('description', '').strip()
        price_str = data.get('price', '').strip()
        genre = data.get('genre', '').strip()
        date_str = data.get('date', '').strip()
        image_path = data.get('image_path', None)
        
        # Validate required fields
        if not item:
            resp = JsonResponse({'success': False, 'error': 'Title is required'}, status=400)
            resp["Access-Control-Allow-Origin"] = "*"
            return resp
        
        if not description:
            resp = JsonResponse({'success': False, 'error': 'Description is required'}, status=400)
            resp["Access-Control-Allow-Origin"] = "*"
            return resp
        
        if not price_str:
            resp = JsonResponse({'success': False, 'error': 'Price is required'}, status=400)
            resp["Access-Control-Allow-Origin"] = "*"
            return resp
        
        if not genre:
            resp = JsonResponse({'success': False, 'error': 'Genre is required'}, status=400)
            resp["Access-Control-Allow-Origin"] = "*"
            return resp
        
        if not date_str:
            resp = JsonResponse({'success': False, 'error': 'Date is required'}, status=400)
            resp["Access-Control-Allow-Origin"] = "*"
            return resp
        
        # Parse price (required, so we know price_str is not empty)
        try:
            # Remove $ sign if present
            price_clean = price_str.replace('$', '').replace(',', '').strip()
            price = float(price_clean)
            if price < 0:
                resp = JsonResponse({'success': False, 'error': 'Price must be a positive number'}, status=400)
                resp["Access-Control-Allow-Origin"] = "*"
                return resp
        except ValueError:
            resp = JsonResponse({'success': False, 'error': 'Invalid price format'}, status=400)
            resp["Access-Control-Allow-Origin"] = "*"
            return resp
        
        # Parse date (required, so we know date_str is not empty)
        from datetime import datetime
        date = None
        try:
            # Handle ISO format with or without timezone
            if 'Z' in date_str:
                date_str = date_str.replace('Z', '+00:00')
            elif '+' not in date_str and date_str.count('-') >= 2:
                # If no timezone info, assume it's already in the correct format
                # fromisoformat can handle YYYY-MM-DDTHH:MM:SS format
                pass
            date = datetime.fromisoformat(date_str)
        except (ValueError, AttributeError):
            # If parsing fails, try other formats
            try:
                # Try parsing as simple date string
                date = datetime.strptime(date_str, '%Y-%m-%dT%H:%M')
            except (ValueError, AttributeError):
                # If all parsing fails, return error
                resp = JsonResponse({'success': False, 'error': 'Invalid date format'}, status=400)
                resp["Access-Control-Allow-Origin"] = "*"
                return resp
        
        # Validate genre (required, so we know genre is not empty)
        valid_genres = [choice[0] for choice in Offers.GenreChoices.choices]
        if genre not in valid_genres:
            # Try to match case-insensitively
            genre_lower = genre.lower()
            matched = None
            for valid_genre in valid_genres:
                if valid_genre.lower() == genre_lower:
                    matched = valid_genre
                    break
            if matched:
                genre = matched
            else:
                resp = JsonResponse({'success': False, 'error': 'Invalid genre. Please select a valid genre.'}, status=400)
                resp["Access-Control-Allow-Origin"] = "*"
                return resp
        
        # Create the offer (all required fields are validated at this point)
        offer = Offers.objects.create(
            item=item,
            seller=user_profile,
            description=description,
            price=price,
            genre=genre,
            date=date,
            image_path=image_path,
            buyer=None  # New offers have no buyer
        )
        
        # Return the created offer in the same format as offers_list
        genre_display = getattr(offer, "genre", None) or ""
        resp = JsonResponse({
            'success': True,
            'offer': {
                "id": offer.id if hasattr(offer, "id") else None,
                "title": getattr(offer, "item", None) or "Untitled",
                "genre": genre_display,
                "description": getattr(offer, "description", None) or "",
                "price": (f"${float(offer.price):.2f}" if getattr(offer, "price", None) is not None else "$0.00"),
                "seller": (getattr(getattr(offer, "seller", None), "name", None) or "Unknown"),
                "date": (offer.date.isoformat() if getattr(offer, "date", None) is not None else None),
                "icon": _icon_for_genre(genre_display),
                "image_path": getattr(offer, "image_path", None),
            },
            'message': 'Offer created successfully'
        })
        resp["Access-Control-Allow-Origin"] = "*"
        return resp
        
    except json.JSONDecodeError:
        resp = JsonResponse({'success': False, 'error': 'Invalid JSON'}, status=400)
        resp["Access-Control-Allow-Origin"] = "*"
        return resp
    except Exception as e:
        resp = JsonResponse({'success': False, 'error': str(e)}, status=500)
        resp["Access-Control-Allow-Origin"] = "*"
        return resp


@csrf_exempt
@require_POST
def update_offer(request):
    """Update an existing offer. Requires authentication and ownership."""
    if not request.user.is_authenticated:
        resp = JsonResponse({'success': False, 'error': 'Authentication required'}, status=401)
        resp["Access-Control-Allow-Origin"] = "*"
        return resp
    
    try:
        data = json.loads(request.body)
        offer_id = data.get('offer_id')
        
        if not offer_id:
            resp = JsonResponse({'success': False, 'error': 'Offer ID is required'}, status=400)
            resp["Access-Control-Allow-Origin"] = "*"
            return resp
        
        # Get or create Users record for the authenticated user
        user_profile, created = Users.objects.get_or_create(name=request.user.username)
        
        # Get the offer and verify ownership
        try:
            offer = Offers.objects.get(id=offer_id, seller=user_profile)
        except Offers.DoesNotExist:
            resp = JsonResponse({'success': False, 'error': 'Offer not found or you do not have permission to edit it'}, status=404)
            resp["Access-Control-Allow-Origin"] = "*"
            return resp
        
        # Extract offer data
        item = data.get('title', '').strip() or data.get('item', '').strip()
        description = data.get('description', '').strip()
        price_str = data.get('price', '').strip()
        genre = data.get('genre', '').strip()
        date_str = data.get('date', '').strip()
        image_path = data.get('image_path', None)
        
        # Validate required fields
        if not item:
            resp = JsonResponse({'success': False, 'error': 'Title is required'}, status=400)
            resp["Access-Control-Allow-Origin"] = "*"
            return resp
        
        if not description:
            resp = JsonResponse({'success': False, 'error': 'Description is required'}, status=400)
            resp["Access-Control-Allow-Origin"] = "*"
            return resp
        
        if not price_str:
            resp = JsonResponse({'success': False, 'error': 'Price is required'}, status=400)
            resp["Access-Control-Allow-Origin"] = "*"
            return resp
        
        if not genre:
            resp = JsonResponse({'success': False, 'error': 'Genre is required'}, status=400)
            resp["Access-Control-Allow-Origin"] = "*"
            return resp
        
        if not date_str:
            resp = JsonResponse({'success': False, 'error': 'Date is required'}, status=400)
            resp["Access-Control-Allow-Origin"] = "*"
            return resp
        
        # Parse price
        try:
            price_clean = price_str.replace('$', '').replace(',', '').strip()
            price = float(price_clean)
            if price < 0:
                resp = JsonResponse({'success': False, 'error': 'Price must be a positive number'}, status=400)
                resp["Access-Control-Allow-Origin"] = "*"
                return resp
        except ValueError:
            resp = JsonResponse({'success': False, 'error': 'Invalid price format'}, status=400)
            resp["Access-Control-Allow-Origin"] = "*"
            return resp
        
        # Parse date
        from datetime import datetime
        date = None
        try:
            if 'Z' in date_str:
                date_str = date_str.replace('Z', '+00:00')
            elif '+' not in date_str and date_str.count('-') >= 2:
                pass
            date = datetime.fromisoformat(date_str)
        except (ValueError, AttributeError):
            try:
                date = datetime.strptime(date_str, '%Y-%m-%dT%H:%M')
            except (ValueError, AttributeError):
                resp = JsonResponse({'success': False, 'error': 'Invalid date format'}, status=400)
                resp["Access-Control-Allow-Origin"] = "*"
                return resp
        
        # Validate genre
        valid_genres = [choice[0] for choice in Offers.GenreChoices.choices]
        if genre not in valid_genres:
            genre_lower = genre.lower()
            matched = None
            for valid_genre in valid_genres:
                if valid_genre.lower() == genre_lower:
                    matched = valid_genre
                    break
            if matched:
                genre = matched
            else:
                resp = JsonResponse({'success': False, 'error': 'Invalid genre. Please select a valid genre.'}, status=400)
                resp["Access-Control-Allow-Origin"] = "*"
                return resp
        
        # Update the offer
        offer.item = item
        offer.description = description
        offer.price = price
        offer.genre = genre
        offer.date = date
        if image_path is not None:
            offer.image_path = image_path
        offer.save()
        
        # Return the updated offer
        genre_display = getattr(offer, "genre", None) or ""
        resp = JsonResponse({
            'success': True,
            'offer': {
                "id": offer.id if hasattr(offer, "id") else None,
                "title": getattr(offer, "item", None) or "Untitled",
                "genre": genre_display,
                "description": getattr(offer, "description", None) or "",
                "price": (f"${float(offer.price):.2f}" if getattr(offer, "price", None) is not None else "$0.00"),
                "seller": (getattr(getattr(offer, "seller", None), "name", None) or "Unknown"),
                "date": (offer.date.isoformat() if getattr(offer, "date", None) is not None else None),
                "icon": _icon_for_genre(genre_display),
                "image_path": getattr(offer, "image_path", None),
            },
            'message': 'Offer updated successfully'
        })
        resp["Access-Control-Allow-Origin"] = "*"
        return resp
        
    except json.JSONDecodeError:
        resp = JsonResponse({'success': False, 'error': 'Invalid JSON'}, status=400)
        resp["Access-Control-Allow-Origin"] = "*"
        return resp
    except Exception as e:
        resp = JsonResponse({'success': False, 'error': str(e)}, status=500)
        resp["Access-Control-Allow-Origin"] = "*"
        return resp


@csrf_exempt
@require_POST
def mark_offer_as_sold(request):
    """Mark an offer as sold by setting the buyer to the current user. Requires authentication and ownership."""
    if not request.user.is_authenticated:
        resp = JsonResponse({'success': False, 'error': 'Authentication required'}, status=401)
        resp["Access-Control-Allow-Origin"] = "*"
        return resp
    
    try:
        data = json.loads(request.body)
        offer_id = data.get('offer_id')
        
        if not offer_id:
            resp = JsonResponse({'success': False, 'error': 'Offer ID is required'}, status=400)
            resp["Access-Control-Allow-Origin"] = "*"
            return resp
        
        # Get or create Users record for the authenticated user
        user_profile, created = Users.objects.get_or_create(name=request.user.username)
        
        # Get the offer and verify ownership
        try:
            offer = Offers.objects.get(id=offer_id, seller=user_profile)
        except Offers.DoesNotExist:
            resp = JsonResponse({'success': False, 'error': 'Offer not found or you do not have permission to modify it'}, status=404)
            resp["Access-Control-Allow-Origin"] = "*"
            return resp
        
        # Check if already sold
        if offer.buyer is not None:
            resp = JsonResponse({'success': False, 'error': 'This offer is already marked as sold'}, status=400)
            resp["Access-Control-Allow-Origin"] = "*"
            return resp
        
        # Mark as sold by setting buyer to the seller (or you could set it to None and use a different field)
        # For now, we'll set buyer to the seller to mark it as sold
        # In a real app, you'd want to set it to the actual buyer
        offer.buyer = user_profile
        offer.save()
        
        resp = JsonResponse({
            'success': True,
            'message': 'Offer marked as sold successfully'
        })
        resp["Access-Control-Allow-Origin"] = "*"
        return resp
        
    except json.JSONDecodeError:
        resp = JsonResponse({'success': False, 'error': 'Invalid JSON'}, status=400)
        resp["Access-Control-Allow-Origin"] = "*"
        return resp
    except Exception as e:
        resp = JsonResponse({'success': False, 'error': str(e)}, status=500)
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


def messages_html(request):
    """Return the frontend/messages.html file."""
    frontend_dir = Path(settings.BASE_DIR).parent.parent / 'frontend'
    messages_file = frontend_dir / 'messages.html'
    try:
        content = messages_file.read_text(encoding='utf-8')
        return HttpResponse(content, content_type='text/html')
    except FileNotFoundError:
        return HttpResponse('messages.html not found', status=404)


def profile_html(request):
    """Return the frontend/profile.html file."""
    frontend_dir = Path(settings.BASE_DIR).parent.parent / 'frontend'
    profile_file = frontend_dir / 'profile.html'
    try:
        content = profile_file.read_text(encoding='utf-8')
        return HttpResponse(content, content_type='text/html')
    except FileNotFoundError:
        return HttpResponse('profile.html not found', status=404)


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
        
        # Check for username uniqueness (case-insensitive)
        if User.objects.filter(username__iexact=username).exists():
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
            'user_id': request.user.id
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