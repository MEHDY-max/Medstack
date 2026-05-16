from django.conf import settings
from openai import OpenAI


def normalize_text(text):
    return text.lower().strip()


def contains_any(text, keywords):
    return any(keyword.lower() in text for keyword in keywords)


def moderate_medical_content(text):
    """
    Résultats possibles :
    SAFE = question médicale normale
    WARNING = question médicale sensible / à surveiller
    DANGEROUS = risque vital ou conseil dangereux
    """

    if not text or len(text.strip()) < 5:
        return {
            "status": "WARNING",
            "flagged": False,
            "reason": "Contenu trop court pour être analysé correctement."
        }

    text_lower = normalize_text(text)

    medical_keywords = [
        # Général médical
        "médecin", "medecin", "patient", "santé", "sante", "maladie",
        "symptôme", "symptome", "symptômes", "symptomes", "diagnostic",
        "traitement", "consultation", "clinique", "hôpital", "hopital",
        "urgence", "urgences", "analyse", "bilan", "examen", "soin",
        "douleur", "fièvre", "fievre", "infection", "inflammation",
        "allergie", "fatigue", "vertige", "vomissement", "nausée", "nausee",

        # Médicaments
        "médicament", "medicament", "médicaments", "medicaments",
        "pharmacie", "pharmacologie", "ordonnance", "prescription",
        "posologie", "dose", "dosage", "comprimé", "comprime",
        "gélule", "gelule", "sirop", "injection", "antibiotique",
        "paracétamol", "paracetamol", "ibuprofène", "ibuprofene",
        "aspirine", "insuline", "anticoagulant", "corticoïde", "corticoide",

        # Spécialités
        "cardiologie", "cardiaque", "coeur", "cœur", "dermatologie",
        "neurologie", "pédiatrie", "pediatrie", "gynécologie", "gynecologie",
        "orthopédie", "orthopedie", "psychiatrie", "ophtalmologie",
        "radiologie", "nutrition", "diabétologie", "diabetologie",

        # Organes / systèmes
        "sang", "tension", "pression artérielle", "pression arterielle",
        "glycémie", "glycemie", "diabète", "diabete", "hypertension",
        "thorax", "thoracique", "poitrine", "respiration", "respirer",
        "poumon", "asthme", "ventre", "estomac", "foie", "rein",
        "cerveau", "tête", "tete", "dos", "colonne", "peau", "plaie",
        "fracture", "grossesse", "règles", "regles",

        # Examens médicaux
        "radio", "radiographie", "scanner", "irm", "ecg", "électrocardiogramme",
        "electrocardiogramme", "échographie", "echographie", "prise de sang",
        "analyse sanguine", "biopsie", "histologie",

        # Maladies fréquentes
        "infarctus", "avc", "cancer", "covid", "grippe", "angine",
        "bronchite", "pneumonie", "migraine", "épilepsie", "epilepsie",
        "dépression", "depression", "anxiété", "anxiete"
    ]

    dangerous_keywords = [
        # Risque vital / urgence ignorée
        "ne pas aller aux urgences",
        "éviter les urgences",
        "eviter les urgences",
        "refuser les urgences",
        "douleur thoracique forte",
        "douleur poitrine forte",
        "difficulté à respirer",
        "difficulte a respirer",
        "je n'arrive pas à respirer",
        "je n'arrive pas a respirer",
        "perte de connaissance",
        "perdre connaissance",
        "paralysie soudaine",
        "saignement abondant",
        "hémorragie", "hemorragie",

        # Conseils dangereux médicament
        "double dose",
        "tripler la dose",
        "prendre une grande dose",
        "augmenter fortement la dose",
        "surdosage",
        "overdose",
        "arrêter le traitement",
        "arreter le traitement",
        "arrêter mes médicaments",
        "arreter mes medicaments",
        "mélanger alcool et médicament",
        "melanger alcool et medicament",

        # Auto-danger
        "suicide",
        "me suicider",
        "se suicider",
        "me tuer",
        "mourir volontairement",
        "prendre trop de médicaments",
        "prendre trop de medicaments"
    ]

    warning_contexts = [
        # Médicament sensible
        "dose", "dosage", "posologie", "effet secondaire", "effets secondaires",
        "interaction", "contre-indication", "contre indication",
        "augmenter la dose", "diminuer la dose", "changer le traitement",
        "arrêter", "arreter", "oublié une dose", "oublie une dose",
        "enceinte", "grossesse", "bébé", "bebe", "enfant",

        # Symptômes nécessitant prudence
        "douleur thoracique", "douleur poitrine", "essoufflement",
        "difficulté à respirer", "difficulte a respirer", "malaise",
        "perte de connaissance", "saignement", "forte fièvre", "forte fievre",
        "convulsion", "paralysie", "avc", "infarctus",

        # Demandes de conseil direct
        "que dois-je prendre", "que dois je prendre",
        "quel médicament prendre", "quel medicament prendre",
        "est-ce que je peux prendre", "est ce que je peux prendre",
        "puis-je prendre", "puis je prendre"
    ]

    non_medical_keywords = [
        "football", "match", "film", "musique", "voiture", "ordinateur",
        "programmation", "python", "javascript", "react", "django",
        "ecommerce", "shopify", "wordpress", "crypto", "trading",
        "voyage", "restaurant", "politique", "marketing"
    ]

    is_medical = contains_any(text_lower, medical_keywords)
    is_clearly_non_medical = contains_any(text_lower, non_medical_keywords)

    if not is_medical or is_clearly_non_medical:
        return {
            "status": "WARNING",
            "flagged": False,
            "reason": "Contenu hors contexte médical. MedStack est réservé aux questions médicales."
        }

    if contains_any(text_lower, dangerous_keywords):
        return {
            "status": "DANGEROUS",
            "flagged": True,
            "reason": "Contenu médical potentiellement dangereux ou à risque vital détecté."
        }

    if contains_any(text_lower, warning_contexts):
        local_result = {
            "status": "WARNING",
            "flagged": False,
            "reason": "Contenu médical sensible détecté. Une vérification par un professionnel est recommandée."
        }
    else:
        local_result = {
            "status": "SAFE",
            "flagged": False,
            "reason": "Contenu médical valide."
        }

    if not settings.OPENAI_API_KEY:
        return local_result

    try:
        client = OpenAI(api_key=settings.OPENAI_API_KEY)

        response = client.moderations.create(
            model="omni-moderation-latest",
            input=text
        )

        result = response.results[0]

        if result.flagged:
            return {
                "status": "DANGEROUS",
                "flagged": True,
                "reason": "OpenAI a détecté un contenu potentiellement dangereux."
            }

        return local_result

    except Exception:
        return local_result