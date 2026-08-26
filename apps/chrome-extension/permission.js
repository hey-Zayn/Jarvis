document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btnAllow');
  const status = document.getElementById('statusMsg');

  btn.onclick = async () => {
    btn.disabled = true;
    btn.textContent = 'Requesting permission...';
    status.textContent = '';

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      status.style.color = '#10b981';
      status.textContent = 'Microphone enabled successfully! Closing this tab...';
      btn.textContent = 'Enabled';
      setTimeout(() => {
        window.close();
      }, 1200);
    } catch (err) {
      console.error('Permission error:', err);
      status.style.color = '#ef4444';
      status.textContent = 'Microphone access was blocked. Please click the icon in the address bar to allow microphone.';
      btn.disabled = false;
      btn.textContent = 'Try Again';
    }
  };
});
