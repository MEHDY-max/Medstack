from django.urls import path
from . import views

urlpatterns = [
    path('', views.vote_list, name='vote_list'),
]