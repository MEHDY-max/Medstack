from rest_framework import serializers
from .models import Tag, TagSubscription


class TagSerializer(serializers.ModelSerializer):
    label = serializers.SerializerMethodField()
    is_following = serializers.SerializerMethodField()

    class Meta:
        model = Tag
        fields = [
            'id',
            'name',
            'system',
            'code',
            'description',
            'label',
            'is_following',
        ]

    def get_label(self, obj):
        if obj.code:
            return f"{obj.name} · {obj.system} {obj.code}"
        return f"{obj.name} · {obj.system}"

    def get_is_following(self, obj):
        user_id = self.context.get("user_id")

        if not user_id:
            return False

        return TagSubscription.objects.filter(
            user_id=user_id,
            tag=obj
        ).exists()


class TagSubscriptionSerializer(serializers.ModelSerializer):
    tag_name = serializers.CharField(source="tag.name", read_only=True)
    tag_label = serializers.SerializerMethodField()

    class Meta:
        model = TagSubscription
        fields = [
            'id',
            'user',
            'tag',
            'tag_name',
            'tag_label',
            'created_at',
        ]

    def get_tag_label(self, obj):
        if obj.tag.code:
            return f"{obj.tag.name} · {obj.tag.system} {obj.tag.code}"
        return f"{obj.tag.name} · {obj.tag.system}"