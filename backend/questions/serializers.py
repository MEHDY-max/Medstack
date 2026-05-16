from rest_framework import serializers
from .models import Question
from tags.models import Tag
from tags.serializers import TagSerializer


class QuestionSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(
        queryset=Question._meta.get_field("user").remote_field.model.objects.all()
    )

    user_username = serializers.CharField(source="user.username", read_only=True)
    user_role = serializers.CharField(source="user.role", read_only=True)
    user_is_verified = serializers.BooleanField(source="user.is_verified", read_only=True)

    closed_by_username = serializers.CharField(source="closed_by.username", read_only=True)

    tags = serializers.PrimaryKeyRelatedField(
        queryset=Tag.objects.all(),
        many=True,
        required=False
    )

    tag_details = TagSerializer(source="tags", many=True, read_only=True)
    tag_names = serializers.SerializerMethodField()
    tag_labels = serializers.SerializerMethodField()

    class Meta:
        model = Question
        fields = [
            'id',
            'user',
            'user_username',
            'user_role',
            'user_is_verified',
            'title',
            'description',
            'image',
            'question_type',
            'tags',
            'tag_details',
            'tag_names',
            'tag_labels',
            'is_resolved',
            'is_closed',
            'close_reason',
            'closed_by',
            'closed_by_username',
            'closed_at',
            'ai_moderation_status',
            'ai_moderation_flagged',
            'ai_moderation_reason',
            'created_at',
            'updated_at',
        ]

    def get_tag_names(self, obj):
        return [tag.name for tag in obj.tags.all()]

    def get_tag_labels(self, obj):
        labels = []

        for tag in obj.tags.all():
            if tag.code:
                labels.append(f"{tag.name} · {tag.system} {tag.code}")
            else:
                labels.append(f"{tag.name} · {tag.system}")

        return labels