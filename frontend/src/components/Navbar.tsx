import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type User = {
  user_id: number;
  username: string;
  role: "PATIENT" | "STUDENT" | "DOCTOR" | "MODERATOR" | string;
  is_verified: boolean;
  reputation?: number;
};

type Notification = {
  id: number;
  user: number;
  message: string;
  notification_type: string;
  is_read: boolean;
  created_at?: string;
};

type UserBadge = {
  id: number;
  user: number;
  badge: number;
  badge_name: string;
  badge_description?: string;
  assigned_at?: string;
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

function Navbar() {
  const user = getStoredUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showBadges, setShowBadges] = useState(false);

  const goToQuestions = () => {
    setShowNotifications(false);
    setShowBadges(false);

    window.dispatchEvent(new Event("medstack-go-questions"));
    navigate("/");
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    queryClient.clear();
    navigate("/login", { replace: true });
  };

  const getRoleBadge = () => {
    if (!user) return "";

    if (user.role === "DOCTOR" && user.is_verified) return "Médecin vérifié";
    if (user.role === "DOCTOR" && !user.is_verified) return "Médecin en attente";
    if (user.role === "PATIENT") return "Patient";
    if (user.role === "STUDENT") return "Étudiant en médecine";
    if (user.role === "MODERATOR") return "Modérateur";

    return "Utilisateur";
  };

  const notificationsQuery = useQuery<Notification[]>({
    queryKey: ["notifications", user?.user_id],
    queryFn: async () => {
      if (!user) return [];

      const response = await axios.get<Notification[]>(
        `http://127.0.0.1:8000/api/notifications/?user_id=${user.user_id}`
      );

      return response.data;
    },
    enabled: !!user,
  });

  const badgesQuery = useQuery<UserBadge[]>({
    queryKey: ["userBadges", user?.user_id],
    queryFn: async () => {
      if (!user) return [];

      const response = await axios.get<UserBadge[]>(
        `http://127.0.0.1:8000/api/badges/user-badges/?user_id=${user.user_id}`
      );

      return response.data;
    },
    enabled: !!user,
  });

  const markReadMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;

      await axios.post("http://127.0.0.1:8000/api/notifications/mark-read/", {
        user_id: user.user_id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["notifications", user?.user_id],
      });
    },
  });

  const notifications = notificationsQuery.data || [];
  const badges = badgesQuery.data || [];
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <nav className="navbar">
      <button
        type="button"
        className="logo"
        onClick={goToQuestions}
        style={{ border: "none", background: "transparent", cursor: "pointer" }}
      >
        <span className="logo-mark">M</span>
        <span>MedStack</span>
      </button>

      <div className="nav-links">
        <button
          type="button"
          onClick={goToQuestions}
          style={{ border: "none", background: "transparent", cursor: "pointer" }}
        >
          Questions
        </button>

        {user ? (
          <>
            {(user.role === "MODERATOR" || user.role === "DOCTOR") && (
              <Link to="/moderation">Modération</Link>
            )}

            {user.role === "MODERATOR" && <Link to="/stats">Statistiques</Link>}

            <div className="nav-dropdown-wrapper">
              <button
                className="notif-btn"
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowBadges(false);
                }}
              >
                🔔
                {unreadCount > 0 && (
                  <span className="notif-count">{unreadCount}</span>
                )}
              </button>

              {showNotifications && (
                <div className="clean-dropdown notification-dropdown">
                  <div className="clean-dropdown-header">
                    <strong>Notifications</strong>
                    <small>{notifications.length} récente(s)</small>
                  </div>

                  {unreadCount > 0 && (
                    <button
                      className="mark-read-btn"
                      onClick={() => markReadMutation.mutate()}
                      disabled={markReadMutation.isPending}
                    >
                      {markReadMutation.isPending
                        ? "Traitement..."
                        : "Marquer comme lues"}
                    </button>
                  )}

                  {notificationsQuery.isLoading ? (
                    <p className="dropdown-empty">Chargement...</p>
                  ) : notifications.length === 0 ? (
                    <p className="dropdown-empty">Aucune notification.</p>
                  ) : (
                    notifications.slice(0, 5).map((n) => (
                      <div key={n.id} className="clean-notif-item">
                        <div>
                          <strong>{n.notification_type}</strong>
                          <p>{n.message}</p>
                        </div>

                        <span className={n.is_read ? "read-dot" : "unread-dot"}>
                          {n.is_read ? "Lu" : "Nouveau"}
                        </span>
                      </div>
                    ))
                  )}

                  <Link
                    to="/profile"
                    className="dropdown-link"
                    onClick={() => setShowNotifications(false)}
                  >
                    Voir toutes les notifications
                  </Link>
                </div>
              )}
            </div>

            <span className="role-badge">{getRoleBadge()}</span>

            {badges.length > 0 && (
              <div className="nav-dropdown-wrapper">
                <button
                  className="badge-nav-btn"
                  onClick={() => {
                    setShowBadges(!showBadges);
                    setShowNotifications(false);
                  }}
                >
                  🏅 {badges[0].badge_name}
                </button>

                {showBadges && (
                  <div className="clean-dropdown badge-dropdown-clean">
                    <div className="clean-dropdown-header">
                      <strong>Réputation</strong>
                      <small>{user.reputation || 0} pts</small>
                    </div>

                    <div className="reputation-box">
                      <strong>{user.username}</strong>
                      <p>{getRoleBadge()}</p>
                      <h3>{user.reputation || 0} points</h3>
                    </div>

                    <div className="badge-list-clean">
                      {badges.map((badge) => (
                        <div key={badge.id} className="badge-clean-item">
                          🏅 {badge.badge_name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <span className="username">{user.username}</span>

            <Link
              to="/profile"
              onClick={() => {
                setShowNotifications(false);
                setShowBadges(false);
              }}
            >
              Profil
            </Link>

            <button onClick={handleLogout} className="logout-btn">
              Déconnexion
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Connexion</Link>
            <Link to="/register" className="nav-cta">
              Créer un compte
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;