import Navbar from "../components/Navbar";
import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type User = {
  user_id: number;
  username: string;
  role: string;
};

type Report = {
  id: number;
  reporter_username: string;
  reason: string;
  status: string;
  question_title?: string | null;
  answer_body?: string | null;
  comment_body?: string | null;
};

function getStoredUser(): User | null {
  const storedUser = localStorage.getItem("user");

  if (!storedUser) return null;

  try {
    return JSON.parse(storedUser) as User;
  } catch {
    return null;
  }
}

function ModeratorDashboard() {
  const user = getStoredUser();
  const queryClient = useQueryClient();

  const reportsQuery = useQuery<Report[]>({
    queryKey: ["moderationReports"],
    queryFn: async () => {
      const response = await axios.get<Report[]>(
        "http://127.0.0.1:8000/api/moderation/reports/"
      );

      return response.data;
    },
    enabled: !!user && (user.role === "MODERATOR" || user.role === "DOCTOR"),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      reportId,
      newStatus,
    }: {
      reportId: number;
      newStatus: string;
    }) => {
      await axios.post(
        `http://127.0.0.1:8000/api/moderation/reports/${reportId}/status/`,
        { status: newStatus }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["moderationReports"] });
    },
  });

  const deleteContentMutation = useMutation({
    mutationFn: async (reportId: number) => {
      await axios.delete(
        `http://127.0.0.1:8000/api/moderation/reports/${reportId}/delete-content/`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["moderationReports"] });
    },
  });

  if (!user) {
    return (
      <>
        <Navbar />
        <div className="container">
          <div className="panel empty-state">Vous devez vous connecter.</div>
        </div>
      </>
    );
  }

  if (user.role !== "MODERATOR" && user.role !== "DOCTOR") {
    return (
      <>
        <Navbar />
        <div className="container">
          <div className="panel empty-state">Accès refusé.</div>
        </div>
      </>
    );
  }

  const updateStatus = (reportId: number, newStatus: string) => {
    updateStatusMutation.mutate({ reportId, newStatus });
  };

  const deleteContent = (reportId: number) => {
    if (!window.confirm("Supprimer ce contenu ?")) return;

    deleteContentMutation.mutate(reportId);
  };

  const getReportedContent = (report: Report) => {
    if (report.question_title) return `Question : ${report.question_title}`;
    if (report.answer_body) return `Réponse : ${report.answer_body}`;
    if (report.comment_body) return `Commentaire : ${report.comment_body}`;
    return "Contenu inconnu";
  };

  const reports = reportsQuery.data || [];

  return (
    <>
      <Navbar />

      <div className="container wide">
        <div className="page-head">
          <div>
            <h1>Dashboard Modération</h1>
            <p>Gestion des contenus signalés par les utilisateurs.</p>
          </div>
        </div>

        {reportsQuery.isLoading ? (
          <div className="panel empty-state">Chargement des signalements...</div>
        ) : reportsQuery.isError ? (
          <div className="panel empty-state">
            Erreur lors du chargement des signalements.
          </div>
        ) : reports.length === 0 ? (
          <div className="panel empty-state">
            Aucun signalement pour le moment.
          </div>
        ) : (
          reports.map((report) => (
            <div key={report.id} className="moderation-card panel">
              <div className="moderation-top">
                <strong>{getReportedContent(report)}</strong>
                <span className={`report-status ${report.status.toLowerCase()}`}>
                  {report.status}
                </span>
              </div>

              <p>
                <strong>Signalé par :</strong> {report.reporter_username}
              </p>

              <p>
                <strong>Raison :</strong> {report.reason}
              </p>

              <div className="moderation-actions">
                <button
                  className="secondary-btn"
                  onClick={() => updateStatus(report.id, "REVIEWED")}
                  disabled={updateStatusMutation.isPending}
                >
                  Marquer vérifié
                </button>

                <button
                  className="secondary-btn"
                  onClick={() => updateStatus(report.id, "REJECTED")}
                  disabled={updateStatusMutation.isPending}
                >
                  Rejeter
                </button>

                <button
                  className="danger-btn"
                  onClick={() => deleteContent(report.id)}
                  disabled={deleteContentMutation.isPending}
                >
                  Supprimer contenu
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

export default ModeratorDashboard;