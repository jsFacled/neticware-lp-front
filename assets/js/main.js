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

// ===== Formulario de contacto con validaciones =====
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contactForm');
  const thankYou = document.getElementById('thankYouMessage');
  const newMessageBtn = document.getElementById('newMessageBtn');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      // 1. Validación HTML5 básica (required, pattern, minlength, etc.)
      if (!form.checkValidity()) {
        form.reportValidity(); 
        return;
      }

      // 2. Validación extra de email con regex más estricto
      const emailRegex = /^(?!.*\.\.)(?!.*\.$)(?!^\.)[a-zA-Z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z]{2,})+$/;
      const emailValue = form.email.value.trim();

      if (!emailRegex.test(emailValue)) {
        alert("Por favor ingresá un correo válido con dominio real (ejemplo: nombre@dominio.com).");
        return;
      }

      // 3. Validación extra de teléfono (si el usuario lo completa)
      const phoneValue = form.phone.value.trim();
      if (phoneValue && !/^\+?[0-9\s\-]{8,15}$/.test(phoneValue)) {
        alert("El teléfono debe tener entre 8 y 15 dígitos (se permiten +, espacios y guiones).");
        return;
      }

      // Datos a enviar
      const data = {
        name: form.name.value.trim(),
        email: emailValue,
        phone: phoneValue,
        message: form.message.value.trim(),
        _subject: "Nueva consulta desde neticware.com.ar",
        _captcha: "false",
        _template: "box"
      };

      try {
        const response = await fetch("https://formsubmit.co/ajax/ef7d59049898d7f53426aae769f74ea4", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify(data)
        });

        if (response.ok) {
          form.reset();
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
      form.style.display = "grid";
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

//Detecta si la URL es /servicios, /nosotros, etc. Si coincide, hace scroll automático hasta esa sección.
document.addEventListener("DOMContentLoaded", () => {
  // Rutas limpias → ID de sección
  const routes = {
    "/servicios": "#services",
    "/nosotros": "#about",
    "/stack": "#stack",
    "/enfoque": "#approach",
    "/metodologia": "#methodology",
    "/contacto": "#contact"
  };

  const path = window.location.pathname.toLowerCase();

  if (routes[path]) {
    const section = document.querySelector(routes[path]);
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    }
  }
});
