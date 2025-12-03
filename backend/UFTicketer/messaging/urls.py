from django.urls import path
from . import views

urlpatterns = [
    path('send/', views.send_dm, name='send_dm'),
    path('conversation/<int:user1_id>/<int:user2_id>/', views.get_conversation, name='get_conversation'),
    path('inbox/<int:user_id>/', views.inbox, name='inbox'),
    path('all/', views.get_all_messages, name='get_all_messages'),
    path('conversations/', views.get_conversations, name='get_conversations'),
    path('conversation/<int:partner_id>/', views.get_conversation_messages, name='get_conversation_messages'),
]