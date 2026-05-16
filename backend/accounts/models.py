from django.contrib.auth.models import AbstractUser
from django.db import models


class CustomUser(AbstractUser):

    ROLE_CHOICES = [
        ('PATIENT', 'Patient'),
        ('STUDENT', 'Student'),
        ('DOCTOR', 'Doctor'),
        ('MODERATOR', 'Moderator'),
    ]

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='PATIENT')
    is_verified = models.BooleanField(default=False)
    specialty = models.CharField(max_length=100, blank=True, null=True)
    reputation = models.IntegerField(default=0)
    inpe_number = models.CharField(max_length=50, blank=True, null=True)
    diploma_file = models.FileField(upload_to='diplomas/', blank=True, null=True)

    country = models.CharField(max_length=100, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return self.username


class Follow(models.Model):
    follower = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name="following"
    )

    following = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name="followers"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("follower", "following")

    def __str__(self):
        return f"{self.follower.username} suit {self.following.username}"