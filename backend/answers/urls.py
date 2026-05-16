from django.urls import path
from . import views

urlpatterns = [
    path('', views.answer_list, name='answer_list'),
    path('<int:pk>/', views.answer_detail, name='answer_detail'),
    path('<int:pk>/accept/', views.accept_answer, name='accept_answer'),
]