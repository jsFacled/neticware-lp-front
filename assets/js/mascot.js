// ===== Mascot behavior =====
document.addEventListener('DOMContentLoaded', () => {
  const mascot = document.querySelector('.mascot');
  if (!mascot) return;

  const hero = mascot.closest('#hero');
  if (hero) {
    const heroMascotSlot = mascot.parentElement;
    let image = mascot.querySelector('.mascot__image');
    let picture = image.closest('picture');
    const manifest = window.NETICWARE_IMAGES;
    if (!manifest || !picture) return;
    const message = mascot.querySelector('.mascot__message');
    const header = document.querySelector('.main-header');
    const services = document.querySelector('#services');
    const servicesHeading = services?.querySelector('.services-heading');
    const servicesMascotSlot = services?.querySelector('.services__mascot-slot');
    const servicesGrid = services?.querySelector('.services-grid');
    const aiAdoption = document.querySelector('#ai-adoption');
    const aiMascotSlot = aiAdoption?.querySelector('.ai-adoption__mascot-slot');
    const methodology = document.querySelector('#methodology');
    const contact = document.querySelector('#contact');
    const presenting = {
      alt: image.alt,
      width: image.width,
      height: image.height,
      message: message.textContent
    };
    const companion = {
      alt: 'Mascota de Neticware acompañando el recorrido',
      width: 1086,
      height: 1448,
      message: ''
    };
    const servicesIntro = {
      alt: 'Mascota de Neticware acompañando la introducción a los servicios',
      width: 1254,
      height: 1254,
      message: ''
    };
    const thinking = {
      alt: 'Mascota de Neticware pensando qué problema resolver',
      width: 1122,
      height: 1402,
      message: 'No empieces eligiendo una de estas. Empezá por lo que necesitás resolver.'
    };
    const pointing = {
      alt: 'Mascota de Neticware señalando el enfoque de adopción de IA',
      width: 1086,
      height: 1448,
      message: 'IA no siempre es la respuesta.'
    };
    const working = {
      alt: 'Mascota de Neticware trabajando en la metodología',
      width: 1122,
      height: 1402,
      message: 'Así lo hacemos.'
    };
    const contacting = {
      alt: 'Mascota de Neticware invitando a contar un desafío',
      width: 1122,
      height: 1402,
      message: 'Ahora contanos qué querés resolver.'
    };
    const celebrating = {
      alt: 'Mascota de Neticware celebrando el mensaje enviado',
      width: 1122,
      height: 1402,
      message: 'Listo. Ahora nos toca a nosotros.'
    };
    const poses = { presenting, companion, 'services-intro': servicesIntro, thinking, pointing, working, contact: contacting, celebrating };

    let contactSubmitted = false;

    const commitState = (state, prepared) => {
      const targetSlot = state === 'services-intro' ? servicesMascotSlot :
        state === 'pointing' ? aiMascotSlot : heroMascotSlot;
      if (targetSlot && mascot.parentElement !== targetSlot) targetSlot.append(mascot);

      const isPresenting = state === 'presenting';
      const pose = poses[state];
      mascot.classList.toggle('is-presenting', isPresenting);
      mascot.classList.toggle('is-companion', state === 'companion');
      mascot.classList.toggle('is-services-intro', state === 'services-intro');
      mascot.classList.toggle('is-thinking', state === 'thinking');
      mascot.classList.toggle('is-pointing', state === 'pointing');
      mascot.classList.toggle('is-working', state === 'working');
      mascot.classList.toggle('is-contact', state === 'contact');
      mascot.classList.toggle('is-celebrating', state === 'celebrating');
      mascot.dataset.mascotState = state;
      picture.replaceWith(prepared.picture);
      picture = prepared.picture;
      image = prepared.image;
      image.alt = pose.alt;
      image.width = pose.width;
      image.height = pose.height;
      message.textContent = pose.message;
      message.hidden = !pose.message;
    };

    const initialPicture = { picture, image };
    const images = createMascotImageController({
      initialState: mascot.dataset.mascotState,
      apply: commitState,
      prepare: async (state) => {
        if (state === 'presenting') {
          await initialPicture.image.decode();
          return initialPicture;
        }
        const asset = manifest[state];
        const nextPicture = document.createElement('picture');
        nextPicture.className = 'mascot__picture';
        const nextImage = new Image();
        nextImage.className = image.className;
        nextImage.width = asset.width;
        nextImage.height = asset.height;
        nextImage.alt = poses[state].alt;
        nextImage.decoding = 'async';
        nextImage.sizes = asset.sizes;
        nextPicture.append(nextImage);
        nextImage.srcset = asset.srcset;
        nextImage.src = asset.src;
        await nextImage.decode();
        return { picture: nextPicture, image: nextImage };
      }
    });
    const setState = state => { void images.show(state); };

    // Warm only the next relevant poses. The visible hero is discovered in HTML.
    const warmPoses = (states) => states.forEach(state => { void images.preload(state); });
    if ('IntersectionObserver' in window) {
      const sections = new Map([
        [services, ['companion', 'services-intro', 'thinking']],
        [aiAdoption, ['pointing']],
        [methodology, ['working']],
        [contact, ['contact', 'celebrating']]
      ].filter(([section]) => section));
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          warmPoses(sections.get(entry.target));
          observer.unobserve(entry.target);
        });
      }, { rootMargin: '180px 0px' });
      sections.forEach((_, section) => observer.observe(section));
    }

    const inSection = (section, headerBottom) => {
      if (!section) return false;
      const bounds = section.getBoundingClientRect();
      return bounds.top <= headerBottom + 16 && bounds.bottom > headerBottom + 24;
    };

    const inSectionTail = (section) => {
      const bottom = section.getBoundingClientRect().bottom;
      return bottom <= window.innerHeight + 60 && bottom > window.innerHeight - 100;
    };

    const keepInsideSection = (section) => {
      const clearance = window.innerWidth <= 640 ? 16 : 24;
      const bottom = Math.max(clearance,
        window.innerHeight - section.getBoundingClientRect().bottom + clearance);
      mascot.style.setProperty('--mascot-section-bottom', `${bottom}px`);
    };

    const updateState = () => {
      const headerBottom = header?.getBoundingClientRect().bottom ?? 0;
      const heroBottom = hero.getBoundingClientRect().bottom;
      const servicesTop = services?.getBoundingClientRect().top ?? Infinity;
      const servicesBottom = services?.getBoundingClientRect().bottom ?? -Infinity;
      const headingTop = servicesHeading?.getBoundingClientRect().top ?? Infinity;
      const servicesIntroVisible = headingTop <= window.innerHeight * .55 &&
        servicesBottom > headerBottom;
      if (heroBottom > headerBottom && !servicesIntroVisible) {
        setState('presenting');
        mascot.classList.remove('is-quiet');
        return;
      }

      if (inSection(contact, headerBottom)) {
        const compact = window.innerWidth < 1200;
        const showContact = contactSubmitted || (compact ? inSectionTail(contact) : true);
        if (compact) keepInsideSection(contact);
        setState(showContact ? (contactSubmitted ? 'celebrating' : 'contact') : 'companion');
        mascot.classList.toggle('is-quiet', !compact && !contactSubmitted &&
          contact.getBoundingClientRect().top < headerBottom - 180);
        return;
      }

      if (inSection(methodology, headerBottom)) {
        const compact = window.innerWidth < 1200;
        if (compact) keepInsideSection(methodology);
        setState(compact && !inSectionTail(methodology) ? 'companion' : 'working');
        mascot.classList.toggle('is-quiet', !compact &&
          methodology.getBoundingClientRect().top < headerBottom - 160);
        return;
      }

      mascot.classList.remove('is-quiet');

      const introDistance = Math.min(window.innerHeight * .55, 480);
      const cardsReached = servicesGrid?.getBoundingClientRect().top <= headerBottom + 48;
      if (servicesIntroVisible && !cardsReached) {
        setState('services-intro');
        return;
      }
      if (servicesIntroVisible && cardsReached &&
        servicesTop > headerBottom - introDistance) {
        setState('thinking');
        return;
      }

      const aiBounds = aiAdoption?.getBoundingClientRect();
      const inAiFeature = aiBounds && aiBounds.top <= window.innerHeight * .6 &&
        aiBounds.bottom > headerBottom + 24;
      setState(inAiFeature ? 'pointing' : 'companion');
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
    document.addEventListener('neticware:contact-success', () => {
      contactSubmitted = true;
      scheduleUpdate();
    });
    document.addEventListener('neticware:contact-reset', () => {
      contactSubmitted = false;
      scheduleUpdate();
    });
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
