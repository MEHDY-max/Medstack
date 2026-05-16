from django.db import models
from accounts.models import CustomUser
from tags.models import Tag


class Question(models.Model):
    TYPE_CHOICES = [
        ('CLINIQUE', 'Cas clinique'),
        ('THEORIQUE', 'Question théorique'),
    ]

    CLOSE_REASON_CHOICES = [
        ('NONE', 'Aucune'),
        ('DUPLICATE', 'Dupliquée'),
        ('OFF_TOPIC', 'Hors sujet'),
        ('DANGEROUS', 'Conseil médical dangereux'),
        ('OTHER', 'Autre'),
    ]

    AI_STATUS_CHOICES = [
        ('SAFE', 'Safe'),
        ('WARNING', 'Warning'),
        ('DANGEROUS', 'Dangerous'),
    ]

    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    description = models.TextField()

    image = models.ImageField(
        upload_to='questions/',
        blank=True,
        null=True
    )

    question_type = models.CharField(
        max_length=20,
        choices=TYPE_CHOICES,
        default='THEORIQUE'
    )

    tags = models.ManyToManyField(Tag, blank=True)

    is_resolved = models.BooleanField(default=False)
    is_closed = models.BooleanField(default=False)

    close_reason = models.CharField(
        max_length=30,
        choices=CLOSE_REASON_CHOICES,
        default='NONE'
    )

    closed_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='closed_questions'
    )

    closed_at = models.DateTimeField(blank=True, null=True)

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
        return self.title