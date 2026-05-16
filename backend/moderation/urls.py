from django.urls import path
from . import views

urlpatterns = [
    path('reports/', views.report_list, name='report_list'),
    path('reports/<int:pk>/status/', views.update_report_status, name='update_report_status'),
    path('reports/<int:pk>/delete-content/', views.delete_reported_content, name='delete_reported_content'),
]