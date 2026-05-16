import Navbar from "../components/Navbar";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";

type User = {
  user_id: number;
  username: string;
  role: string;
};

type TopUser = {
  id: number;
  username: string;
  role: string;
  reputation: number;
  is_verified: boolean;
  country?: string;
  city?: string;
};

type CountryStat = {
  country: string;
  total: number;
};

type CityStat = {
  city: string;
  total: number;
};

type Stats = {
  total_users: number;
  patients: number;
  doctors: number;
  verified_doctors: number;
  students: number;
  moderators: number;
  questions: number;
  answers: number;
  comments: number;
  reports: number;
  pending_reports: number;
  top_users: TopUser[];
  countries: CountryStat[];
  cities: CityStat[];
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

function AdminStats() {
  const user = getStoredUser();

  const statsQuery = useQuery<Stats>({
    queryKey: ["adminStats"],
    queryFn: async () => {
      const response = await axios.get<Stats>(
        "http://127.0.0.1:8000/api/accounts/stats/"
      );

      return response.data;
    },
    enabled: !!user && user.role === "MODERATOR",
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

  if (user.role !== "MODERATOR") {
    return (
      <>
        <Navbar />
        <div className="container">
          <div className="panel empty-state">
            Accès refusé. Cette page est réservée au modérateur.
          </div>
        </div>
      </>
    );
  }

  if (statsQuery.isLoading) {
    return (
      <>
        <Navbar />
        <div className="container">
          <div className="panel empty-state">
            Chargement des statistiques...
          </div>
        </div>
      </>
    );
  }

  if (statsQuery.isError || !statsQuery.data) {
    return (
      <>
        <Navbar />
        <div className="container">
          <div className="panel empty-state">
            Erreur lors du chargement des statistiques.
          </div>
        </div>
      </>
    );
  }

  const stats = statsQuery.data;

  const cards: [string, number, string?][] = [
    ["Utilisateurs", stats.total_users],
    ["Patients", stats.patients],
    ["Médecins", stats.doctors, `${stats.verified_doctors} vérifiés`],
    ["Étudiants", stats.students],
    ["Modérateurs", stats.moderators],
    ["Questions", stats.questions],
    ["Réponses", stats.answers],
    ["Commentaires", stats.comments],
    ["Signalements", stats.reports, `${stats.pending_reports} en attente`],
  ];

  return (
    <>
      <Navbar />

      <div className="container wide">
        <div className="page-head">
          <div>
            <h1>Statistiques MedStack</h1>
            <p>Vue globale de l’activité de la plateforme.</p>
          </div>
        </div>

        <div className="stats-grid">
          {cards.map(([title, value, subtitle]) => (
            <div className="stat-card panel" key={title}>
              <h3>{title}</h3>
              <strong>{value}</strong>
              {subtitle && <p>{subtitle}</p>}
            </div>
          ))}
        </div>

        <div className="panel stats-section">
          <h2>Top utilisateurs par réputation</h2>

          {stats.top_users && stats.top_users.length > 0 ? (
            stats.top_users.map((u) => (
              <div key={u.id} className="top-user-row">
                <div>
                  <strong>{u.username}</strong>
                  <p>
                    {u.role} {u.is_verified ? "· Vérifié" : ""}
                  </p>
                  <small>
                    {u.city || "Ville non renseignée"} ·{" "}
                    {u.country || "Pays non renseigné"}
                  </small>
                </div>

                <span>{u.reputation} pts</span>
              </div>
            ))
          ) : (
            <p className="muted">Aucun utilisateur.</p>
          )}
        </div>

        <div className="panel stats-section">
          <h2>Répartition géographique par pays</h2>

          {stats.countries && stats.countries.length > 0 ? (
            stats.countries.map((item) => (
              <div key={item.country} className="top-user-row">
                <div>
                  <strong>{item.country}</strong>
                  <p>Utilisateurs inscrits</p>
                </div>

                <span>{item.total}</span>
              </div>
            ))
          ) : (
            <p className="muted">Aucune donnée géographique.</p>
          )}
        </div>

        <div className="panel stats-section">
          <h2>Répartition géographique par ville</h2>

          {stats.cities && stats.cities.length > 0 ? (
            stats.cities.map((item) => (
              <div key={item.city} className="top-user-row">
                <div>
                  <strong>{item.city}</strong>
                  <p>Utilisateurs inscrits</p>
                </div>

                <span>{item.total}</span>
              </div>
            ))
          ) : (
            <p className="muted">Aucune donnée géographique.</p>
          )}
        </div>
      </div>
    </>
  );
}

export default AdminStats;