const nodemailer = require('nodemailer');

// Configuration Gmail — à remplir avec tes identifiants
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function envoyerConfirmationCommande(commande) {
  const { acheteur_nom, acheteur_email, produit_nom, quantite, total, commande_id } = commande;
  
  const mailOptions = {
    from: `"Chanbé IA Market" <${process.env.EMAIL_USER}>`,
    to: acheteur_email,
    subject: `✅ Commande #${commande_id} confirmée !`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 500px; margin: 0 auto; padding: 2rem;">
        <h2 style="color: #0a2e36;">Bonjour ${acheteur_nom} !</h2>
        <p>Votre commande a bien été enregistrée.</p>
        <div style="background: #f7f2e9; padding: 1rem; border-radius: 10px; margin: 1rem 0;">
          <p><strong>Produit :</strong> ${produit_nom}</p>
          <p><strong>Quantité :</strong> ${quantite}</p>
          <p><strong>Total :</strong> ${total} €</p>
          <p><strong>Référence :</strong> #${commande_id}</p>
        </div>
        <p style="color: #e8724c; font-weight: 600;">Merci pour votre achat ! 🎉</p>
        <p style="font-size: 0.85rem; color: #888;">Chanbé IA — Mayotte Market</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 Email envoyé à ${acheteur_email}`);
    return true;
  } catch (err) {
    console.error('❌ Erreur email:', err.message);
    return false;
  }
}

module.exports = { envoyerConfirmationCommande };
