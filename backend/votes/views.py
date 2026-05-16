from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .models import Vote
from .serializers import VoteSerializer
from answers.models import Answer
from accounts.models import CustomUser
from notifications.models import Notification


def apply_reputation_change(author, value):
    if value == 1:
        author.reputation += 5
    elif value == -1:
        author.reputation = max(0, author.reputation - 2)

    author.save()


def reverse_reputation_change(author, old_value):
    if old_value == 1:
        author.reputation = max(0, author.reputation - 5)
    elif old_value == -1:
        author.reputation += 2

    author.save()


@api_view(['GET', 'POST'])
def vote_list(request):
    if request.method == 'GET':
        votes = Vote.objects.all().order_by('-created_at')
        serializer = VoteSerializer(votes, many=True)
        return Response(serializer.data)

    if request.method == 'POST':
        user_id = request.data.get("user")
        answer_id = request.data.get("answer")
        value = request.data.get("value")

        try:
            value = int(value)
        except (TypeError, ValueError):
            return Response(
                {"error": "Valeur du vote invalide."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if value not in [1, -1]:
            return Response(
                {"error": "Le vote doit être 1 ou -1."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            voter = CustomUser.objects.get(id=user_id)
        except CustomUser.DoesNotExist:
            return Response(
                {"error": "Utilisateur introuvable."},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            answer = Answer.objects.get(id=answer_id)
        except Answer.DoesNotExist:
            return Response(
                {"error": "Réponse introuvable."},
                status=status.HTTP_404_NOT_FOUND
            )

        answer_author = answer.author

        vote, created = Vote.objects.get_or_create(
            user=voter,
            answer=answer,
            defaults={"value": value}
        )

        if created:
            if answer_author.id != voter.id:
                apply_reputation_change(answer_author, value)

                if value == 1:
                    message = f"{voter.username} a aimé votre réponse. (+5 réputation)"
                else:
                    message = f"{voter.username} n'a pas aimé votre réponse. (-2 réputation)"

                Notification.objects.create(
                    user=answer_author,
                    message=message,
                    notification_type="VOTE"
                )

            serializer = VoteSerializer(vote)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        old_value = vote.value

        if old_value == value:
            serializer = VoteSerializer(vote)
            return Response({
                "message": "Vous avez déjà effectué ce vote.",
                "vote": serializer.data
            }, status=status.HTTP_200_OK)

        if answer_author.id != voter.id:
            reverse_reputation_change(answer_author, old_value)
            apply_reputation_change(answer_author, value)

            Notification.objects.create(
                user=answer_author,
                message=f"{voter.username} a modifié son vote sur votre réponse.",
                notification_type="VOTE"
            )

        vote.value = value
        vote.save()

        serializer = VoteSerializer(vote)
        return Response({
            "message": "Vote modifié avec succès.",
            "vote": serializer.data
        }, status=status.HTTP_200_OK)