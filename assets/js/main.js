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

