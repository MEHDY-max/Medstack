import re

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .models import Comment
from .serializers import CommentSerializer
from notifications.models import Notification
from accounts.models import CustomUser


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
def comment_list(request):
    if request.method == 'GET':
        question_id = request.GET.get("question")
        answer_id = request.GET.get("answer")

        comments = Comment.objects.filter(parent__isnull=True).order_by('-created_at')

        if question_id:
            comments = comments.filter(question_id=question_id)

        if answer_id:
            comments = comments.filter(answer_id=answer_id)

        serializer = CommentSerializer(comments, many=True)
        return Response(serializer.data)

    if request.method == 'POST':
        serializer = CommentSerializer(data=request.data)

        if serializer.is_valid():
            comment = serializer.save()

            if comment.parent:
                target_user = comment.parent.author

                if target_user.id != comment.author.id:
                    Notification.objects.create(
                        user=target_user,
                        message=f"{comment.author.username} a répondu à votre commentaire.",
                        notification_type="COMMENT"
                    )

                create_mention_notifications(
                    comment.body,
                    comment.author,
                    "dans une réponse à un commentaire."
                )

            elif comment.question:
                target_user = comment.question.user

                if target_user.id != comment.author.id:
                    Notification.objects.create(
                        user=target_user,
                        message=f"{comment.author.username} a commenté votre question : {comment.question.title}",
                        notification_type="COMMENT"
                    )

                create_mention_notifications(
                    comment.body,
                    comment.author,
                    f"dans un commentaire sur la question : {comment.question.title}"
                )

            elif comment.answer:
                target_user = comment.answer.author

                if target_user.id != comment.author.id:
                    Notification.objects.create(
                        user=target_user,
                        message=f"{comment.author.username} a commenté votre réponse.",
                        notification_type="COMMENT"
                    )

                create_mention_notifications(
                    comment.body,
                    comment.author,
                    "dans un commentaire sur une réponse."
                )

            return Response(CommentSerializer(comment).data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)