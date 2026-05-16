import Navbar from "../components/Navbar";
import axios from "axios";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type User = {
  user_id: number;
  username: string;
  email: string;
  role: string;
  specialty?: string;
  is_verified: boolean;
  reputation: number;
  inpe_number?: string;
  country?: string;
  city?: string;
  questions_count?: number;
  answers_count?: number;
  comments_count?: number;
  followers_count?: number;
  following_count?: number;
};

type FollowUser = {
  id: number;
  username: string;
  email: string;
  role: string;
  specialty?: string;
  is_verified: boolean;
  reputation: number;
  country?: string;
  city?: string;
  is_following: boolean;
};

type Notification = {
  id: number;
  notification_type: string;
  message: string;
  is_read: boolean;
};

type Badge = {
  id: number;
  badge_name: string;
  badge_description?: string;
};

type FollowedTag = {
  id: number;
  user: number;
  tag: number;
  tag_name: string;
  tag_label: string;
  created_at: string;
};

type Question = {
  id: number;
  title: string;
  description: string;
  question_type: string;
  is_closed: boolean;
  is_resolved: boolean;
  created_at?: string;
};

type QuestionsResponse = {
  questions: Question[];
  total_pages: number;
  current_page: number;
  total_questions: number;
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

function Profile() {
  const user = getStoredUser();
  const queryClient = useQueryClient();

  const usersQuery = useQuery<FollowUser[]>({
    queryKey: ["usersToFollow", user?.user_id],
    queryFn: async () => {
      if (!user) return [];

      const response = await axios.get<FollowUser[]>(
        `http://127.0.0.1:8000/api/accounts/users/?follower_id=${user.user_id}`
      );

      return response.data;
    },
    enabled: !!user,
  });

  const notificationsQuery = useQuery<Notification[]>({
    queryKey: ["profileNotifications", user?.user_id],
    queryFn: async () => {
      if (!user) return [];

      const response = await axios.get<Notification[]>(
        `http://127.0.0.1:8000/api/notifications/?user_id=${user.user_id}`
      );

      return response.data;
    },
    enabled: !!user,
  });

  const badgesQuery = useQuery<Badge[]>({
    queryKey: ["profileBadges", user?.user_id],
    queryFn: async () => {
      if (!user) return [];

      const response = await axios.get<Badge[]>(
        `http://127.0.0.1:8000/api/badges/user-badges/?user_id=${user.user_id}`
      );

      return response.data;
    },
    enabled: !!user,
  });

  const followedTagsQuery = useQuery<FollowedTag[]>({
    queryKey: ["followedTags", user?.user_id],
    queryFn: async () => {
      if (!user) return [];

      const response = await axios.get<FollowedTag[]>(
        `http://127.0.0.1:8000/api/tags/followed/?user_id=${user.user_id}`
      );

      return response.data;
    },
    enabled: !!user,
  });

  const myQuestionsQuery = useQuery<QuestionsResponse>({
    queryKey: ["myQuestions", user?.user_id],
    queryFn: async () => {
      if (!user) {
        return {
          questions: [],
          total_pages: 1,
          current_page: 1,
          total_questions: 0,
        };
      }

      const response = await axios.get<QuestionsResponse>(
        `http://127.0.0.1:8000/api/questions/?user_id=${user.user_id}`
      );

      return response.data;
    },
    enabled: !!user,
  });

  const followMutation = useMutation({
    mutationFn: async (userId: number) => {
      if (!user) return;

      await axios.post(`http://127.0.0.1:8000/api/accounts/follow/${userId}/`, {
        follower_id: user.user_id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usersToFollow", user?.user_id] });
      queryClient.invalidateQueries({ queryKey: ["profileNotifications", user?.user_id] });
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.user_id] });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: async (userId: number) => {
      if (!user) return;

      await axios.post(`http://127.0.0.1:8000/api/accounts/unfollow/${userId}/`, {
        follower_id: user.user_id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usersToFollow", user?.user_id] });
    },
  });

  const unfollowTagMutation = useMutation({
    mutationFn: async (tagId: number) => {
      if (!user) return;

      await axios.post(`http://127.0.0.1:8000/api/tags/${tagId}/unfollow/`, {
        user_id: user.user_id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["followedTags", user?.user_id] });
      queryClient.invalidateQueries({ queryKey: ["tags", user?.user_id] });
    },
  });

  if (!user) {
    return (
      <>
        <Navbar />
        <div className="container">
          <h2>Vous devez vous connecter.</h2>
        </div>
      </>
    );
  }

  const users = usersQuery.data || [];
  const notifications = notificationsQuery.data || [];
  const badges = badgesQuery.data || [];
  const followedTags = followedTagsQuery.data || [];
  const myQuestions = myQuestionsQuery.data?.questions || [];

  const getRoleLabel = () => {
    if (user.role === "PATIENT") return "Patient";
    if (user.role === "STUDENT") return "Étudiant en médecine";
    if (user.role === "DOCTOR" && user.is_verified) return "Médecin vérifié";
    if (user.role === "DOCTOR" && !user.is_verified) return "Médecin en attente";
    if (user.role === "MODERATOR") return "Modérateur";
    return "Utilisateur";
  };

  const getUserRoleLabel = (u: FollowUser) => {
    if (u.role === "PATIENT") return "Patient";
    if (u.role === "STUDENT") return "Étudiant en médecine";
    if (u.role === "DOCTOR" && u.is_verified) return "Médecin vérifié";
    if (u.role === "DOCTOR" && !u.is_verified) return "Médecin en attente";
    if (u.role === "MODERATOR") return "Modérateur";
    return "Utilisateur";
  };

  const getNotificationLabel = (type: string) => {
    if (type === "ANSWER") return "Réponse";
    if (type === "VOTE") return "Vote";
    if (type === "COMMENT") return "Commentaire";
    if (type === "FOLLOW") return "Abonnement";
    if (type === "MENTION") return "Mention";
    return "Notification";
  };

  const getQuestionStatus = (question: Question) => {
    if (question.is_closed) return "Fermée";
    if (question.is_resolved) return "Résolue";
    return "Ouverte";
  };

  return (
    <>
      <Navbar />

      <div className="profile-page">
        <section className="profile-hero panel">
          <div className="profile-avatar">
            {user.username.charAt(0).toUpperCase()}
          </div>

          <div className="profile-hero-content">
            <h1>{user.username}</h1>
            <p>{user.email}</p>

            <div className="profile-badges">
              <span className="role-badge-profile">{getRoleLabel()}</span>

              <span className={user.is_verified ? "verified-badge" : "pending-badge"}>
                {user.is_verified ? "Compte vérifié" : "En attente de vérification"}
              </span>
            </div>

            {(user.role === "DOCTOR" || user.role === "STUDENT") && (
              <p className="profile-specialty">
                Spécialité : {user.specialty || "Non renseignée"}
              </p>
            )}
          </div>
        </section>

        <div className="profile-grid">
          <div className="profile-card panel">
            <h3>Informations</h3>

            <div className="info-row">
              <span>Rôle</span>
              <strong>{getRoleLabel()}</strong>
            </div>

            <div className="info-row">
              <span>Spécialité</span>
              <strong>{user.specialty || "Non renseignée"}</strong>
            </div>

            <div className="info-row">
              <span>INPE</span>
              <strong>{user.inpe_number || "Non renseigné"}</strong>
            </div>

            <div className="info-row">
              <span>Réputation</span>
              <strong>{user.reputation}</strong>
            </div>
          </div>

          <div className="profile-card panel">
            <h3>Badges</h3>

            {badgesQuery.isLoading ? (
              <p className="muted">Chargement des badges...</p>
            ) : badges.length === 0 ? (
              <p className="muted">Aucun badge pour le moment.</p>
            ) : (
              badges.map((badge) => (
                <span
                  key={badge.id}
                  className="badge-item"
                  style={{ margin: "0 8px 8px 0" }}
                >
                  🏅 {badge.badge_name}
                </span>
              ))
            )}
          </div>

          <div className="profile-card panel">
            <h3>Vérification professionnelle</h3>

            {user.role === "DOCTOR" ? (
              <>
                <div className="info-row">
                  <span>Statut</span>
                  <strong>{user.is_verified ? "Validé par l’admin" : "En attente"}</strong>
                </div>

                <div className="info-row">
                  <span>Pays</span>
                  <strong>{user.country || "Non renseigné"}</strong>
                </div>

                <div className="info-row">
                  <span>Ville</span>
                  <strong>{user.city || "Non renseignée"}</strong>
                </div>

                <div className="info-row">
                  <span>Spécialité</span>
                  <strong>{user.specialty || "Non renseignée"}</strong>
                </div>

                <div className="info-row">
                  <span>INPE</span>
                  <strong>{user.inpe_number || "Non renseigné"}</strong>
                </div>

                <p className="muted">Le diplôme est contrôlé dans Django Admin.</p>
              </>
            ) : user.role === "STUDENT" ? (
              <>
                <div className="info-row">
                  <span>Statut</span>
                  <strong>Étudiant en médecine</strong>
                </div>

                <div className="info-row">
                  <span>Spécialité</span>
                  <strong>{user.specialty || "Non renseignée"}</strong>
                </div>
              </>
            ) : (
              <p className="muted">
                La vérification professionnelle concerne uniquement les médecins.
              </p>
            )}
          </div>

          <div className="profile-card panel">
            <h3>Activité</h3>

            <div className="info-row">
              <span>Questions publiées</span>
              <strong>{myQuestions.length || user.questions_count || 0}</strong>
            </div>

            <div className="info-row">
              <span>Réponses données</span>
              <strong>{user.answers_count || 0}</strong>
            </div>

            <div className="info-row">
              <span>Commentaires</span>
              <strong>{user.comments_count || 0}</strong>
            </div>

            <div className="info-row">
              <span>Followers</span>
              <strong>{user.followers_count || 0}</strong>
            </div>

            <div className="info-row">
              <span>Following</span>
              <strong>{user.following_count || 0}</strong>
            </div>
          </div>

          <div className="profile-card panel wide-card">
            <h3>Mes questions</h3>

            {myQuestionsQuery.isLoading ? (
              <p className="muted">Chargement de vos questions...</p>
            ) : myQuestions.length === 0 ? (
              <p className="muted">Vous n’avez posé aucune question pour le moment.</p>
            ) : (
              myQuestions.map((question) => (
                <Link
                  key={question.id}
                  to={`/question/${question.id}`}
                  className="notification-item"
                  style={{
                    textDecoration: "none",
                    color: "inherit",
                    display: "block",
                  }}
                >
                  <strong>{question.title}</strong>

                  <p>
                    {question.description
                      ? question.description.slice(0, 150)
                      : "Aucune description"}
                    ...
                  </p>

                  <small>
                    {getQuestionStatus(question)} · {question.question_type}
                  </small>
                </Link>
              ))
            )}
          </div>

          <div className="profile-card panel wide-card">
            <h3>Tags suivis</h3>

            {followedTagsQuery.isLoading ? (
              <p className="muted">Chargement des tags suivis...</p>
            ) : followedTags.length === 0 ? (
              <p className="muted">Vous ne suivez aucun tag pour le moment.</p>
            ) : (
              followedTags.map((item) => (
                <div key={item.id} className="follow-user">
                  <div>
                    <strong>{item.tag_label || item.tag_name}</strong>
                    <p>Vous recevrez une notification pour les nouvelles questions.</p>
                  </div>

                  <button
                    className="danger-btn"
                    onClick={() => unfollowTagMutation.mutate(item.tag)}
                    disabled={unfollowTagMutation.isPending}
                  >
                    Ne plus suivre
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="profile-card panel wide-card">
            <h3>Notifications</h3>

            {notificationsQuery.isLoading ? (
              <p className="muted">Chargement des notifications...</p>
            ) : notifications.length === 0 ? (
              <p className="muted">Aucune notification pour le moment.</p>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="notification-item">
                  <strong>{getNotificationLabel(n.notification_type)}</strong>
                  <p>{n.message}</p>
                  <small>{n.is_read ? "Lu" : "Non lu"}</small>
                </div>
              ))
            )}
          </div>

          <div className="profile-card panel wide-card">
            <h3>Utilisateurs à suivre</h3>

            {usersQuery.isLoading ? (
              <p className="muted">Chargement des utilisateurs...</p>
            ) : users.filter((u) => u.id !== user.user_id).length === 0 ? (
              <p className="muted">Aucun utilisateur trouvé.</p>
            ) : (
              users
                .filter((u) => u.id !== user.user_id)
                .map((u) => (
                  <div key={u.id} className="follow-user">
                    <div>
                      <strong>{u.username}</strong>

                      <p>{getUserRoleLabel(u)}</p>

                      {(u.role === "DOCTOR" || u.role === "STUDENT") && (
                        <small>
                          Spécialité : {u.specialty || "Non renseignée"}
                        </small>
                      )}

                      <br />

                      <small>
                        {u.city || "Ville non renseignée"} ·{" "}
                        {u.country || "Pays non renseigné"}
                      </small>
                    </div>

                    {u.is_following ? (
                      <button
                        className="danger-btn"
                        onClick={() => unfollowMutation.mutate(u.id)}
                        disabled={unfollowMutation.isPending}
                      >
                        Ne plus suivre
                      </button>
                    ) : (
                      <button
                        className="secondary-btn"
                        onClick={() => followMutation.mutate(u.id)}
                        disabled={followMutation.isPending}
                      >
                        Suivre
                      </button>
                    )}
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default Profile;