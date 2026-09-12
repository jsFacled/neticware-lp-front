// ===== Mascot behavior =====
document.addEventListener('DOMContentLoaded', () => {
  const mascot = document.querySelector('.mascot');
  if (!mascot) return;

  // The Home starts with the existing mascot instance integrated into its hero.
  // No scroll or companion behavior is active in this first stage.
  if (mascot.closest('#hero')) {
    mascot.classList.add('is-presenting');
    mascot.dataset.mascotState = 'presenting';
    return;
  }

  // Preserve the existing behavior on pages outside the Home.
  mascot.addEventListener('mouseenter', () => {
    mascot.style.transform = 'scale(1.1)';
  });

  mascot.addEventListener('mouseleave', () => {
    mascot.style.transform = 'scale(1)';
  });
});
