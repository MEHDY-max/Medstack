from django.conf import settings
from django.db import models
from answers.models import Answer


class Vote(models.Model):

    VOTE_CHOICES = [
        (1, 'Vote positif'),
        (-1, 'Vote négatif'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='votes'
    )

    answer = models.ForeignKey(
        Answer,
        on_delete=models.CASCADE,
        related_name='votes'
    )

    value = models.IntegerField(choices=VOTE_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'answer')

    def __str__(self):
        return f"{self.user.username} vote {self.value} sur réponse {self.answer.id}"