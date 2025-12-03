from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.models import User
from django.db.models import Q
from .models import Message
import json

@csrf_exempt
def send_dm(request):
    try:
        data = json.loads(request.body)

        sender_id = data.get('sender_id')
        receiver_id = data.get('receiver_id')
        content = (data.get('content') or '').strip()

        # Basic validation
        if not sender_id:
            return JsonResponse(
                {'success': False, 'error': 'Missing sender'},
                status=400
            )
        elif not receiver_id:
            return JsonResponse(
                {'success': False, 'error': 'Missing receiver'},
                status=400
        )
        elif not content:
            return JsonResponse(
                {'success': False, 'error': 'Missing content'},
                status=400
        )

        # Lookup auth users
        sender = User.objects.get(id=sender_id)
        receiver = User.objects.get(id=receiver_id)

        msg = Message.objects.create(
            sender=sender,
            receiver=receiver,
            content=content,
        )

        return JsonResponse({
            'success': True,
            'id': msg.id,
            'sender': sender.username,
            'receiver': receiver.username,
            'content': msg.content,
        })

    except User.DoesNotExist:
        return JsonResponse(
            {'success': False, 'error': 'Invalid sender or receiver id'},
            status=400
        )
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        # debugging purpose
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

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
