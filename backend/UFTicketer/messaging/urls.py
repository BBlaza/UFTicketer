from django.urls import path
from . import views

urlpatterns = [
    path('send/', views.send_dm, name='send_dm'),
    path('conversation/<int:user1_id>/<int:user2_id>/', views.get_conversation, name='get_conversation'),
]