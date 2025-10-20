from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.models import User
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
# Create your views here.
