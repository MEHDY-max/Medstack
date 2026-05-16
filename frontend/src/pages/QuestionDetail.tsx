import { useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import Navbar from "../components/Navbar";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import MDEditor from "@uiw/react-md-editor";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type User = {
  user_id: number;
  username: string;
  role: string;
  reputation: number;
  is_verified: boolean;
};

type Question = {
  id: number;
  user: number;
  title: string;
  description: string;
  image?: string | null;
  tags: number[];
  tag_labels?: string[];
  is_closed: boolean;
  close_reason: string;
  closed_by_username?: string | null;
};

type Answer = {
  id: number;
  author: number;
  author_username?: string;
  body: string;
  references?: string | null;
  is_accepted: boolean;
  vote_score: number;
};

type Tag = {
  id: number;
  name: string;
  label?: string;
};

type Comment = {
  id: number;
  author_username: string;
  question: number | null;
  answer: number | null;
  parent: number | null;
  body: string;
  replies?: Comment[];
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

function QuestionDetail() {
  const { id } = useParams<{ id: string }>();
  const user = getStoredUser();
  const queryClient = useQueryClient();

  const [content, setContent] = useState<string>("");
  const [references, setReferences] = useState<string>("");

  const [questionCommentText, setQuestionCommentText] = useState<string>("");
  const [answerCommentText, setAnswerCommentText] = useState<Record<number, string>>({});
  const [replyTexts, setReplyTexts] = useState<Record<number, string>>({});
  const [openReplyBox, setOpenReplyBox] = useState<number | null>(null);

  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [closeReason, setCloseReason] = useState<string>("OTHER");

  const questionQuery = useQuery<Question>({
    queryKey: ["question", id],
    queryFn: async () => {
      const response = await axios.get<Question>(
        `http://127.0.0.1:8000/api/questions/${id}/`
      );

      setSelectedTags(response.data.tags || []);
      return response.data;
    },
    enabled: !!id,
  });

  const answersQuery = useQuery<Answer[]>({
    queryKey: ["answers", id],
    queryFn: async () => {
      const response = await axios.get<Answer[]>(
        `http://127.0.0.1:8000/api/questions/${id}/answers/`
      );

      return response.data;
    },
    enabled: !!id,
  });

  const tagsQuery = useQuery<Tag[]>({
    queryKey: ["tags"],
    queryFn: async () => {
      const response = await axios.get<Tag[]>("http://127.0.0.1:8000/api/tags/");
      return response.data;
    },
  });

  const questionCommentsQuery = useQuery<Comment[]>({
    queryKey: ["questionComments", id],
    queryFn: async () => {
      const response = await axios.get<Comment[]>(
        `http://127.0.0.1:8000/api/comments/?question=${id}`
      );

      return response.data;
    },
    enabled: !!id,
  });

  const answerCommentsQuery = useQuery<Record<number, Comment[]>>({
    queryKey: ["answerComments", id, answersQuery.data?.map((a) => a.id).join(",")],
    queryFn: async () => {
      const answers = answersQuery.data || [];
      const result: Record<number, Comment[]> = {};

      await Promise.all(
        answers.map(async (answer) => {
          const response = await axios.get<Comment[]>(
            `http://127.0.0.1:8000/api/comments/?answer=${answer.id}`
          );

          result[answer.id] = response.data;
        })
      );

      return result;
    },
    enabled: !!id && !!answersQuery.data,
  });

  const requireLogin = () => {
    if (!user) {
      window.location.href = "/login";
      return false;
    }

    return true;
  };

  const canEditTags = () => {
    if (!user) return false;
    return user.reputation >= 50 || user.role === "MODERATOR";
  };

  const canCloseQuestion = () => {
    if (!user) return false;

    return (
      user.reputation >= 100 ||
      user.role === "MODERATOR" ||
      (user.role === "DOCTOR" && user.is_verified)
    );
  };

  const refreshQuestion = () => {
    queryClient.invalidateQueries({ queryKey: ["question", id] });
  };

  const refreshAnswers = () => {
    queryClient.invalidateQueries({ queryKey: ["answers", id] });
    queryClient.invalidateQueries({ queryKey: ["answerComments", id] });
  };

  const refreshQuestionComments = () => {
    queryClient.invalidateQueries({ queryKey: ["questionComments", id] });
  };

  const refreshAnswerComments = () => {
    queryClient.invalidateQueries({ queryKey: ["answerComments", id] });
  };

  const submitAnswerMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;

      await axios.post("http://127.0.0.1:8000/api/answers/", {
        body: content,
        references,
        is_accepted: false,
        question: id,
        author: user.user_id,
      });
    },
    onSuccess: () => {
      setContent("");
      setReferences("");
      refreshAnswers();
    },
  });

  const voteMutation = useMutation({
    mutationFn: async ({ answerId, value }: { answerId: number; value: number }) => {
      if (!user) return;

      await axios.post("http://127.0.0.1:8000/api/votes/", {
        user: user.user_id,
        answer: answerId,
        value,
      });
    },
    onSuccess: refreshAnswers,
    onError: () => alert("Erreur lors du vote."),
  });

  const acceptAnswerMutation = useMutation({
    mutationFn: async (answerId: number) => {
      if (!user) return;

      await axios.post(`http://127.0.0.1:8000/api/answers/${answerId}/accept/`, {
        user_id: user.user_id,
      });
    },
    onSuccess: () => {
      alert("Réponse acceptée comme meilleure réponse.");
      refreshAnswers();
      refreshQuestion();
    },
    onError: () => alert("Seul l'auteur de la question peut accepter une réponse."),
  });

  const questionCommentMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;

      await axios.post("http://127.0.0.1:8000/api/comments/", {
        author: user.user_id,
        question: id,
        answer: null,
        parent: null,
        body: questionCommentText,
      });
    },
    onSuccess: () => {
      setQuestionCommentText("");
      refreshQuestionComments();
    },
  });

  const answerCommentMutation = useMutation({
    mutationFn: async (answerId: number) => {
      if (!user) return;

      await axios.post("http://127.0.0.1:8000/api/comments/", {
        author: user.user_id,
        question: null,
        answer: answerId,
        parent: null,
        body: answerCommentText[answerId] || "",
      });
    },
    onSuccess: (_, answerId) => {
      setAnswerCommentText((prev) => ({
        ...prev,
        [answerId]: "",
      }));

      refreshAnswerComments();
    },
  });

  const replyCommentMutation = useMutation({
    mutationFn: async ({ comment }: { comment: Comment; answerId: number | null }) => {
      if (!user) return;

      const text = replyTexts[comment.id] || "";

      await axios.post("http://127.0.0.1:8000/api/comments/", {
        author: user.user_id,
        question: comment.question,
        answer: comment.answer,
        parent: comment.id,
        body: text,
      });
    },
    onSuccess: (_, variables) => {
      setReplyTexts((prev) => ({
        ...prev,
        [variables.comment.id]: "",
      }));

      setOpenReplyBox(null);

      if (variables.answerId) {
        refreshAnswerComments();
      } else {
        refreshQuestionComments();
      }
    },
  });

  const updateTagsMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;

      await axios.post(`http://127.0.0.1:8000/api/questions/${id}/update-tags/`, {
        user_id: user.user_id,
        tags: selectedTags,
      });
    },
    onSuccess: () => {
      alert("Tags modifiés avec succès.");
      refreshQuestion();
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || "Erreur lors de la modification des tags.");
    },
  });

  const closeQuestionMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;

      await axios.post(`http://127.0.0.1:8000/api/questions/${id}/close/`, {
        user_id: user.user_id,
        reason: closeReason,
      });
    },
    onSuccess: () => {
      alert("Question fermée avec succès.");
      refreshQuestion();
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || "Erreur lors de la fermeture.");
    },
  });

  const reopenQuestionMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;

      await axios.post(`http://127.0.0.1:8000/api/questions/${id}/reopen/`, {
        user_id: user.user_id,
      });
    },
    onSuccess: () => {
      alert("Question rouverte avec succès.");
      refreshQuestion();
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || "Erreur lors de la réouverture.");
    },
  });

  const reportMutation = useMutation({
    mutationFn: async ({
      answerId,
      reason,
    }: {
      answerId: number | null;
      reason: string;
    }) => {
      if (!user) return;

      await axios.post("http://127.0.0.1:8000/api/moderation/reports/", {
        user: user.user_id,
        question: answerId ? null : id,
        answer: answerId,
        comment: null,
        reason,
        status: "PENDING",
      });
    },
    onSuccess: (_, variables) => {
      alert(variables.answerId ? "Réponse signalée." : "Question signalée.");
    },
  });

  const handleSubmitAnswer = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!requireLogin()) return;

    if (question?.is_closed) {
      alert("Cette question est fermée. Vous ne pouvez plus ajouter de réponse.");
      return;
    }

    submitAnswerMutation.mutate();
  };

  const handleQuestionComment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!requireLogin()) return;
    questionCommentMutation.mutate();
  };

  const handleAnswerComment = (
    e: React.FormEvent<HTMLFormElement>,
    answerId: number
  ) => {
    e.preventDefault();
    if (!requireLogin()) return;
    answerCommentMutation.mutate(answerId);
  };

  const handleReplyToComment = (
    e: React.FormEvent<HTMLFormElement>,
    comment: Comment,
    answerId: number | null = null
  ) => {
    e.preventDefault();

    if (!requireLogin()) return;

    const text = replyTexts[comment.id] || "";
    if (!text.trim()) return;

    replyCommentMutation.mutate({ comment, answerId });
  };

  const handleReportQuestion = () => {
    if (!requireLogin()) return;

    const reason = prompt("Pourquoi voulez-vous signaler cette question ?");
    if (!reason) return;

    reportMutation.mutate({ answerId: null, reason });
  };

  const handleReportAnswer = (answerId: number) => {
    if (!requireLogin()) return;

    const reason = prompt("Pourquoi voulez-vous signaler cette réponse ?");
    if (!reason) return;

    reportMutation.mutate({ answerId, reason });
  };

  const handleTagSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const ids = Array.from(e.target.selectedOptions).map((option) =>
      parseInt(option.value)
    );

    setSelectedTags(ids);
  };

  const handleCloseQuestion = () => {
    if (!requireLogin()) return;

    if (!window.confirm("Voulez-vous vraiment fermer cette question ?")) return;

    closeQuestionMutation.mutate();
  };

  const renderComments = (
    comments: Comment[],
    answerId: number | null = null,
    level: number = 0
  ): React.ReactNode => {
    return comments.map((c) => (
      <div
        key={c.id}
        className={level === 0 ? "comment-item" : "comment-item nested-comment"}
      >
        <strong>{c.author_username}</strong>

        <div className="markdown-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{c.body}</ReactMarkdown>
        </div>

        <button
          className="reply-btn"
          onClick={() => setOpenReplyBox(openReplyBox === c.id ? null : c.id)}
        >
          Répondre
        </button>

        {openReplyBox === c.id && (
          <form
            className="reply-form"
            onSubmit={(e) => handleReplyToComment(e, c, answerId)}
          >
            <textarea
              placeholder="Répondre à ce commentaire..."
              value={replyTexts[c.id] || ""}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setReplyTexts((prev) => ({
                  ...prev,
                  [c.id]: e.target.value,
                }))
              }
              required
            />

            <button className="primary-btn small" type="submit">
              Envoyer
            </button>
          </form>
        )}

        {c.replies && c.replies.length > 0 && (
          <div className="nested-comments-wrapper">
            {renderComments(c.replies, answerId, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  if (questionQuery.isLoading || !questionQuery.data) {
    return (
      <>
        <Navbar />
        <div className="container">
          <div className="panel empty-state">Chargement...</div>
        </div>
      </>
    );
  }

  if (questionQuery.isError) {
    return (
      <>
        <Navbar />
        <div className="container">
          <div className="panel empty-state">
            Erreur lors du chargement de la question.
          </div>
        </div>
      </>
    );
  }

  const question = questionQuery.data;
  const answers = answersQuery.data || [];
  const tags = tagsQuery.data || [];
  const questionComments = questionCommentsQuery.data || [];
  const answerComments = answerCommentsQuery.data || {};

  const isQuestionAuthor = user && Number(user.user_id) === Number(question.user);

  return (
    <>
      <Navbar />

      <main className="question-page">
        <section className="question-main panel">
          {question.is_closed && (
            <div className="closed-question-box">
              <strong>Question fermée</strong>
              <p>
                Raison : {question.close_reason}
                {question.closed_by_username
                  ? ` · Fermée par ${question.closed_by_username}`
                  : ""}
              </p>
            </div>
          )}

          <div className="question-detail-header">
            <div>
              <span className="eyebrow">Question médicale</span>

              <h1>{question.title}</h1>

              <div className="markdown-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {question.description}
                </ReactMarkdown>
              </div>

              {question.image && (
                <div className="question-image-wrapper">
                  <img
                    src={`http://127.0.0.1:8000${question.image}`}
                    alt="question"
                    className="question-image-detail"
                  />
                </div>
              )}

              {question.tag_labels && question.tag_labels.length > 0 && (
                <div className="question-tags">
                  {question.tag_labels.map((tagLabel) => (
                    <span key={tagLabel}>{tagLabel}</span>
                  ))}
                </div>
              )}
            </div>

            <button className="report-btn" onClick={handleReportQuestion}>
              Signaler
            </button>
          </div>

          {canEditTags() && (
            <div className="privilege-box">
              <h3>Modifier les tags</h3>

              <select
                multiple
                className="tag-select"
                value={selectedTags.map(String)}
                onChange={handleTagSelect}
              >
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.label || tag.name}
                  </option>
                ))}
              </select>

              <button
                className="secondary-btn"
                onClick={() => updateTagsMutation.mutate()}
                style={{ marginTop: "12px" }}
              >
                Enregistrer les tags
              </button>
            </div>
          )}

          {canCloseQuestion() && (
            <div className="privilege-box">
              <h3>Gestion de la question</h3>

              {!question.is_closed ? (
                <>
                  <label>Raison de fermeture</label>
                  <select
                    value={closeReason}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setCloseReason(e.target.value)
                    }
                  >
                    <option value="DUPLICATE">Question dupliquée</option>
                    <option value="OFF_TOPIC">Hors sujet</option>
                    <option value="DANGEROUS">Conseil médical dangereux</option>
                    <option value="OTHER">Autre</option>
                  </select>

                  <button
                    className="danger-btn"
                    onClick={handleCloseQuestion}
                    style={{ marginTop: "12px" }}
                  >
                    Fermer la question
                  </button>
                </>
              ) : user?.role === "MODERATOR" ? (
                <button
                  className="secondary-btn"
                  onClick={() => reopenQuestionMutation.mutate()}
                >
                  Rouvrir la question
                </button>
              ) : (
                <p className="muted">
                  Cette question est fermée. Seul un modérateur peut la rouvrir.
                </p>
              )}
            </div>
          )}

          <div className="comments-section">
            <h3>Commentaires de la question</h3>

            {questionComments.length === 0 ? (
              <p className="muted">Aucun commentaire pour cette question.</p>
            ) : (
              renderComments(questionComments, null)
            )}

            <form onSubmit={handleQuestionComment} className="comment-form">
              <textarea
                placeholder="Ajouter un commentaire..."
                value={questionCommentText}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setQuestionCommentText(e.target.value)
                }
                required
              />

              <button className="primary-btn" type="submit">
                Commenter
              </button>
            </form>
          </div>
        </section>

        <h2 className="section-title">Réponses</h2>

        {answers.length === 0 && (
          <div className="panel empty-state">Aucune réponse pour le moment.</div>
        )}

        {answers.map((a) => (
          <section
            key={a.id}
            className={
              a.is_accepted
                ? "answer-card panel accepted-answer-card"
                : "answer-card panel"
            }
          >
            <div className="answer-top">
              {a.is_accepted && (
                <span className="accepted-badge">Meilleure réponse</span>
              )}

              <button
                className="report-btn"
                onClick={() => handleReportAnswer(a.id)}
              >
                Signaler
              </button>
            </div>

            <div className="markdown-content answer-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {a.body}
              </ReactMarkdown>
            </div>

            {a.references && (
              <div className="references-box">
                <h4>Références bibliographiques</h4>

                <div className="markdown-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {a.references}
                  </ReactMarkdown>
                </div>
              </div>
            )}

            <p className="muted">
              Réponse par : {a.author_username || `Utilisateur #${a.author}`}
            </p>

            <div className="vote-row">
              <button
                className="vote-btn"
                onClick={() => voteMutation.mutate({ answerId: a.id, value: 1 })}
              >
                +1
              </button>

              <strong>Score : {a.vote_score}</strong>

              <button
                className="vote-btn down"
                onClick={() => voteMutation.mutate({ answerId: a.id, value: -1 })}
              >
                -1
              </button>
            </div>

            {isQuestionAuthor && !a.is_accepted && (
              <button
                className="accept-btn"
                onClick={() => acceptAnswerMutation.mutate(a.id)}
              >
                Marquer comme meilleure réponse
              </button>
            )}

            <div className="comments-section compact">
              <h4>Commentaires</h4>

              {answerComments[a.id] && answerComments[a.id].length > 0 ? (
                renderComments(answerComments[a.id], a.id)
              ) : (
                <p className="muted">Aucun commentaire pour cette réponse.</p>
              )}

              <form
                onSubmit={(e) => handleAnswerComment(e, a.id)}
                className="comment-form"
              >
                <textarea
                  placeholder="Ajouter un commentaire..."
                  value={answerCommentText[a.id] || ""}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setAnswerCommentText((prev) => ({
                      ...prev,
                      [a.id]: e.target.value,
                    }))
                  }
                  required
                />

                <button className="primary-btn" type="submit">
                  Commenter
                </button>
              </form>
            </div>
          </section>
        ))}

        {!question.is_closed ? (
          <section className="panel answer-form-card">
            <h3>Ajouter une réponse</h3>

            <div className="editor-info-box">
              <div>
                <strong>Éditeur Markdown professionnel</strong>
                <p>Utilisez les outils pour formater votre réponse médicale.</p>
              </div>
            </div>

            <form onSubmit={handleSubmitAnswer}>
              <label>Réponse médicale</label>

              <div data-color-mode="light">
                <MDEditor value={content} onChange={(value) => setContent(value || "")} height={320} />
              </div>

              <label style={{ marginTop: "22px" }}>
                Références bibliographiques
              </label>

              <div data-color-mode="light">
                <MDEditor
                  value={references}
                  onChange={(value) => setReferences(value || "")}
                  height={220}
                />
              </div>

              <button
                className="primary-btn"
                type="submit"
                style={{ marginTop: "20px" }}
              >
                Publier la réponse
              </button>
            </form>
          </section>
        ) : (
          <div className="panel empty-state">
            Cette question est fermée. Il n’est plus possible d’ajouter une réponse.
          </div>
        )}
      </main>
    </>
  );
}

export default QuestionDetail;