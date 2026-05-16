import re

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .models import Answer
from .serializers import AnswerSerializer
from notifications.models import Notification
from accounts.models import CustomUser
from config.ai_moderation import moderate_medical_content


def create_mention_notifications(text, author, context_message):
    if not text:
        return

    usernames = set(re.findall(r'@([A-Za-z0-9_]+)', text))

    for username in usernames:
        try:
            mentioned_user = CustomUser.objects.get(username=username)

            if mentioned_user.id != author.id:
                Notification.objects.create(
                    user=mentioned_user,
                    message=f"{author.username} vous a mentionné : {context_message}",
                    notification_type="MENTION"
                )

        except CustomUser.DoesNotExist:
            pass


@api_view(['GET', 'POST'])
def answer_list(request):
    if request.method == 'GET':
        answers = Answer.objects.all().order_by('-created_at')
        serializer = AnswerSerializer(answers, many=True)
        return Response(serializer.data)

    if request.method == 'POST':
        data = request.data.copy()

        text_to_moderate = f"{data.get('body', '')}\n\nRéférences : {data.get('references', '')}"
        moderation_result = moderate_medical_content(text_to_moderate)

        data["ai_moderation_status"] = moderation_result.get("status", "WARNING")
        data["ai_moderation_flagged"] = moderation_result.get("flagged", False)
        data["ai_moderation_reason"] = moderation_result.get(
            "reason",
            "Résultat IA non disponible."
        )

        serializer = AnswerSerializer(data=data)

        if serializer.is_valid():
            answer = serializer.save()

            question_author = answer.question.user

            if question_author.id != answer.author.id:
                Notification.objects.create(
                    user=question_author,
                    message=f"{answer.author.username} a répondu à votre question : {answer.question.title}",
                    notification_type="ANSWER"
                )

            create_mention_notifications(
                answer.body,
                answer.author,
                f"dans une réponse à la question : {answer.question.title}"
            )

            create_mention_notifications(
                answer.references,
                answer.author,
                f"dans les références de la réponse à : {answer.question.title}"
            )

            return Response(
                {
                    "answer": AnswerSerializer(answer).data,
                    "ai_moderation": moderation_result,
                    "message": (
                        "Réponse publiée avec avertissement IA."
                        if moderation_result.get("status") != "SAFE"
                        else "Réponse publiée avec succès."
                    )
                },
                status=status.HTTP_201_CREATED
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
def answer_detail(request, pk):
    try:
        answer = Answer.objects.get(pk=pk)

    except Answer.DoesNotExist:
        return Response(
            {"error": "Answer not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    serializer = AnswerSerializer(answer)
    return Response(serializer.data)


@api_view(['POST'])
def accept_answer(request, pk):
    user_id = request.data.get("user_id")

    try:
        answer = Answer.objects.get(pk=pk)

    except Answer.DoesNotExist:
        return Response(
            {"error": "Answer not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    question = answer.question

    if int(question.user.id) != int(user_id):
        return Response(
            {"error": "Seul l'auteur de la question peut accepter une réponse."},
            status=status.HTTP_403_FORBIDDEN
        )

    old_accepted_answer = Answer.objects.filter(
        question=question,
        is_accepted=True
    ).first()

    if old_accepted_answer and old_accepted_answer.id != answer.id:
        old_accepted_answer.is_accepted = False
        old_accepted_answer.save()

        old_author = old_accepted_answer.author
        old_author.reputation = max(0, old_author.reputation - 10)
        old_author.save()

    if not answer.is_accepted:
        answer.is_accepted = True
        answer.save()

        answer.author.reputation += 10
        answer.author.save()

        if answer.author.id != question.user.id:
            Notification.objects.create(
                user=answer.author,
                message=f"Votre réponse à la question '{question.title}' a été acceptée comme meilleure réponse.",
                notification_type="ANSWER"
            )

    serializer = AnswerSerializer(answer)
    return Response(serializer.data)