import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: "PATIENT",
    specialty: "",
    inpe_number: "",
    country: "",
    city: "",
    diploma_file: null as File | null,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

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

  const countries = {
    Maroc: [
      "Marrakech",
      "Casablanca",
      "Rabat",
      "Fès",
      "Tanger",
      "Agadir",
      "Oujda",
      "Meknès",
    ],

    France: [
      "Paris",
      "Lyon",
      "Marseille",
      "Toulouse",
      "Nice",
      "Lille",
    ],

    Belgique: [
      "Bruxelles",
      "Liège",
      "Anvers",
      "Charleroi",
    ],

    Canada: [
      "Montréal",
      "Toronto",
      "Québec",
      "Ottawa",
    ],
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      diploma_file: e.target.files ? e.target.files[0] : null,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    try {
      const data = new FormData();

      data.append("username", formData.username);
      data.append("email", formData.email);
      data.append("password", formData.password);
      data.append("role", formData.role);
      data.append("country", formData.country);
      data.append("city", formData.city);

      if (formData.role === "DOCTOR" || formData.role === "STUDENT") {
        data.append("specialty", formData.specialty);
      }

      if (formData.role === "DOCTOR") {
        data.append("inpe_number", formData.inpe_number);

        if (formData.diploma_file) {
          data.append("diploma_file", formData.diploma_file);
        }
      }

      await axios.post(
        "http://127.0.0.1:8000/api/accounts/register/",
        data,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setSuccess("Compte créé avec succès. Redirection vers connexion...");

      setTimeout(() => {
        navigate("/login");
      }, 1200);
    } catch (err) {
      console.log(err);
      setError("Erreur lors de la création du compte.");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-panel">
        <div className="auth-brand">
          <div className="auth-logo">M</div>
          <h1>MedStack</h1>
          <p>Créez un compte pour rejoindre la communauté médicale.</p>
        </div>

        <div className="auth-card">
          <h2>Créer un compte</h2>

          {error && <p className="error-message">{error}</p>}
          {success && <p className="success-message">{success}</p>}

          <form onSubmit={handleSubmit}>
            <label>Nom d'utilisateur</label>
            <input
              type="text"
              name="username"
              placeholder="Ex : mehdi"
              value={formData.username}
              onChange={handleChange}
              required
            />

            <label>Email</label>
            <input
              type="email"
              name="email"
              placeholder="exemple@email.com"
              value={formData.email}
              onChange={handleChange}
              required
            />

            <label>Mot de passe</label>

            <div className="password-field">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Votre mot de passe"
                value={formData.password}
                onChange={handleChange}
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Masquer" : "Voir"}
              </button>
            </div>

            <label>Rôle</label>

            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
            >
              <option value="PATIENT">Patient</option>
              <option value="STUDENT">Étudiant en médecine</option>
              <option value="DOCTOR">
                Médecin / Professionnel de santé
              </option>
            </select>

            {(formData.role === "DOCTOR" ||
              formData.role === "STUDENT") && (
              <>
                <label>Spécialité</label>

                <select
                  name="specialty"
                  value={formData.specialty}
                  onChange={handleChange}
                  required
                >
                  <option value="">Choisir une spécialité</option>

                  {specialties.map((specialty) => (
                    <option key={specialty} value={specialty}>
                      {specialty}
                    </option>
                  ))}
                </select>
              </>
            )}

            {formData.role === "DOCTOR" && (
              <>
                <label>Numéro INPE</label>

                <input
                  type="text"
                  name="inpe_number"
                  placeholder="Ex : 123456"
                  value={formData.inpe_number}
                  onChange={handleChange}
                  required
                />

                <label>Diplôme professionnel</label>

                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  required
                />

                <small className="muted">
                  Le diplôme sera vérifié par l’administrateur.
                </small>
              </>
            )}

            <label>Pays</label>

            <select
              name="country"
              value={formData.country}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  country: e.target.value,
                  city: "",
                });
              }}
            >
              <option value="">Choisir un pays</option>

              {Object.keys(countries).map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>

            <label>Ville</label>

            <select
              name="city"
              value={formData.city}
              onChange={handleChange}
              disabled={!formData.country}
            >
              <option value="">Choisir une ville</option>

              {formData.country &&
                countries[
                  formData.country as keyof typeof countries
                ]?.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
            </select>

            <button className="primary-btn full" type="submit">
              Créer mon compte
            </button>
          </form>

          <div className="auth-footer">
            <p>Vous avez déjà un compte ?</p>

            <Link to="/login" className="secondary-link">
              Se connecter
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;