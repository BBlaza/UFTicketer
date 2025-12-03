from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET
from django.contrib.auth.models import User
from django.db.models import Q
from .models import Message
import json

@csrf_exempt
def send_dm(request):
    """Send a direct message. Requires authentication."""
    if not request.user.is_authenticated:
        resp = JsonResponse({'success': False, 'error': 'Authentication required'}, status=401)
        resp["Access-Control-Allow-Origin"] = "*"
        return resp
    
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            receiver_id = data.get('receiver_id')
            content = data.get('content', '').strip()
            
            if not receiver_id:
                resp = JsonResponse({'success': False, 'error': 'Receiver ID is required'}, status=400)
                resp["Access-Control-Allow-Origin"] = "*"
                return resp
            
            if not content:
                resp = JsonResponse({'success': False, 'error': 'Message content is required'}, status=400)
                resp["Access-Control-Allow-Origin"] = "*"
                return resp
            
            try:
                receiver = User.objects.get(id=receiver_id)
            except User.DoesNotExist:
                resp = JsonResponse({'success': False, 'error': 'Receiver not found'}, status=404)
                resp["Access-Control-Allow-Origin"] = "*"
                return resp
            
            msg = Message.objects.create(sender=request.user, receiver=receiver, content=content)
            
            resp = JsonResponse({
                'success': True,
                'id': msg.id,
                'status': 'sent',
                'message': {
                    'id': msg.id,
                    'sender': msg.sender.username,
                    'sender_id': msg.sender.id,
                    'receiver': msg.receiver.username,
                    'receiver_id': msg.receiver.id,
                    'content': msg.content,
                    'timestamp': msg.timestamp.isoformat()
                }
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
    
    resp = JsonResponse({'success': False, 'error': 'POST required'}, status=400)
    resp["Access-Control-Allow-Origin"] = "*"
    return resp

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


@csrf_exempt
@require_GET
def get_conversations(request):
    """Get list of users the current user has conversations with."""
    if not request.user.is_authenticated:
        resp = JsonResponse({'success': False, 'error': 'Authentication required'}, status=401)
        resp["Access-Control-Allow-Origin"] = "*"
        return resp
    
    try:
        # Get all messages where user is sender or receiver
        messages = Message.objects.filter(
            Q(sender=request.user) | Q(receiver=request.user)
        ).select_related('sender', 'receiver').order_by('-timestamp')
        
        # Build conversations dict with latest message info
        conversations = {}
        for msg in messages:
            # Determine the other user in the conversation
            partner = msg.receiver if msg.sender.id == request.user.id else msg.sender
            
            # Only add if we haven't seen this partner yet (or if this is a newer message)
            if partner.id not in conversations:
                conversations[partner.id] = {
                    'partner_id': partner.id,
                    'partner_username': partner.username,
                    'last_message': msg.content,
                    'last_timestamp': msg.timestamp.isoformat(),
                    'last_sender_id': msg.sender.id
                }
        
        resp = JsonResponse({
            'success': True,
            'conversations': list(conversations.values())
        }, safe=False)
        resp["Access-Control-Allow-Origin"] = "*"
        return resp
    except Exception as e:
        resp = JsonResponse({'success': False, 'error': str(e)}, status=500)
        resp["Access-Control-Allow-Origin"] = "*"
        return resp


@csrf_exempt
@require_GET
def get_conversation_messages(request, partner_id):
    """Get all messages between current user and a specific partner."""
    if not request.user.is_authenticated:
        resp = JsonResponse({'success': False, 'error': 'Authentication required'}, status=401)
        resp["Access-Control-Allow-Origin"] = "*"
        return resp
    
    try:
        # Get partner user
        try:
            partner = User.objects.get(id=partner_id)
        except User.DoesNotExist:
            resp = JsonResponse({'success': False, 'error': 'User not found'}, status=404)
            resp["Access-Control-Allow-Origin"] = "*"
            return resp
        
        # Get all messages between current user and partner
        messages = Message.objects.filter(
            Q(sender=request.user, receiver=partner) | Q(sender=partner, receiver=request.user)
        ).select_related('sender', 'receiver').order_by('timestamp')
        
        messages_data = []
        for msg in messages:
            messages_data.append({
                'id': msg.id,
                'sender': msg.sender.username,
                'sender_id': msg.sender.id,
                'receiver': msg.receiver.username,
                'receiver_id': msg.receiver.id,
                'content': msg.content,
                'timestamp': msg.timestamp.isoformat(),
                'is_sent': msg.sender.id == request.user.id
            })
        
        resp = JsonResponse({
            'success': True,
            'partner_username': partner.username,
            'messages': messages_data
        }, safe=False)
        resp["Access-Control-Allow-Origin"] = "*"
        return resp
    except Exception as e:
        resp = JsonResponse({'success': False, 'error': str(e)}, status=500)
        resp["Access-Control-Allow-Origin"] = "*"
        return resp

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


@csrf_exempt
@require_GET
def get_all_messages(request):
    """Get all messages for the currently authenticated user."""
    if not request.user.is_authenticated:
        resp = JsonResponse({'success': False, 'error': 'Authentication required'}, status=401)
        resp["Access-Control-Allow-Origin"] = "*"
        return resp
    
    try:
        # Get all messages where user is sender or receiver
        messages = Message.objects.filter(
            Q(sender=request.user) | Q(receiver=request.user)
        ).select_related('sender', 'receiver').order_by('-timestamp')
        
        messages_data = []
        for msg in messages:
            messages_data.append({
                'id': msg.id,
                'sender': msg.sender.username,
                'sender_id': msg.sender.id,
                'receiver': msg.receiver.username,
                'receiver_id': msg.receiver.id,
                'content': msg.content,
                'timestamp': msg.timestamp.isoformat(),
                'is_sent': msg.sender.id == request.user.id  # True if current user sent it
            })
        
        resp = JsonResponse({
            'success': True,
            'messages': messages_data
        }, safe=False)
        resp["Access-Control-Allow-Origin"] = "*"
        return resp
    except Exception as e:
        resp = JsonResponse({'success': False, 'error': str(e)}, status=500)
        resp["Access-Control-Allow-Origin"] = "*"
        return resp
