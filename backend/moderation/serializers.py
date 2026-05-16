from rest_framework import serializers
from .models import Report


class ReportSerializer(serializers.ModelSerializer):
    reporter_username = serializers.CharField(source="user.username", read_only=True)
    question_title = serializers.CharField(source="question.title", read_only=True)
    answer_body = serializers.CharField(source="answer.body", read_only=True)
    comment_body = serializers.CharField(source="comment.body", read_only=True)

    class Meta:
        model = Report
        fields = "__all__"