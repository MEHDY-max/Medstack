import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import axios from "axios";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type User = {
  user_id: number;
  username: string;
  role: string;
  is_verified: boolean;
  specialty?: string;
};

type Tag = {
  id: number;
  name: string;
  label?: string;
  is_following?: boolean;
};

type Question = {
  id: number;
  user: number;
  user_username?: string;
  user_role?: string;
  user_is_verified?: boolean;
  title: string;
  description: string;
  image?: string | null;
  question_type: string;
  tag_labels?: string[];
  tag_names?: string[];
  is_closed: boolean;
  is_resolved: boolean;
  ai_moderation_status?: "SAFE" | "WARNING" | "DANGEROUS";
  ai_moderation_flagged?: boolean;
  ai_moderation_reason?: string | null;
};

type QuestionsResponse = {
  questions: Question[];
  total_pages: number;
  current_page: number;
  total_questions: number;
};

type NewQuestion = {
  title: string;
  body: string;
  question_type: "THEORIQUE" | "CLINIQUE";
  tags: number[];
  image: File | null;
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

function Home() {
  const queryClient = useQueryClient();
  const user = getStoredUser();

  const [search, setSearch] = useState<string>("");
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [questionType, setQuestionType] = useState<string>("");
  const [specialty, setSpecialty] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [personalizedFeed, setPersonalizedFeed] = useState<boolean>(false);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [success, setSuccess] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [similarQuery, setSimilarQuery] = useState<string>("");
  const [page, setPage] = useState<number>(1);

  const [newQuestion, setNewQuestion] = useState<NewQuestion>({
    title: "",
    body: "",
    question_type: "THEORIQUE",
    tags: [],
    image: null,
  });
  
useEffect(() => {
  const resetHomeNavigation = () => {
    setShowForm(false);
    setSearch("");
    setSelectedTag("");
    setQuestionType("");
    setSpecialty("");
    setStatusFilter("");
    setDateFilter("");
    setPersonalizedFeed(false);
    setPage(1);
    setError("");
    setSuccess("");
    setSimilarQuery("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  window.addEventListener("medstack-go-questions", resetHomeNavigation);

  return () => {
    window.removeEventListener("medstack-go-questions", resetHomeNavigation);
  };
}, []);

  const specialties = [
    "Médecine générale",
    "Cardiologie",
    "Dermatologie",
    "Neurologie",
    "Pédiatrie",
    "Gynécologie",
    "Orthopédie",
    "Psychiatrie",
    "Ophtalmologie",
    "Radiologie",
    "Urgences",
    "Nutrition",
  ];

  const getRoleLabel = (role?: string, isVerified?: boolean) => {
    if (role === "DOCTOR" && isVerified) return "Médecin vérifié";
    if (role === "DOCTOR" && !isVerified) return "Médecin en attente";
    if (role === "PATIENT") return "Patient";
    if (role === "STUDENT") return "Étudiant en médecine";
    if (role === "MODERATOR") return "Modérateur";
    return "Utilisateur";
  };

  const buildQuestionsUrl = () => {
    const url = "http://127.0.0.1:8000/api/questions/";
    const params: string[] = [];

    if (selectedTag) params.push(`tag=${selectedTag}`);
    if (search.trim() !== "") params.push(`search=${encodeURIComponent(search)}`);
    if (questionType) params.push(`question_type=${encodeURIComponent(questionType)}`);
    if (specialty) params.push(`specialty=${encodeURIComponent(specialty)}`);
    if (statusFilter) params.push(`status=${encodeURIComponent(statusFilter)}`);
    if (dateFilter) params.push(`date=${encodeURIComponent(dateFilter)}`);
    if (personalizedFeed && user) params.push(`personalized_user_id=${user.user_id}`);

    params.push(`page=${page}`);

    return `${url}?${params.join("&")}`;
  };

  const questionsQuery = useQuery<QuestionsResponse>({
    queryKey: [
      "questions",
      selectedTag,
      search,
      page,
      questionType,
      specialty,
      statusFilter,
      dateFilter,
      personalizedFeed,
      user?.user_id,
    ],
    queryFn: async () => {
      const response = await axios.get<QuestionsResponse>(buildQuestionsUrl());
      return response.data;
    },
  });

  const tagsQuery = useQuery<Tag[]>({
    queryKey: ["tags", user?.user_id],
    queryFn: async () => {
      const url = user
        ? `http://127.0.0.1:8000/api/tags/?user_id=${user.user_id}`
        : "http://127.0.0.1:8000/api/tags/";

      const response = await axios.get<Tag[]>(url);
      return response.data;
    },
  });

  const similarQuestionsQuery = useQuery<Question[]>({
    queryKey: ["similarQuestions", similarQuery],
    queryFn: async () => {
      const response = await axios.get<Question[]>(
        `http://127.0.0.1:8000/api/questions/similar/?q=${encodeURIComponent(
          similarQuery
        )}`
      );

      return response.data;
    },
    enabled: similarQuery.trim().length >= 4,
  });

  const followTagMutation = useMutation({
    mutationFn: async (tagId: number) => {
      if (!user) throw new Error("NOT_AUTHENTICATED");

      await axios.post(`http://127.0.0.1:8000/api/tags/${tagId}/follow/`, {
        user_id: user.user_id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      setSuccess("Tag suivi avec succès.");
    },
    onError: () => {
      setError("Vous devez vous connecter pour suivre un tag.");
    },
  });

  const unfollowTagMutation = useMutation({
    mutationFn: async (tagId: number) => {
      if (!user) throw new Error("NOT_AUTHENTICATED");

      await axios.post(`http://127.0.0.1:8000/api/tags/${tagId}/unfollow/`, {
        user_id: user.user_id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      setSuccess("Tag retiré des abonnements.");
    },
  });

  const createQuestionMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("NOT_AUTHENTICATED");

      const formData = new FormData();

      formData.append("title", newQuestion.title);
      formData.append("description", newQuestion.body);
      formData.append("question_type", newQuestion.question_type);
      formData.append("user", String(user.user_id));

      newQuestion.tags.forEach((tag) => {
        formData.append("tags", String(tag));
      });

      if (newQuestion.image) {
        formData.append("image", newQuestion.image);
      }

      await axios.post("http://127.0.0.1:8000/api/questions/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
    },
    onSuccess: () => {
      setSuccess("Question publiée avec succès.");

      setNewQuestion({
        title: "",
        body: "",
        question_type: "THEORIQUE",
        tags: [],
        image: null,
      });

      setSimilarQuery("");
      setShowForm(false);
      setPage(1);

      queryClient.invalidateQueries({ queryKey: ["questions"] });
    },
    onError: (err: Error) => {
      if (err.message === "NOT_AUTHENTICATED") {
        setError("Vous devez vous connecter.");

        setTimeout(() => {
          window.location.href = "/login";
        }, 1000);

        return;
      }

      setError("Erreur lors de la publication.");
    },
  });

  const updateSimilarQuery = (title: string, body: string) => {
    const query = `${title} ${body}`.trim();

    if (query.length < 4) {
      setSimilarQuery("");
      return;
    }

    setSimilarQuery(query);
  };

  const handleTagSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedIds = Array.from(e.target.selectedOptions).map((option) =>
      parseInt(option.value)
    );

    setNewQuestion({
      ...newQuestion,
      tags: selectedIds,
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    createQuestionMutation.mutate();
  };

  const getStatusLabel = (q: Question) => {
    if (q.is_closed) return "Fermée";
    if (q.is_resolved) return "Résolue";
    return "Ouverte";
  };

  const questions = questionsQuery.data?.questions || [];
  const tags = tagsQuery.data || [];
  const totalPages = questionsQuery.data?.total_pages || 1;
  const totalQuestions = questionsQuery.data?.total_questions || 0;

  return (
    <>
      <Navbar />

      <div className="app-shell">
        <aside className="left-sidebar panel">
          <h3>MedStack</h3>

          <p>Plateforme collaborative dédiée aux questions médicales.</p>

          {user ? (
            <Link to="/profile" className="mini-profile mini-profile-link">
              <div className="mini-avatar">
                {user.username.charAt(0).toUpperCase()}
              </div>

              <strong>{user.username}</strong>
              <span>{getRoleLabel(user.role, user.is_verified)}</span>

              <small>
                {user.is_verified ? "Compte vérifié" : "En attente de vérification"}
              </small>

              <small className="profile-click-text">Voir mon profil →</small>
            </Link>
          ) : (
            <Link to="/login" className="primary-btn small">
              Se connecter
            </Link>
          )}
        </aside>

        <main className="main-feed">
          <div className="page-head">
            <div>
              <h1>Questions médicales</h1>
              <p>{totalQuestions} question(s) trouvée(s).</p>
            </div>

            <button
              className="primary-btn"
              onClick={() => setShowForm(!showForm)}
            >
              Poser une question
            </button>
          </div>

          {error && <p className="error-message">{error}</p>}
          {success && <p className="success-message">{success}</p>}

          <input
            className="search-input"
            placeholder="Rechercher par titre, description, tag ou spécialité..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />

          {user && user.specialty && (
            <div className="personal-feed-box panel">
              <div>
                <strong>Fil personnalisé</strong>
                <p>
                  Afficher les questions liées à votre spécialité :{" "}
                  <b>{user.specialty}</b>
                </p>
              </div>

              <button
                className={personalizedFeed ? "danger-btn" : "secondary-btn"}
                onClick={() => {
                  setPersonalizedFeed((previous) => !previous);
                  setPage(1);
                }}
              >
                {personalizedFeed ? "Désactiver" : "Activer"}
              </button>
            </div>
          )}

          <div className="advanced-filters panel">
            <div className="filter-header">
              <div>
                <strong>Filtres avancés</strong>
                <p>Affinez les résultats par spécialité, type, statut et date.</p>
              </div>

              <button
                className="secondary-btn small"
                onClick={() => {
                  setSearch("");
                  setSelectedTag("");
                  setQuestionType("");
                  setSpecialty("");
                  setStatusFilter("");
                  setDateFilter("");
                  setPersonalizedFeed(false);
                  setPage(1);
                }}
              >
                Réinitialiser
              </button>
            </div>

            <div className="filters-grid">
              <div>
                <label>Type de question</label>
                <select
                  value={questionType}
                  onChange={(e) => {
                    setQuestionType(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Tous les types</option>
                  <option value="THEORIQUE">Question théorique</option>
                  <option value="CLINIQUE">Cas clinique</option>
                </select>
              </div>

              <div>
                <label>Spécialité</label>
                <select
                  value={specialty}
                  onChange={(e) => {
                    setSpecialty(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Toutes les spécialités</option>

                  {specialties.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>Statut</label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Tous les statuts</option>
                  <option value="open">Ouvertes</option>
                  <option value="resolved">Résolues</option>
                  <option value="closed">Fermées</option>
                </select>
              </div>

              <div>
                <label>Date</label>
                <select
                  value={dateFilter}
                  onChange={(e) => {
                    setDateFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Toutes les dates</option>
                  <option value="today">Aujourd’hui</option>
                  <option value="week">7 derniers jours</option>
                  <option value="month">30 derniers jours</option>
                  <option value="year">Cette année</option>
                </select>
              </div>
            </div>
          </div>

          {showForm && (
            <form className="post-box panel" onSubmit={handleSubmit}>
              <h3>Nouvelle question</h3>

              <label>Titre</label>
              <input
                placeholder="Titre de la question"
                value={newQuestion.title}
                onChange={(e) => {
                  const value = e.target.value;

                  setNewQuestion({
                    ...newQuestion,
                    title: value,
                  });

                  updateSimilarQuery(value, newQuestion.body);
                }}
                required
              />

              <label>Description</label>
              <textarea
                placeholder="Décrivez votre question médicale en Markdown..."
                value={newQuestion.body}
                onChange={(e) => {
                  const value = e.target.value;

                  setNewQuestion({
                    ...newQuestion,
                    body: value,
                  });

                  updateSimilarQuery(newQuestion.title, value);
                }}
                required
              />

              {(similarQuestionsQuery.isLoading ||
                (similarQuestionsQuery.data &&
                  similarQuestionsQuery.data.length > 0)) && (
                <div className="similar-box">
                  <h4>Questions similaires détectées</h4>

                  {similarQuestionsQuery.isLoading ? (
                    <p className="muted">Recherche de questions similaires...</p>
                  ) : (
                    similarQuestionsQuery.data?.map((q) => (
                      <Link
                        key={q.id}
                        to={`/question/${q.id}`}
                        className="similar-question-item"
                      >
                        <strong>{q.title}</strong>
                        <p>
                          {q.description
                            ? q.description.slice(0, 120)
                            : "Aucune description"}
                          ...
                        </p>
                      </Link>
                    ))
                  )}
                </div>
              )}

              <label>Type de question</label>
              <select
                value={newQuestion.question_type}
                onChange={(e) =>
                  setNewQuestion({
                    ...newQuestion,
                    question_type: e.target.value as "THEORIQUE" | "CLINIQUE",
                  })
                }
              >
                <option value="THEORIQUE">Question théorique</option>
                <option value="CLINIQUE">Cas clinique</option>
              </select>

              <label>Tags médicaux normalisés</label>
              <select
                multiple
                className="tag-select"
                value={newQuestion.tags.map(String)}
                onChange={handleTagSelect}
              >
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.label || tag.name}
                  </option>
                ))}
              </select>

              <label>Image médicale anonymisée</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setNewQuestion({
                    ...newQuestion,
                    image: e.target.files ? e.target.files[0] : null,
                  })
                }
              />

              {newQuestion.image && (
                <div className="image-preview-box">
                  <p>Aperçu de l’image :</p>

                  <img
                    src={URL.createObjectURL(newQuestion.image)}
                    alt="preview"
                    className="image-preview"
                  />
                </div>
              )}

              <button
                className="primary-btn"
                type="submit"
                disabled={createQuestionMutation.isPending}
              >
                {createQuestionMutation.isPending ? "Publication..." : "Publier"}
              </button>
            </form>
          )}

          {questionsQuery.isLoading ? (
            <div className="feed-card panel">
              <p>Chargement des questions...</p>
            </div>
          ) : questionsQuery.isError ? (
            <div className="feed-card panel">
              <p>Erreur lors du chargement des questions.</p>
            </div>
          ) : questions.length === 0 ? (
            <div className="feed-card panel">
              <p>Aucune question trouvée avec ces filtres.</p>
            </div>
          ) : (
            questions.map((q) => (
              <Link
                to={`/question/${q.id}`}
                key={q.id}
                className="question-link"
              >
                <article className="feed-card panel">
                  <div className="post-top">
                    <div className="avatar">
                      {q.user_username
                        ? q.user_username.charAt(0).toUpperCase()
                        : "U"}
                    </div>

                    <div>
                      <strong>{q.user_username || `Utilisateur #${q.user}`}</strong>
                      <p>{getRoleLabel(q.user_role, q.user_is_verified)}</p>
                    </div>
                  </div>

                  <div className="question-status-row">
                    <span className="status-pill">{getStatusLabel(q)}</span>
                    <span className="type-pill">{q.question_type}</span>
                  </div>

                  <h2>{q.title}</h2>
                  <p>{q.description}</p>

                  {q.image && (
                    <img
                      src={`http://127.0.0.1:8000${q.image}`}
                      alt="question"
                      className="question-image"
                    />
                  )}

                  <div className="question-tags">
                    {q.tag_labels && q.tag_labels.length > 0 ? (
                      q.tag_labels.map((tagLabel) => (
                        <span key={tagLabel}>{tagLabel}</span>
                      ))
                    ) : q.tag_names && q.tag_names.length > 0 ? (
                      q.tag_names.map((tagName) => (
                        <span key={tagName}>{tagName}</span>
                      ))
                    ) : (
                      <span>Aucun tag</span>
                    )}
                  </div>

                  <div className="question-meta">
                    <span>Statut : {getStatusLabel(q)}</span>

                    <span>
                      IA :{" "}
                      {q.ai_moderation_status === "SAFE" && "✅ SAFE"}
                      {q.ai_moderation_status === "WARNING" && "⚠️ WARNING"}
                      {q.ai_moderation_status === "DANGEROUS" &&
                        "🚨 DANGEROUS"}
                    </span>

                    <span>Voir les réponses</span>
                  </div>

                  {q.ai_moderation_reason && (
                    <div
                      style={{
                        marginTop: "10px",
                        padding: "10px",
                        borderRadius: "10px",
                        background:
                          q.ai_moderation_status === "SAFE"
                            ? "#d1fae5"
                            : q.ai_moderation_status === "WARNING"
                            ? "#fef3c7"
                            : "#fee2e2",
                        color:
                          q.ai_moderation_status === "SAFE"
                            ? "#065f46"
                            : q.ai_moderation_status === "WARNING"
                            ? "#92400e"
                            : "#991b1b",
                        fontWeight: "600",
                      }}
                    >
                      {q.ai_moderation_reason}
                    </div>
                  )}
                </article>
              </Link>
            ))
          )}

          <div className="pagination">
            <button
              disabled={page === 1 || questionsQuery.isLoading}
              onClick={() => setPage(page - 1)}
            >
              Précédent
            </button>

            <span>
              Page {page} / {totalPages}
            </span>

            <button
              disabled={page === totalPages || questionsQuery.isLoading}
              onClick={() => setPage(page + 1)}
            >
              Suivant
            </button>
          </div>
        </main>

        <aside className="right-sidebar panel">
          <h3>Tags médicaux</h3>

          <button
            className={selectedTag === "" ? "tag-filter active" : "tag-filter"}
            onClick={() => {
              setSelectedTag("");
              setPage(1);
            }}
          >
            Tous
          </button>

          {tags.map((tag) => (
            <div key={tag.id} className="tag-follow-box">
              <button
                className={
                  selectedTag === String(tag.id) ? "tag-filter active" : "tag-filter"
                }
                onClick={() => {
                  setSelectedTag(String(tag.id));
                  setPage(1);
                }}
              >
                {tag.label || tag.name}
              </button>

              {user && (
                <button
                  className={tag.is_following ? "danger-btn small" : "secondary-btn small"}
                  onClick={() =>
                    tag.is_following
                      ? unfollowTagMutation.mutate(tag.id)
                      : followTagMutation.mutate(tag.id)
                  }
                  style={{ marginTop: "6px", width: "100%" }}
                >
                  {tag.is_following ? "Ne plus suivre" : "Suivre ce tag"}
                </button>
              )}
            </div>
          ))}
        </aside>
      </div>
    </>
  );
}

export default Home;