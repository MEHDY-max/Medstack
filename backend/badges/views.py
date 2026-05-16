from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Badge, UserBadge
from .serializers import BadgeSerializer, UserBadgeSerializer

from accounts.models import CustomUser


def assign_badges(user):

    beginner_badge, _ = Badge.objects.get_or_create(
        name="Débutant",
        defaults={
            "description": "Premier niveau de participation.",
            "min_reputation": 0
        }
    )

    expert_badge, _ = Badge.objects.get_or_create(
        name="Expert",
        defaults={
            "description": "Utilisateur expérimenté avec forte réputation.",
            "min_reputation": 50
        }
    )

    medical_reference_badge, _ = Badge.objects.get_or_create(
        name="Référence Médicale",
        defaults={
            "description": "Médecin vérifié reconnu par la communauté.",
            "min_reputation": 100
        }
    )

    moderator_badge, _ = Badge.objects.get_or_create(
        name="Modérateur communautaire",
        defaults={
            "description": "Responsable de la modération.",
            "min_reputation": 0
        }
    )

    if user.reputation >= 0:
        UserBadge.objects.get_or_create(
            user=user,
            badge=beginner_badge
        )

    if user.reputation >= 50:
        UserBadge.objects.get_or_create(
            user=user,
            badge=expert_badge
        )

    if (
        user.role == "DOCTOR"
        and user.is_verified
        and user.reputation >= 100
    ):
        UserBadge.objects.get_or_create(
            user=user,
            badge=medical_reference_badge
        )

    if user.role == "MODERATOR":
        UserBadge.objects.get_or_create(
            user=user,
            badge=moderator_badge
        )


@api_view(['GET'])
def badge_list(request):

    for user in CustomUser.objects.all():
        assign_badges(user)

    badges = Badge.objects.all()

    serializer = BadgeSerializer(badges, many=True)

    return Response(serializer.data)


@api_view(['GET'])
def user_badge_list(request):

    for user in CustomUser.objects.all():
        assign_badges(user)

    user_id = request.GET.get("user_id")

    badges = UserBadge.objects.all()

    if user_id:
        badges = badges.filter(user_id=user_id)

    serializer = UserBadgeSerializer(
        badges,
        many=True
    )

    return Response(serializer.data)