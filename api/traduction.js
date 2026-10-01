const express = require('express');
const router = express.Router();

const LANGUES = {
  'fr': 'Français',
  'en': 'English',
  'ar': 'العربية',
  'sw': 'Kiswahili',
  'mg': 'Malagasy',
  'es': 'Español',
  'pt': 'Português',
  'de': 'Deutsch',
  'it': 'Italiano',
  'zh': '中文',
  'ja': '日本語',
  'ko': '한국어',
  'ru': 'Русский',
  'hi': 'हिन्दी',
  'bn': 'বাংলা',
  'tr': 'Türkçe',
  'nl': 'Nederlands',
  'pl': 'Polski',
  'sv': 'Svenska',
  'da': 'Dansk',
  'fi': 'Suomi',
  'no': 'Norsk',
  'el': 'Ελληνικά',
  'he': 'עברית',
  'fa': 'فارسی',
  'ur': 'اردو',
  'vi': 'Tiếng Việt',
  'th': 'ไทย',
  'id': 'Bahasa Indonesia',
  'ms': 'Bahasa Melayu',
  'ro': 'Română',
  'hu': 'Magyar',
  'cs': 'Čeština',
  'sk': 'Slovenčina',
  'bg': 'Български',
  'uk': 'Українська',
  'hr': 'Hrvatski',
  'ca': 'Català',
  'lt': 'Lietuvių',
  'lv': 'Latviešu',
  'et': 'Eesti',
  'sl': 'Slovenščina',
  'zdj': 'Shimaoré 🔵 Bêta',
  'buc': 'Kibushi 🔵 Bêta'
};

router.get('/langues', (req, res) => {
  res.json(LANGUES);
});

router.post('/', async (req, res) => {
  try {
    const { texte, langue_cible } = req.body;
    if (!texte || !langue_cible) {
      return res.status(400).json({ erreur: 'Texte et langue cible requis' });
    }

    if (langue_cible === 'zdj') {
      return res.json({
        texte_original: texte,
        traduction: `[Shimaoré Bêta] ${texte}`,
        langue: 'Shimaoré',
        beta: true
      });
    }

    if (langue_cible === 'buc') {
      return res.json({
        texte_original: texte,
        traduction: `[Kibushi Bêta] ${texte}`,
        langue: 'Kibushi',
        beta: true
      });
    }

    const { translate } = await import('@vitalets/google-translate-api');
    const resultat = await translate(texte, { from: 'fr', to: langue_cible });

    res.json({
      texte_original: texte,
      traduction: resultat.text,
      langue: LANGUES[langue_cible] || langue_cible,
      beta: false
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur de traduction' });
  }
});

module.exports = router;
