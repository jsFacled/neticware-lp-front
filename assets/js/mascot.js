// ===== Mascot behavior =====
document.addEventListener('DOMContentLoaded', () => {
  const mascot = document.querySelector('.mascot');
  if (!mascot) return;

  const hero = mascot.closest('#hero');
  if (hero) {
    const image = mascot.querySelector('.mascot__image');
    const message = mascot.querySelector('.mascot__message');
    const header = document.querySelector('.main-header');
    const services = document.querySelector('#services');
    const aiAdoption = document.querySelector('#ai-adoption');
    const aiActions = aiAdoption?.querySelector('.ai-adoption__actions');
    const presenting = {
      src: image.getAttribute('src'),
      alt: image.alt,
      width: image.width,
      height: image.height,
      message: message.textContent
    };
    const companion = {
      src: mascot.dataset.companionSrc,
      alt: 'Mascota de Neticware acompañando el recorrido',
      width: 1086,
      height: 1448,
      message: ''
    };
    const thinking = {
      src: mascot.dataset.thinkingSrc,
      alt: 'Mascota de Neticware pensando qué problema resolver',
      width: 1122,
      height: 1402,
      message: 'No empieces eligiendo una de estas. Empezá por lo que necesitás resolver.'
    };
    const pointing = {
      src: mascot.dataset.pointingSrc,
      alt: 'Mascota de Neticware señalando el enfoque de adopción de IA',
      width: 1086,
      height: 1448,
      message: 'IA no siempre es la respuesta.'
    };
    const poses = { presenting, companion, thinking, pointing };

    // Have the companion pose ready when the hero leaves the viewport.
    const companionPreload = new Image();
    companionPreload.src = companion.src;
    let thinkingPreload;
    let pointingPreload;

    const setState = (state) => {
      if (mascot.dataset.mascotState === state) return;

      const isPresenting = state === 'presenting';
      const pose = poses[state];
      mascot.classList.toggle('is-presenting', isPresenting);
      mascot.classList.toggle('is-companion', state === 'companion');
      mascot.classList.toggle('is-thinking', state === 'thinking');
      mascot.classList.toggle('is-pointing', state === 'pointing');
      mascot.dataset.mascotState = state;
      image.src = pose.src;
      image.alt = pose.alt;
      image.width = pose.width;
      image.height = pose.height;
      message.textContent = pose.message;
      message.hidden = !pose.message;
    };

    const updateState = () => {
      const headerBottom = header?.getBoundingClientRect().bottom ?? 0;
      const heroBottom = hero.getBoundingClientRect().bottom;
      if (heroBottom > headerBottom) {
        setState('presenting');
        return;
      }

      const servicesTop = services?.getBoundingClientRect().top ?? Infinity;
      const introDistance = Math.min(window.innerHeight * .55, 480);
      const inServicesIntro = servicesTop <= headerBottom + 16 &&
        servicesTop > headerBottom - introDistance;
      if (inServicesIntro) {
        setState('thinking');
        return;
      }

      const aiTop = aiAdoption?.getBoundingClientRect().top ?? Infinity;
      let inAiIntro = false;
      if (aiActions && window.innerWidth < 1100) {
        const aiBottom = aiAdoption.getBoundingClientRect().bottom;
        const actionsBottom = aiActions.getBoundingClientRect().bottom;
        const dialogueTop = window.innerHeight - (window.innerWidth <= 640 ? 100 :
          window.innerWidth <= 768 ? 150 : 170);
        const exitSlack = window.innerWidth <= 640 ? 70 : 0;
        inAiIntro = actionsBottom < dialogueTop && aiBottom > dialogueTop - exitSlack;
      } else {
        const aiIntroDistance = Math.min(window.innerHeight * .42, 320);
        inAiIntro = aiTop <= headerBottom + 16 &&
          aiTop > headerBottom - aiIntroDistance;
      }
      setState(inAiIntro ? 'pointing' : 'companion');
    };

    let framePending = false;
    const scheduleUpdate = () => {
      if (!thinkingPreload) {
        thinkingPreload = new Image();
        thinkingPreload.src = thinking.src;
      }
      if (!pointingPreload) {
        pointingPreload = new Image();
        pointingPreload.src = pointing.src;
      }
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
