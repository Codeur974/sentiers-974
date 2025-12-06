(function() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token') || '';
  const appLinkPath = `sentiers974:///reset-password?token=${encodeURIComponent(token)}`;
  const appLinkHost = `sentiers974://reset-password?token=${encodeURIComponent(token)}`;
  const webLink = `${window.location.origin}/reset-password?token=${encodeURIComponent(token)}`;

  document.getElementById('deepLinkBtn').addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = appLinkPath;
    setTimeout(() => {
      window.location.href = appLinkHost;
    }, 300);
  });
  document.getElementById('deepLinkBtn').href = appLinkPath;
  document.getElementById('deepLinkText').textContent = `${appLinkPath}\n(alt : ${appLinkHost})`;
  document.getElementById('webLink').href = webLink;

  // Toggle mot de passe
  const passwordInput = document.getElementById('passwordInput');
  const confirmInput = document.getElementById('confirmInput');
  const togglePassword = document.getElementById('togglePassword');
  const toggleConfirm = document.getElementById('toggleConfirm');
  const statusMessage = document.getElementById('statusMessage');
  const submitBtn = document.getElementById('submitBtn');
  const form = document.getElementById('resetForm');

  const toggleVisibility = (input, button) => {
    if (!input || !button) return;
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    button.textContent = isPassword ? 'Masquer' : 'Afficher';
  };

  togglePassword?.addEventListener('click', () => toggleVisibility(passwordInput, togglePassword));
  toggleConfirm?.addEventListener('click', () => toggleVisibility(confirmInput, toggleConfirm));

  // Soumission du formulaire web -> /api/auth/reset/confirm
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!passwordInput || !confirmInput || !statusMessage || !submitBtn) return;

    const password = passwordInput.value.trim();
    const confirmPassword = confirmInput.value.trim();
    statusMessage.style.color = '#666';
    statusMessage.textContent = '';

    if (password.length < 8) {
      statusMessage.style.color = '#d14343';
      statusMessage.textContent = 'Le mot de passe doit contenir au moins 8 caracteres.';
      return;
    }
    if (password !== confirmPassword) {
      statusMessage.style.color = '#d14343';
      statusMessage.textContent = 'Les mots de passe ne correspondent pas.';
      return;
    }
    if (!token) {
      statusMessage.style.color = '#d14343';
      statusMessage.textContent = "Token manquant dans l'URL.";
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Envoi...';
    try {
      const res = await fetch('/api/auth/reset/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok || data?.success === false) {
        throw new Error(data?.error || 'Echec de la reinitialisation');
      }
      statusMessage.style.color = '#0f5cc0';
      statusMessage.textContent = "Mot de passe mis a jour. Vous pouvez retourner dans l'app et vous reconnecter.";
    } catch (err) {
      statusMessage.style.color = '#d14343';
      statusMessage.textContent = err?.message || 'Erreur lors de la reinitialisation.';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Valider le nouveau mot de passe';
    }
  });
})();
