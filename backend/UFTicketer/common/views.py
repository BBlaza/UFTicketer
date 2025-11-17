from django.http import JsonResponse
from django.views.decorators.http import require_GET
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from pathlib import Path
from django.http import HttpResponse

from .models import Offers


def _infer_category_from_item(item: str) -> str:
    text = (item or "").lower()
    if any(k in text for k in ["music", "concert", "festival", "classical"]):
        return "Music"
    if any(k in text for k in ["basketball", "football", "soccer", "sports"]):
        return "Sports"
    if any(k in text for k in ["comedy", "standup", "stand-up"]):
        return "Comedy"
    if any(k in text for k in ["tech", "conference", "developer", "hackathon"]):
        return "Technology"
    if any(k in text for k in ["theater", "theatre", "play"]):
        return "Theater"
    return "General"


def _icon_for_category(category: str) -> str:
    mapping = {
        "Music": "fa-music",
        "Sports": "fa-basketball-ball",
        "Comedy": "fa-theater-masks",
        "Technology": "fa-laptop-code",
        "Theater": "fa-masks-theater",
        "General": "fa-ticket-alt",
    }
    return mapping.get(category or "General", "fa-ticket-alt")


@csrf_exempt
@require_GET
def offers_list(request):
    queryset = Offers.objects.all()[:50]
    data = []
    for offer in queryset:
        category = _infer_category_from_item(getattr(offer, "item", None))
        data.append({
            "id": offer.id if hasattr(offer, "id") else None,
            "title": getattr(offer, "item", None) or "Untitled",
            "category": category,
            "description": getattr(offer, "description", None) or "",
            # format price if available, keep a friendly string otherwise
            "price": (f"${float(offer.price):.2f}" if getattr(offer, "price", None) is not None else "$0.00"),
            # seller name (if available)
            "seller": (getattr(getattr(offer, "seller", None), "name", None) or "Unknown"),
            # date as ISO string (if available)
            "date": (offer.date.isoformat() if getattr(offer, "date", None) is not None else None),
            "icon": _icon_for_category(category),
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