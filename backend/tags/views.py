from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .models import Tag, TagSubscription
from .serializers import TagSerializer, TagSubscriptionSerializer
from accounts.models import CustomUser


@api_view(['GET', 'POST'])
def tag_list(request):
    if request.method == 'GET':
        system = request.GET.get("system")
        search = request.GET.get("search", "")
        user_id = request.GET.get("user_id")

        tags = Tag.objects.all().order_by('name')

        if system:
            tags = tags.filter(system=system)

        if search:
            tags = tags.filter(name__icontains=search)

        serializer = TagSerializer(
            tags,
            many=True,
            context={"user_id": user_id}
        )
        return Response(serializer.data)

    if request.method == 'POST':
        serializer = TagSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
def followed_tags(request):
    user_id = request.GET.get("user_id")

    if not user_id:
        return Response(
            {"error": "user_id est obligatoire."},
            status=status.HTTP_400_BAD_REQUEST
        )

    subscriptions = TagSubscription.objects.filter(
        user_id=user_id
    ).select_related("tag").order_by("-created_at")

    serializer = TagSubscriptionSerializer(subscriptions, many=True)
    return Response(serializer.data)


@api_view(['POST'])
def follow_tag(request, tag_id):
    user_id = request.data.get("user_id")

    if not user_id:
        return Response(
            {"error": "user_id est obligatoire."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        user = CustomUser.objects.get(id=user_id)
    except CustomUser.DoesNotExist:
        return Response(
            {"error": "Utilisateur introuvable."},
            status=status.HTTP_404_NOT_FOUND
        )

    try:
        tag = Tag.objects.get(id=tag_id)
    except Tag.DoesNotExist:
        return Response(
            {"error": "Tag introuvable."},
            status=status.HTTP_404_NOT_FOUND
        )

    subscription, created = TagSubscription.objects.get_or_create(
        user=user,
        tag=tag
    )

    return Response({
        "message": "Tag suivi avec succès." if created else "Tag déjà suivi.",
        "is_following": True,
        "subscription_id": subscription.id,
    })


@api_view(['POST'])
def unfollow_tag(request, tag_id):
    user_id = request.data.get("user_id")

    if not user_id:
        return Response(
            {"error": "user_id est obligatoire."},
            status=status.HTTP_400_BAD_REQUEST
        )

    deleted_count, _ = TagSubscription.objects.filter(
        user_id=user_id,
        tag_id=tag_id
    ).delete()

    return Response({
        "message": "Tag retiré des abonnements." if deleted_count else "Tag non suivi.",
        "is_following": False,
    })