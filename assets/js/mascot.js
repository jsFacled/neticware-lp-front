// ===== Mascot behavior =====
document.addEventListener('DOMContentLoaded', () => {
  const mascot = document.querySelector('.mascot');
  if (!mascot) return;

  const hero = mascot.closest('#hero');
  if (hero) {
    const image = mascot.querySelector('.mascot__image');
    const message = mascot.querySelector('.mascot__message');
    const header = document.querySelector('.main-header');
    const presenting = {
      src: image.getAttribute('src'),
      alt: image.alt,
      width: image.width,
      height: image.height
    };
    const companion = {
      src: mascot.dataset.companionSrc,
      alt: 'Mascota de Neticware acompañando el recorrido',
      width: 1086,
      height: 1448
    };

    // Preload the second pose so it is ready when the hero leaves the viewport.
    const companionPreload = new Image();
    companionPreload.src = companion.src;

    const setState = (state) => {
      if (mascot.dataset.mascotState === state) return;

      const isPresenting = state === 'presenting';
      const pose = isPresenting ? presenting : companion;
      mascot.classList.toggle('is-presenting', isPresenting);
      mascot.classList.toggle('is-companion', !isPresenting);
      mascot.dataset.mascotState = state;
      image.src = pose.src;
      image.alt = pose.alt;
      image.width = pose.width;
      image.height = pose.height;
      message.hidden = !isPresenting;
    };

    const updateState = () => {
      const headerBottom = header?.getBoundingClientRect().bottom ?? 0;
      const heroBottom = hero.getBoundingClientRect().bottom;
      setState(heroBottom <= headerBottom ? 'companion' : 'presenting');
    };

    let framePending = false;
    const scheduleUpdate = () => {
      if (framePending) return;
      framePending = true;
      requestAnimationFrame(() => {
        framePending = false;
        updateState();
      });
    };

    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    updateState();
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
