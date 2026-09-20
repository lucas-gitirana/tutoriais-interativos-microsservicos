(function () {
  const vscode = acquireVsCodeApi();

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
        const command = atob(encoded);
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
