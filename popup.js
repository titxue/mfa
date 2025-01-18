document.addEventListener('DOMContentLoaded', async () => {
  const accountInput = document.getElementById('account');
  const secretInput = document.getElementById('secret');
  const saveButton = document.getElementById('save');
  const totpDisplay = document.getElementById('totp');
  const timerBar = document.getElementById('timer-bar');

  // Load saved data
  const { account, secret } = await chrome.storage.sync.get(['account', 'secret']);
  if (account) accountInput.value = account;
  if (secret) secretInput.value = secret;

  // Save data
  saveButton.addEventListener('click', async () => {
    const account = accountInput.value;
    const secret = secretInput.value;
    await chrome.storage.sync.set({ account, secret });
  });

  // Update TOTP code and timer
  async function updateTOTP() {
    const secret = secretInput.value;
    if (!secret) {
      totpDisplay.textContent = '000000';
      return;
    }

    try {
      const code = await TOTP.generateTOTP(secret);
      totpDisplay.textContent = code;
    } catch (error) {
      totpDisplay.textContent = 'Error';
      console.error('TOTP generation error:', error);
    }
  }

  // Update timer bar
  function updateTimer() {
    const remainingSeconds = TOTP.getRemainingSeconds();
    const percentage = (remainingSeconds / 30) * 100;
    timerBar.style.width = `${percentage}%`;
    
    if (remainingSeconds === 30) {
      updateTOTP();
    }
  }

  // Initial update
  await updateTOTP();
  updateTimer();

  // Set up intervals
  setInterval(updateTimer, 1000);
}); 