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
