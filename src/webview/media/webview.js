(function () {
  const vscode = acquireVsCodeApi();

  const viewKey = document.body.getAttribute('data-view-key');
  const previousState = vscode.getState() || {};
  if (previousState.viewKey !== viewKey) {
    const scrollToTop = () => window.scrollTo(0, 0);
    scrollToTop();
    window.addEventListener('load', () => {
      scrollToTop();
      requestAnimationFrame(scrollToTop);
    });
  }
  vscode.setState({ ...previousState, viewKey });

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    if (target.id === 'btn-next') {
      vscode.postMessage({ type: 'next' });
      return;
    }
    if (target.id === 'btn-previous') {
      vscode.postMessage({ type: 'previous' });
      return;
    }
    if (target.id === 'btn-stop') {
      vscode.postMessage({ type: 'stop' });
      return;
    }
    if (target.classList.contains('tutoriais-cmd-run')) {
      const encoded = target.getAttribute('data-command-b64');
      if (encoded) {
        const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
        const command = new TextDecoder('utf-8').decode(bytes);
        vscode.postMessage({ type: 'runCommand', command });
      }
      return;
    }
    if (target.id === 'btn-verify') {
      target.setAttribute('disabled', 'true');
      target.textContent = 'Verificando…';
      vscode.postMessage({ type: 'verify' });
    }
  });
})();
