from django.conf import settings
from django.db import models


class Notification(models.Model):

    NOTIFICATION_TYPE = [
        ('ANSWER', 'Réponse'),
        ('VOTE', 'Vote'),
        ('COMMENT', 'Commentaire'),
        ('FOLLOW', 'Follow'),
        ('MENTION', 'Mention'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )

    message = models.TextField()

    notification_type = models.CharField(
        max_length=20,
        choices=NOTIFICATION_TYPE
    )

    is_read = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Notification pour {self.user.username}"