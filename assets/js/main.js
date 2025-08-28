// ===== Interacciones básicas (menú hamburguesa, cierre al navegar) =====
document.addEventListener('DOMContentLoaded', () => {
  const hamburgerButton = document.querySelector('.hamburger-button');
  const hamburgerMenu = document.querySelector('.hamburger-menu');
  const closeBtn = document.querySelector('.close-button');

  if (hamburgerButton && hamburgerMenu) {
    hamburgerButton.addEventListener('click', () => {
      hamburgerMenu.classList.add('show');
      hamburgerMenu.setAttribute('aria-hidden', 'false');
    });
  }

  if (closeBtn && hamburgerMenu) {
    closeBtn.addEventListener('click', () => {
      hamburgerMenu.classList.remove('show');
      hamburgerMenu.setAttribute('aria-hidden', 'true');
    });
  }

  // Cierra el menú cuando se hace clic en un enlace del menú
  hamburgerMenu?.querySelectorAll('a')?.forEach((link) => {
    link.addEventListener('click', () => {
      hamburgerMenu.classList.remove('show');
      hamburgerMenu.setAttribute('aria-hidden', 'true');
    });
  });
});

// ===== Formulario de contacto con mensaje inline =====
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contactForm');
  const thankYou = document.getElementById('thankYouMessage');
  const newMessageBtn = document.getElementById('newMessageBtn');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const formData = new FormData(form);

      try {
        const response = await fetch("https://formsubmit.co/contacto@neticware.com.ar", {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          form.reset(); // limpia los campos
          form.style.display = "none";
          thankYou.style.display = "block";
        } else {
          alert("Hubo un error al enviar el formulario. Intentalo de nuevo.");
        }
      } catch (error) {
        alert("Error de conexión. Intentalo más tarde.");
      }
    });
  }

  if (newMessageBtn) {
    newMessageBtn.addEventListener('click', () => {
      thankYou.style.display = "none";
      form.style.display = "grid"; // vuelve a mostrar el formulario en modo grid
    });
  }
});

// ===== Services: overlay + efecto máquina de escribir =====
(function(){
  // Helpers
  const timers = new WeakMap();
  function typeIn(el, text, speed = 18){
    clearTimer(el);
    el.textContent = "";
    el.classList.add("typing-caret");
    let i = 0;
    const id = setInterval(() => {
      el.textContent += text[i] ?? "";
      i++;
      if (i > text.length){
        clearInterval(id);
        el.classList.remove("typing-caret");
      }
    }, speed);
    timers.set(el, id);
  }
  function clearTimer(el){
    const id = timers.get(el);
    if (id) clearInterval(id);
    timers.delete(el);
  }
  function resetType(el){
    clearTimer(el);
    if (el?.dataset.fulltext) el.textContent = "";
    el?.classList.remove("typing-caret");
  }

  // Guardar texto original
  document.querySelectorAll('.service-overlay p').forEach(p => {
    if (!p.dataset.fulltext) p.dataset.fulltext = p.textContent.trim();
    p.textContent = "";
  });

  const isDesktop = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // Desktop: escribe al hover
  if (isDesktop){
    document.querySelectorAll('.service-card').forEach(card => {
      const p = card.querySelector('.service-overlay p');
      card.addEventListener('mouseenter', () => {
        if (!p) return;
        resetType(p);
        typeIn(p, p.dataset.fulltext, 16);
      });
      card.addEventListener('mouseleave', () => resetType(p));
    });
  }

  // Mobile/touch: botón +
  document.querySelectorAll('.service-card .service-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = e.currentTarget.closest('.service-card');
      const p = card.querySelector('.service-overlay p');
      const opening = !card.classList.contains('is-open');
      card.classList.toggle('is-open', opening);
      if (opening){
        resetType(p);
        setTimeout(() => typeIn(p, p.dataset.fulltext, 20), 120);
      } else {
        resetType(p);
      }
    });
  });

  // Cerrar si se toca fuera (mobile)
  document.addEventListener('click', (e) => {
    document.querySelectorAll('.service-card.is-open').forEach(card => {
      if (!card.contains(e.target)) {
        const p = card.querySelector('.service-overlay p');
        card.classList.remove('is-open');
        resetType(p);
      }
    });
  });
})();


// **********************************************************************************************//
// About3 expandible
document.addEventListener('DOMContentLoaded', () => {
  const card = document.querySelector('.about3__card');
  const toggle = document.querySelector('.about3__toggle');
  toggle.addEventListener('click', () => {
    card.classList.toggle('expanded');
    toggle.textContent = card.classList.contains('expanded') ? "Ver menos" : "Ver más";
  });
});
