from django.conf import settings
from django.db import models
from questions.models import Question
from answers.models import Answer
from comments.models import Comment


class Report(models.Model):

    STATUS_CHOICES = [
        ('PENDING', 'En attente'),
        ('REVIEWED', 'Vérifié'),
        ('REJECTED', 'Rejeté'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reports'
    )

    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='reports'
    )

    answer = models.ForeignKey(
        Answer,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='reports'
    )

    comment = models.ForeignKey(
        Comment,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='reports'
    )

    reason = models.TextField()

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PENDING'
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Report par {self.user.username}"