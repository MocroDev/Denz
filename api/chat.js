// Ce fichier est une "fonction serveur" : il ne tourne jamais dans le
// navigateur de ta sœur, seulement sur les serveurs de Vercel. C'est
// pour ça qu'on peut y mettre la clé API en toute sécurité : elle
// n'est jamais envoyée à l'iPad, jamais visible dans le code source
// de la page.
//
// Sur Vercel, tout fichier .js placé dans un dossier "api/" devient
// automatiquement une petite adresse web, ici : /api/chat

const MODEL_HAIKU = 'claude-haiku-4-5-20251001';
const MODEL_SONNET = 'claude-sonnet-4-6';
const ESCALATE_MARKER = '[[SONNET]]';

async function callClaude(model, system, messages) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
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
      model,
      max_tokens: 1000,
      system,
      messages
    })
  });
  const data = await response.json();
  if (!response.ok) {
    // On note l'erreur précise dans les logs Vercel pour pouvoir la lire
    console.error(`Erreur retournée par l'API Anthropic (${model}) :`, JSON.stringify(data));
  }
  return data;
}

function getTextBlock(data) {
  return (data.content || []).find(b => b.type === 'text');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { system, messages } = req.body;

  if (!messages) {
    return res.status(400).json({ error: 'Aucun message reçu' });
  }

  // On ajoute, uniquement pour la tentative avec Haiku (le modèle le
  // moins cher), la consigne qui lui permet de signaler qu'il vaut
  // mieux passer la main à un modèle plus capable.
  const haikuSystem = `${system}

Consigne technique interne (ne jamais mentionner à l'élève) : si cet exercice te semble vraiment trop complexe pour que tu puisses le décomposer et la guider correctement — rare pour un niveau 5ème, mais possible sur une question ambiguë ou un raisonnement à plusieurs étapes imbriquées — commence ta réponse par exactement ${ESCALATE_MARKER} puis rien d'autre sur cette réponse. Dans le cas contraire, ne mentionne jamais ce marqueur et réponds normalement.`;

  try {
    // 1er essai avec Haiku, moins cher
    let data = await callClaude(MODEL_HAIKU, haikuSystem, messages);
    const textBlock = getTextBlock(data);

    if (textBlock && textBlock.text.trim().startsWith(ESCALATE_MARKER)) {
      // Haiku juge l'exercice trop complexe : on relance avec Sonnet
      data = await callClaude(MODEL_SONNET, system, messages);
    }

    res.status(200).json(data);
  } catch (err) {
    console.error('Erreur API Claude:', err);
    res.status(500).json({ error: "Impossible de contacter l'assistant pour le moment." });
  }
}
