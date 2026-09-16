// Install UI is independent of Firebase loading. Chrome controls eligibility.
(() => {
  const button = document.getElementById('install-btn');
  const standalone = window.matchMedia('(display-mode: standalone)');
  let installPrompt = null;

  window.addEventListener('beforeinstallprompt', (event) => {
    if (standalone.matches) return;
    event.preventDefault();
    installPrompt = event;
    button.hidden = false;
  });

  button.addEventListener('click', async () => {
    if (!installPrompt) return;
    const prompt = installPrompt;
    installPrompt = null;
    button.hidden = true;
    try {
      await prompt.prompt();
      await prompt.userChoice;
    } catch (error) {
      console.error('Install prompt failed', error);
    }
  });

  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    button.hidden = true;
  });
  standalone.addEventListener('change', () => {
    if (standalone.matches) {
      installPrompt = null;
      button.hidden = true;
    }
  });
})();
