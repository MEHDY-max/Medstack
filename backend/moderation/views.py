from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .models import Report
from .serializers import ReportSerializer


@api_view(['GET', 'POST'])
def report_list(request):
    if request.method == 'GET':
        reports = Report.objects.all().order_by('-created_at')
        serializer = ReportSerializer(reports, many=True)
        return Response(serializer.data)

    if request.method == 'POST':
        serializer = ReportSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()
            return Response(
                {"message": "Signalement envoyé avec succès", "report": serializer.data},
                status=status.HTTP_201_CREATED
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def update_report_status(request, pk):
    try:
        report = Report.objects.get(pk=pk)
    except Report.DoesNotExist:
        return Response(
            {"error": "Signalement introuvable"},
            status=status.HTTP_404_NOT_FOUND
        )

    new_status = request.data.get("status")

    if new_status not in ["PENDING", "REVIEWED", "REJECTED"]:
        return Response(
            {"error": "Statut invalide"},
            status=status.HTTP_400_BAD_REQUEST
        )

    report.status = new_status
    report.save()

    serializer = ReportSerializer(report)
    return Response(serializer.data)


@api_view(['DELETE'])
def delete_reported_content(request, pk):
    try:
        report = Report.objects.get(pk=pk)
    except Report.DoesNotExist:
        return Response(
            {"error": "Signalement introuvable"},
            status=status.HTTP_404_NOT_FOUND
        )

    if report.question:
        report.question.delete()
        report.status = "REVIEWED"
        report.save()
        return Response({"message": "Question supprimée avec succès"})

    if report.answer:
        report.answer.delete()
        report.status = "REVIEWED"
        report.save()
        return Response({"message": "Réponse supprimée avec succès"})

    if report.comment:
        report.comment.delete()
        report.status = "REVIEWED"
        report.save()
        return Response({"message": "Commentaire supprimé avec succès"})

    return Response(
        {"error": "Aucun contenu lié au signalement"},
        status=status.HTTP_400_BAD_REQUEST
    )