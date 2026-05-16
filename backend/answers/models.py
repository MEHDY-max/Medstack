from django.conf import settings
from django.db import models
from questions.models import Question


class Answer(models.Model):
    AI_STATUS_CHOICES = [
        ('SAFE', 'Safe'),
        ('WARNING', 'Warning'),
        ('DANGEROUS', 'Dangerous'),
    ]

    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name='answers'
    )

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='answers'
    )

    body = models.TextField()

    references = models.TextField(
        blank=True,
        null=True,
        help_text="Références bibliographiques ou sources médicales utilisées."
    )

    is_accepted = models.BooleanField(default=False)

    ai_moderation_status = models.CharField(
        max_length=20,
        choices=AI_STATUS_CHOICES,
        default='SAFE'
    )

    ai_moderation_flagged = models.BooleanField(default=False)

    ai_moderation_reason = models.TextField(
        blank=True,
        null=True
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Réponse de {self.author.username} à {self.question.title}"