// Año en footer
document.getElementById('year').textContent = new Date().getFullYear();

// Menú hamburguesa
const btn = document.getElementById('hamburgerBtn');
const menu = document.getElementById('hamburgerMenu');
const closeBtn = document.getElementById('closeMenu');

btn.addEventListener('click', () => {
  menu.classList.add('show');
  menu.setAttribute('aria-hidden', 'false');
});
closeBtn.addEventListener('click', () => {
  menu.classList.remove('show');
  menu.setAttribute('aria-hidden', 'true');
});
// Cerrar al hacer clic en un enlace
menu.querySelectorAll('a').forEach(a =>
  a.addEventListener('click', () => menu.classList.remove('show'))
);

// Formulario: mailto (GitHub Pages)
document.getElementById('contactForm').addEventListener('submit', e => {
  e.preventDefault();
  const nombre = document.getElementById('nombre').value.trim();
  const email  = document.getElementById('email').value.trim();
  const mensaje= document.getElementById('mensaje').value.trim();
  const DESTINO = 'contacto@neticware.com.ar'; // cámbialo si usás otro
  const subject = encodeURIComponent(`Consulta — ${nombre}`);
  const body = encodeURIComponent(`Nombre: ${nombre}\nEmail: ${email}\n\nMensaje:\n${mensaje}`);
  window.location.href = `mailto:${DESTINO}?subject=${subject}&body=${body}`;
});
