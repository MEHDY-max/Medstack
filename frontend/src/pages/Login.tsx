import { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type LoginResponse = {
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
};

function Login() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const loginMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post<LoginResponse>(
        "http://127.0.0.1:8000/api/accounts/login/",
        { email, password }
      );

      return response.data;
    },
    onSuccess: (data) => {
      localStorage.setItem("user", JSON.stringify(data));
      queryClient.clear();
      navigate("/", { replace: true });
    },
    onError: () => {
      setError("Email ou mot de passe incorrect.");
    },
  });

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    loginMutation.mutate();
  };

  return (
    <div className="auth-page">
      <div className="auth-panel">
        <div className="auth-brand">
          <div className="auth-logo">M</div>
          <h1>MedStack</h1>
          <p>Connectez-vous pour participer à la communauté médicale.</p>
        </div>

        <div className="auth-card">
          <h2>Connexion</h2>

          {error && <p className="error-message">{error}</p>}

          <form onSubmit={handleLogin}>
            <label>Email</label>
            <input
              type="email"
              placeholder="exemple@email.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <label>Mot de passe</label>
            <div className="password-field">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Votre mot de passe"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Masquer" : "Voir"}
              </button>
            </div>

            <button
              className="primary-btn full"
              type="submit"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Connexion..." : "Se connecter"}
            </button>
          </form>

          <div className="auth-footer">
            <p>Vous n'avez pas de compte ?</p>

            <Link to="/register" className="secondary-link">
              Créer un compte
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;