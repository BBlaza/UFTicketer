from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.models import User
from django.db.models import Q
from .models import Message
import json

@csrf_exempt
def send_dm(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        sender = User.objects.get(id=data['sender_id'])
        receiver = User.objects.get(id=data['receiver_id'])
        msg = Message.objects.create(sender=sender, receiver=receiver, content=data['content'])
        return JsonResponse({'id': msg.id, 'status': 'sent'})
    return JsonResponse({'error': 'POST required'}, status=400)

def get_conversation(request, user1_id, user2_id):
    messages = Message.objects.filter(
        sender_id__in=[user1_id, user2_id],
        receiver_id__in=[user1_id, user2_id]
    ).order_by('timestamp')
    data = [
        {
            'sender': m.sender.username,
            'receiver': m.receiver.username,
            'content': m.content,
            'timestamp': m.timestamp
        }
        for m in messages
    ]
    return JsonResponse(data, safe=False)

def inbox(request, user_id):
    # either sender or receiver
    messages = (
        Message.objects
        .filter(Q(sender_id=user_id) | Q(receiver_id=user_id))
        .select_related('sender', 'receiver')
        .order_by('-timestamp')
    )

    conversations = {}
    for m in messages:
        # get partner user
        partner = m.receiver if m.sender_id == user_id else m.sender
        if partner.id not in conversations:
            conversations[partner.id] = {
                "partner_id": partner.id,
                "partner_username": partner.username,
                "last_message": m.content,
                "last_timestamp": m.timestamp,
                "last_sender_id": m.sender_id,
            }

    return JsonResponse(list(conversations.values()), safe=False)
