"""
URL configuration for UFTicketer project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, re_path, include
from django.conf import settings
from django.views.static import serve
from pathlib import Path

from common.views import offers_list, create_offer, get_user_offers, update_offer, mark_offer_as_sold, index_html, messages_html, profile_html, login_view, signup_view, logout_view, check_auth_status, password_reset_request, get_user_profile, update_user_profile

# Compute path to the repository frontend folder (repo root /frontend)
# settings.BASE_DIR points at backend/UFTicketer, so go up two levels
FRONTEND_DIR = Path(settings.BASE_DIR).parent.parent / 'frontend'

urlpatterns = [
    path('admin/', admin.site.urls),
    path('dm/', include('messaging.urls')),
    path('api/offers/', offers_list, name='offers-list'),
    path('api/offers/create/', create_offer, name='create-offer'),
    path('api/offers/my/', get_user_offers, name='user-offers'),
    path('api/offers/update/', update_offer, name='update-offer'),
    path('api/offers/mark-sold/', mark_offer_as_sold, name='mark-offer-sold'),
    # Authentication endpoints
    path('api/auth/login/', login_view, name='login'),
    path('api/auth/signup/', signup_view, name='signup'),
    path('api/auth/logout/', logout_view, name='logout'),
    path('api/auth/status/', check_auth_status, name='auth-status'),
    path('api/auth/password-reset/', password_reset_request, name='password-reset'),
    # User profile endpoints
    path('api/user/profile/', get_user_profile, name='user-profile'),
    path('api/user/profile/update/', update_user_profile, name='update-profile'),
    # Serve the static frontend index at the root
    path('', index_html, name='home'),
    path('messages/', messages_html, name='messages'),
    path('profile/', profile_html, name='profile'),
    # During development serve a few frontend assets directly from the frontend folder
    path('styles.css', serve, {'path': 'styles.css', 'document_root': str(FRONTEND_DIR)}),
    path('messages.css', serve, {'path': 'messages.css', 'document_root': str(FRONTEND_DIR)}),
    path('profile.css', serve, {'path': 'profile.css', 'document_root': str(FRONTEND_DIR)}),
    path('script.js', serve, {'path': 'script.js', 'document_root': str(FRONTEND_DIR)}),
    path('messages.js', serve, {'path': 'messages.js', 'document_root': str(FRONTEND_DIR)}),
    path('profile.js', serve, {'path': 'profile.js', 'document_root': str(FRONTEND_DIR)}),
    path('offers.json', serve, {'path': 'offers.json', 'document_root': str(FRONTEND_DIR)}),
    # Fallback for other static files in frontend (images, fonts, etc.)
    re_path(r'^(?P<path>.*\.(?:css|js|json|png|jpg|jpeg|svg|gif))$', serve, {'document_root': str(FRONTEND_DIR)}),
]
