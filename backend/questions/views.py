from django.utils import timezone
from datetime import timedelta

from rest_framework.decorators import api_view, parser_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from django.db.models import Q
from django.core.paginator import Paginator

from .models import Question
from .serializers import QuestionSerializer
from answers.models import Answer
from answers.serializers import AnswerSerializer
from accounts.models import CustomUser
from tags.models import Tag
from notifications.models import Notification
from config.ai_moderation import moderate_medical_content


def can_edit_tags(user):
    return user.reputation >= 50 or user.role == "MODERATOR"


def can_close_question(user):
    return (
        user.reputation >= 100
        or user.role == "MODERATOR"
        or (user.role == "DOCTOR" and user.is_verified)
    )


@api_view(['GET', 'POST'])
@parser_classes([MultiPartParser, FormParser])
def question_list(request):
    if request.method == 'GET':
        tag_id = request.GET.get("tag")
        user_id = request.GET.get("user_id")
        search = request.GET.get("search", "")
        page = int(request.GET.get("page", 1))

        question_type = request.GET.get("question_type", "")
        specialty = request.GET.get("specialty", "")
        status_filter = request.GET.get("status", "")
        date_filter = request.GET.get("date", "")
        personalized_user_id = request.GET.get("personalized_user_id", "")

        questions = Question.objects.all().order_by('-created_at')

        if user_id:
            questions = questions.filter(user_id=user_id)

        if personalized_user_id:
            try:
                user = CustomUser.objects.get(id=personalized_user_id)

                if user.specialty:
                    questions = questions.filter(
                        Q(user__specialty__icontains=user.specialty) |
                        Q(tags__name__icontains=user.specialty) |
                        Q(description__icontains=user.specialty) |
                        Q(title__icontains=user.specialty)
                    ).distinct()

            except CustomUser.DoesNotExist:
                pass

        if tag_id:
            questions = questions.filter(tags__id=tag_id)

        if search:
            questions = questions.filter(
                Q(title__icontains=search) |
                Q(description__icontains=search) |
                Q(question_type__icontains=search) |
                Q(tags__name__icontains=search) |
                Q(user__specialty__icontains=search)
            ).distinct()

        if question_type:
            questions = questions.filter(question_type=question_type)

        if specialty:
            questions = questions.filter(user__specialty__icontains=specialty)

        if status_filter == "resolved":
            questions = questions.filter(is_resolved=True)

        elif status_filter == "open":
            questions = questions.filter(is_resolved=False, is_closed=False)

        elif status_filter == "closed":
            questions = questions.filter(is_closed=True)

        today = timezone.now()

        if date_filter == "today":
            start_date = today.replace(hour=0, minute=0, second=0, microsecond=0)
            questions = questions.filter(created_at__gte=start_date)

        elif date_filter == "week":
            start_date = today - timedelta(days=7)
            questions = questions.filter(created_at__gte=start_date)

        elif date_filter == "month":
            start_date = today - timedelta(days=30)
            questions = questions.filter(created_at__gte=start_date)

        elif date_filter == "year":
            start_date = today - timedelta(days=365)
            questions = questions.filter(created_at__gte=start_date)

        paginator = Paginator(questions, 5)
        page_obj = paginator.get_page(page)

        serializer = QuestionSerializer(page_obj, many=True)

        return Response({
            "questions": serializer.data,
            "total_pages": paginator.num_pages,
            "current_page": page_obj.number,
            "total_questions": paginator.count,
        })

    if request.method == 'POST':
        data = request.data.copy()

        text_to_moderate = f"{data.get('title', '')}\n\n{data.get('description', '')}"
        moderation_result = moderate_medical_content(text_to_moderate)

        data["ai_moderation_status"] = moderation_result.get("status", "WARNING")
        data["ai_moderation_flagged"] = moderation_result.get("flagged", False)
        data["ai_moderation_reason"] = moderation_result.get(
            "reason",
            "Résultat IA non disponible."
        )

        if moderation_result.get("status") == "DANGEROUS":
            data["is_closed"] = True
            data["close_reason"] = "DANGEROUS"

        serializer = QuestionSerializer(data=data)

        if serializer.is_valid():
            question = serializer.save()

            subscribers = CustomUser.objects.filter(
                tag_subscriptions__tag__in=question.tags.all()
            ).exclude(id=question.user.id).distinct()

            for subscriber in subscribers:
                Notification.objects.create(
                    user=subscriber,
                    message=f"Nouvelle question dans un tag que vous suivez : {question.title}",
                    notification_type="FOLLOW"
                )

            return Response(
                {
                    "question": QuestionSerializer(question).data,
                    "ai_moderation": moderation_result,
                    "message": (
                        "Question publiée avec avertissement IA."
                        if moderation_result.get("status") != "SAFE"
                        else "Question publiée avec succès."
                    )
                },
                status=status.HTTP_201_CREATED
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
def similar_questions(request):
    query = request.GET.get("q", "").strip()

    if not query or len(query) < 4:
        return Response([])

    words = query.split()

    search_filter = (
        Q(title__icontains=query) |
        Q(description__icontains=query) |
        Q(tags__name__icontains=query) |
        Q(user__specialty__icontains=query)
    )

    for word in words:
        if len(word) >= 3:
            search_filter |= Q(title__icontains=word)
            search_filter |= Q(description__icontains=word)
            search_filter |= Q(tags__name__icontains=word)
            search_filter |= Q(user__specialty__icontains=word)

    questions = (
        Question.objects
        .filter(search_filter)
        .distinct()
        .order_by('-created_at')[:5]
    )

    serializer = QuestionSerializer(questions, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def question_detail(request, pk):
    try:
        question = Question.objects.get(pk=pk)

    except Question.DoesNotExist:
        return Response(
            {"error": "Question not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    serializer = QuestionSerializer(question)
    return Response(serializer.data)


@api_view(['GET'])
def question_answers(request, pk):
    try:
        question = Question.objects.get(pk=pk)

    except Question.DoesNotExist:
        return Response(
            {"error": "Question not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    answers = Answer.objects.filter(question=question).order_by('-created_at')
    serializer = AnswerSerializer(answers, many=True)
    return Response(serializer.data)


@api_view(['POST'])
def update_question_tags(request, pk):
    user_id = request.data.get("user_id")
    tag_ids = request.data.get("tags", [])

    try:
        user = CustomUser.objects.get(id=user_id)

    except CustomUser.DoesNotExist:
        return Response(
            {"error": "Utilisateur introuvable."},
            status=status.HTTP_404_NOT_FOUND
        )

    try:
        question = Question.objects.get(pk=pk)

    except Question.DoesNotExist:
        return Response(
            {"error": "Question introuvable."},
            status=status.HTTP_404_NOT_FOUND
        )

    if not can_edit_tags(user):
        return Response(
            {
                "error": "Permission refusée. Il faut au moins 50 points de réputation ou être modérateur pour modifier les tags."
            },
            status=status.HTTP_403_FORBIDDEN
        )

    tags = Tag.objects.filter(id__in=tag_ids)
    question.tags.set(tags)
    question.save()

    serializer = QuestionSerializer(question)

    return Response({
        "message": "Tags modifiés avec succès.",
        "question": serializer.data
    })


@api_view(['POST'])
def close_question(request, pk):
    user_id = request.data.get("user_id")
    reason = request.data.get("reason", "OTHER")

    if reason not in ["DUPLICATE", "OFF_TOPIC", "DANGEROUS", "OTHER"]:
        reason = "OTHER"

    try:
        user = CustomUser.objects.get(id=user_id)

    except CustomUser.DoesNotExist:
        return Response(
            {"error": "Utilisateur introuvable."},
            status=status.HTTP_404_NOT_FOUND
        )

    try:
        question = Question.objects.get(pk=pk)

    except Question.DoesNotExist:
        return Response(
            {"error": "Question introuvable."},
            status=status.HTTP_404_NOT_FOUND
        )

    if not can_close_question(user):
        return Response(
            {
                "error": "Permission refusée. Il faut 100 points, être médecin vérifié ou modérateur pour fermer une question."
            },
            status=status.HTTP_403_FORBIDDEN
        )

    question.is_closed = True
    question.close_reason = reason
    question.closed_by = user
    question.closed_at = timezone.now()
    question.save()

    serializer = QuestionSerializer(question)

    return Response({
        "message": "Question fermée avec succès.",
        "question": serializer.data
    })


@api_view(['POST'])
def reopen_question(request, pk):
    user_id = request.data.get("user_id")

    try:
        user = CustomUser.objects.get(id=user_id)

    except CustomUser.DoesNotExist:
        return Response(
            {"error": "Utilisateur introuvable."},
            status=status.HTTP_404_NOT_FOUND
        )

    try:
        question = Question.objects.get(pk=pk)

    except Question.DoesNotExist:
        return Response(
            {"error": "Question introuvable."},
            status=status.HTTP_404_NOT_FOUND
        )

    if user.role != "MODERATOR":
        return Response(
            {"error": "Seul un modérateur peut rouvrir une question."},
            status=status.HTTP_403_FORBIDDEN
        )

    question.is_closed = False
    question.close_reason = "NONE"
    question.closed_by = None
    question.closed_at = None
    question.save()

    serializer = QuestionSerializer(question)

    return Response({
        "message": "Question rouverte avec succès.",
        "question": serializer.data
    })