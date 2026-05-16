from django.contrib.auth import authenticate
from django.db.models import Count

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .serializers import RegisterSerializer
from .models import CustomUser, Follow

from questions.models import Question
from answers.models import Answer
from comments.models import Comment
from moderation.models import Report


@api_view(['POST'])
def register_user(request):
    serializer = RegisterSerializer(data=request.data)

    if serializer.is_valid():
        user = serializer.save()

        return Response({
            "message": "User registered successfully",
            "user_id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "specialty": user.specialty,
            "is_verified": user.is_verified,
            "reputation": user.reputation,
            "inpe_number": user.inpe_number,
            "country": user.country,
            "city": user.city,
        }, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def login_user(request):
    email = request.data.get('email')
    password = request.data.get('password')

    try:
        user_obj = CustomUser.objects.get(email=email)
    except CustomUser.DoesNotExist:
        return Response(
            {"error": "Email incorrect"},
            status=status.HTTP_400_BAD_REQUEST
        )

    user = authenticate(
        username=user_obj.username,
        password=password
    )

    if user is not None:

        questions_count = Question.objects.filter(user=user).count()
        answers_count = Answer.objects.filter(author=user).count()
        comments_count = Comment.objects.filter(author=user).count()

        followers_count = Follow.objects.filter(
            following=user
        ).count()

        following_count = Follow.objects.filter(
            follower=user
        ).count()

        return Response({
            "message": "Login successful",
            "user_id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "specialty": user.specialty,
            "is_verified": user.is_verified,
            "reputation": user.reputation,
            "inpe_number": user.inpe_number,
            "country": user.country,
            "city": user.city,

            "questions_count": questions_count,
            "answers_count": answers_count,
            "comments_count": comments_count,
            "followers_count": followers_count,
            "following_count": following_count,
        })

    return Response(
        {"error": "Mot de passe incorrect"},
        status=status.HTTP_400_BAD_REQUEST
    )


@api_view(['GET'])
def users_list(request):
    follower_id = request.GET.get("follower_id")

    users = CustomUser.objects.all()

    data = []

    for user in users:

        is_following = False

        if follower_id:
            is_following = Follow.objects.filter(
                follower_id=follower_id,
                following_id=user.id
            ).exists()

        data.append({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "specialty": user.specialty,
            "is_verified": user.is_verified,
            "reputation": user.reputation,
            "country": user.country,
            "city": user.city,
            "is_following": is_following,
        })

    return Response(data)


@api_view(['POST'])
def follow_user(request, user_id):
    follower_id = request.data.get("follower_id")

    if int(follower_id) == int(user_id):
        return Response(
            {"error": "Impossible de se suivre soi-même"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        follower = CustomUser.objects.get(id=follower_id)
        following = CustomUser.objects.get(id=user_id)

    except CustomUser.DoesNotExist:
        return Response(
            {"error": "Utilisateur introuvable"},
            status=status.HTTP_404_NOT_FOUND
        )

    follow, created = Follow.objects.get_or_create(
        follower=follower,
        following=following
    )

    if created:
        from notifications.models import Notification

        Notification.objects.create(
            user=following,
            message=f"{follower.username} vous a suivi.",
            notification_type="FOLLOW"
        )

        return Response({
            "message": "Utilisateur suivi avec succès"
        })

    return Response({
        "message": "Vous suivez déjà cet utilisateur"
    })


@api_view(['POST'])
def unfollow_user(request, user_id):
    follower_id = request.data.get("follower_id")

    Follow.objects.filter(
        follower_id=follower_id,
        following_id=user_id
    ).delete()

    return Response({
        "message": "Utilisateur retiré des suivis"
    })


@api_view(['GET'])
def admin_stats(request):

    top_users = CustomUser.objects.all().order_by('-reputation')[:5]

    countries = (
        CustomUser.objects
        .exclude(country__isnull=True)
        .exclude(country="")
        .values("country")
        .annotate(total=Count("id"))
        .order_by("-total")
    )

    cities = (
        CustomUser.objects
        .exclude(city__isnull=True)
        .exclude(city="")
        .values("city")
        .annotate(total=Count("id"))
        .order_by("-total")
    )

    unresolved_questions = Question.objects.filter(
        is_resolved=False
    ).count()

    resolved_questions = Question.objects.filter(
        is_resolved=True
    ).count()

    data = {
        "total_users": CustomUser.objects.count(),
        "patients": CustomUser.objects.filter(role="PATIENT").count(),
        "students": CustomUser.objects.filter(role="STUDENT").count(),
        "doctors": CustomUser.objects.filter(role="DOCTOR").count(),
        "verified_doctors": CustomUser.objects.filter(
            role="DOCTOR",
            is_verified=True
        ).count(),
        "moderators": CustomUser.objects.filter(
            role="MODERATOR"
        ).count(),

        "questions": Question.objects.count(),
        "resolved_questions": resolved_questions,
        "unresolved_questions": unresolved_questions,

        "answers": Answer.objects.count(),
        "comments": Comment.objects.count(),

        "reports": Report.objects.count(),
        "pending_reports": Report.objects.filter(
            status="PENDING"
        ).count(),

        "reviewed_reports": Report.objects.filter(
            status="REVIEWED"
        ).count(),

        "rejected_reports": Report.objects.filter(
            status="REJECTED"
        ).count(),

        "countries": list(countries),
        "cities": list(cities),

        "top_users": [
            {
                "id": user.id,
                "username": user.username,
                "role": user.role,
                "reputation": user.reputation,
                "is_verified": user.is_verified,
                "country": user.country,
                "city": user.city,
            }
            for user in top_users
        ]
    }

    return Response(data)