from django.conf import settings
from django.db import models
from questions.models import Question
from answers.models import Answer


class Comment(models.Model):
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='comments'
    )

    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name='comments',
        blank=True,
        null=True
    )

    answer = models.ForeignKey(
        Answer,
        on_delete=models.CASCADE,
        related_name='comments',
        blank=True,
        null=True
    )

    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        related_name='replies',
        blank=True,
        null=True
    )

    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Commentaire de {self.author.username}"