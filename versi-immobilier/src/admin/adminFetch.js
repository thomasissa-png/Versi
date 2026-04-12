/**
 * Helper pour les appels API admin authentifiés.
 * Le cookie httpOnly est envoyé automatiquement via credentials: 'same-origin'.
 */

/**
 * Effectue un appel fetch vers une route admin avec gestion d'erreurs.
 * @param {string} url — chemin de l'API (ex: '/api/admin/generate-listing')
 * @param {object} options — options fetch (method, body, etc.)
 * @returns {Promise<object>} — réponse JSON parsée
 */
export async function adminFetch(url, options = {}) {
  const defaultHeaders = { 'Content-Type': 'application/json' };

  const res = await fetch(url, {
    credentials: 'same-origin',
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  let data;
  try {
    data = await res.json();
  } catch {
    // La réponse n'est pas du JSON valide (ex : page HTML d'erreur)
    throw new Error(
      res.ok
        ? 'Réponse inattendue du serveur (format non-JSON).'
        : `Erreur ${res.status} — le serveur n'a pas renvoyé de réponse exploitable.`,
    );
  }

  if (!res.ok) {
    const message = data?.error || `Erreur ${res.status}`;
    throw new Error(message);
  }

  return data;
}

/**
 * Connexion admin — envoie le mot de passe et reçoit le cookie de session.
 * @param {string} password
 * @returns {Promise<object>}
 */
export async function adminLogin(password) {
  return adminFetch('/api/admin/login', {
    method: 'POST',
    body: { password },
  });
}

/**
 * Vérifie si la session admin est active.
 * @returns {Promise<boolean>}
 */
export async function adminCheckSession() {
  try {
    const data = await adminFetch('/api/admin/check', { method: 'GET' });
    return data.authenticated === true;
  } catch {
    return false;
  }
}

/**
 * Génère une annonce immobilière via l'IA.
 * @param {object} bienData — { adresse, surface, nbPieces, type, prix, etage, dpe, etat }
 * @returns {Promise<object>} — { title, description, city, postcode, type_normalized }
 */
export async function generateListing(bienData) {
  return adminFetch('/api/admin/generate-listing', {
    method: 'POST',
    body: bienData,
  });
}
