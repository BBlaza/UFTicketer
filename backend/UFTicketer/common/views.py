from django.http import JsonResponse
from django.views.decorators.http import require_GET
from django.views.decorators.csrf import csrf_exempt

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
            "price": "$0",  # price not available in model; default placeholder
            "icon": _icon_for_category(category),
            "image_path": getattr(offer, "image_path", None),
        })

    resp = JsonResponse({"results": data})
    # Allow simple cross-origin GETs from the static frontend
    resp["Access-Control-Allow-Origin"] = "*"
    return resp
