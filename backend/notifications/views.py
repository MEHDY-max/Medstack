from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .models import Notification
from .serializers import NotificationSerializer


@api_view(['GET', 'POST'])
def notification_list(request):
    if request.method == 'GET':
        user_id = request.GET.get("user_id")

        if user_id:
            notifications = Notification.objects.filter(
                user_id=user_id
            ).order_by('-created_at')
        else:
            notifications = Notification.objects.all().order_by('-created_at')

        serializer = NotificationSerializer(notifications, many=True)
        return Response(serializer.data)

    if request.method == 'POST':
        serializer = NotificationSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def mark_notifications_read(request):
    user_id = request.data.get("user_id")

    if not user_id:
        return Response(
            {"error": "user_id est obligatoire."},
            status=status.HTTP_400_BAD_REQUEST
        )

    notifications = Notification.objects.filter(
        user_id=user_id,
        is_read=False
    )

    updated_count = notifications.update(is_read=True)

    return Response({
        "message": "Notifications marquées comme lues.",
        "updated_count": updated_count
    })