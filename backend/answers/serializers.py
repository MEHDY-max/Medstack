from rest_framework import serializers
from .models import Answer


class AnswerSerializer(serializers.ModelSerializer):
    vote_score = serializers.SerializerMethodField()
    author_username = serializers.CharField(source="author.username", read_only=True)

    class Meta:
        model = Answer
        fields = [
            'id',
            'question',
            'author',
            'author_username',
            'body',
            'references',
            'is_accepted',
            'ai_moderation_status',
            'ai_moderation_flagged',
            'ai_moderation_reason',
            'created_at',
            'updated_at',
            'vote_score',
        ]

    def get_vote_score(self, obj):
        return sum(vote.value for vote in obj.votes.all())