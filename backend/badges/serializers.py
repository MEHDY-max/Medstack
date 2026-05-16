from rest_framework import serializers
from .models import Badge, UserBadge


class BadgeSerializer(serializers.ModelSerializer):

    class Meta:
        model = Badge
        fields = '__all__'


class UserBadgeSerializer(serializers.ModelSerializer):

    badge_name = serializers.CharField(
        source="badge.name",
        read_only=True
    )

    badge_description = serializers.CharField(
        source="badge.description",
        read_only=True
    )

    class Meta:
        model = UserBadge
        fields = [
            'id',
            'user',
            'badge',
            'badge_name',
            'badge_description',
            'assigned_at',
        ]