from django.urls import path
from . import views

urlpatterns = [
    path('', views.badge_list, name='badge_list'),
    path('user-badges/', views.user_badge_list, name='user_badge_list'),
]