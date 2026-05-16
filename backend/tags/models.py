from django.conf import settings
from django.db import models


class Tag(models.Model):
    SYSTEM_CHOICES = [
        ('CIM10', 'CIM-10'),
        ('SNOMED', 'SNOMED CT'),
        ('SPECIALTY', 'Spécialité médicale'),
        ('OTHER', 'Autre'),
    ]

    name = models.CharField(max_length=100, unique=True)
    system = models.CharField(max_length=20, choices=SYSTEM_CHOICES, default='SPECIALTY')
    code = models.CharField(max_length=50, blank=True, null=True)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        if self.code:
            return f"{self.name} ({self.system}: {self.code})"
        return self.name


class TagSubscription(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="tag_subscriptions"
    )

    tag = models.ForeignKey(
        Tag,
        on_delete=models.CASCADE,
        related_name="subscribers"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "tag")

    def __str__(self):
        return f"{self.user.username} suit {self.tag.name}"