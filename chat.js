// Ce fichier est une "fonction serveur" : il ne tourne jamais dans le
// navigateur de ta sœur, seulement sur les serveurs de Vercel. C'est
// pour ça qu'on peut y mettre la clé API en toute sécurité : elle
// n'est jamais envoyée à l'iPad, jamais visible dans le code source
// de la page.
//
// Sur Vercel, tout fichier .js placé dans un dossier "api/" devient
// automatiquement une petite adresse web, ici : /api/chat

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { system, messages } = req.body;

  if (!messages) {
    return res.status(400).json({ error: 'Aucun message reçu' });
  }

  try {
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // La clé est lue depuis une "variable d'environnement" : une
        // valeur secrète configurée dans les réglages du projet
        // Vercel, jamais écrite dans ce fichier ni dans aucun fichier
        // que tu envoies sur internet.
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: system,
        messages: messages
      })
    });

    const data = await anthropicResponse.json();
    res.status(200).json(data);
  } catch (err) {
    console.error('Erreur API Claude:', err);
    res.status(500).json({ error: "Impossible de contacter l'assistant pour le moment." });
  }
}
