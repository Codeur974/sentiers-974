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
})();
