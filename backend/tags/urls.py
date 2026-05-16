from django.urls import path
from . import views

urlpatterns = [
    path('', views.tag_list, name='tag_list'),
    path('followed/', views.followed_tags, name='followed_tags'),
    path('<int:tag_id>/follow/', views.follow_tag, name='follow_tag'),
    path('<int:tag_id>/unfollow/', views.unfollow_tag, name='unfollow_tag'),
]