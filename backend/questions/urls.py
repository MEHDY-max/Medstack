from django.urls import path
from . import views

urlpatterns = [
    path('', views.question_list, name='question_list'),
    path('similar/', views.similar_questions, name='similar_questions'),
    path('<int:pk>/', views.question_detail, name='question_detail'),
    path('<int:pk>/answers/', views.question_answers, name='question_answers'),
    path('<int:pk>/update-tags/', views.update_question_tags, name='update_question_tags'),
    path('<int:pk>/close/', views.close_question, name='close_question'),
    path('<int:pk>/reopen/', views.reopen_question, name='reopen_question'),
]