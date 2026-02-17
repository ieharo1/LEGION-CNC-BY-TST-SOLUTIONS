const WHATSAPP = "593998631238";
const ADMIN_PASS = "legion2026";

const defaultCategories = [
  { id: 1, name: "Router" },
  { id: 2, name: "Láser" },
  { id: 3, name: "Plasma" }
];

const defaultProducts = [
  { id: 1, name: "Router CNC Titan X5", category: "Router", price: "USD 18,900", image: "https://placehold.co/400x300/1a1a2e/fff?text=Router+CNC", specs: ["Área: 1300 x 2500 mm", "Potencia: 9 kW", "Velocidad: 25,000 mm/min"], details: ["Estructura de acero reforzado", "Control DSP industrial", "Sistema de aspiración"] },
  { id: 2, name: "Láser CNC Photon 1530", category: "Láser", price: "USD 24,500", image: "https://placehold.co/400x300/16213e/fff?text=L%C3%A1ser+CNC", specs: ["Potencia: 3000W", "Mesa: 1500 x 3000 mm", "Precisión: ±0.02 mm"], details: ["Fuente fibra óptica", "Cabezal autofocus", "Software nesting"] },
  { id: 3, name: "Plasma CNC Forge 2040", category: "Plasma", price: "USD 15,700", image: "https://placehold.co/400x300/0f3460/fff?text=Plasma+CNC", specs: ["Área: 2000 x 4000 mm", "Espesor: hasta 30 mm", "THC automático"], details: ["Antorcha alto rendimiento", "Control altura tiempo real", "Estructura anti vibración"] }
];

let categories = JSON.parse(localStorage.getItem('legionCategories')) || defaultCategories;
let products = JSON.parse(localStorage.getItem('legionProducts')) || defaultProducts;
if (!categories.length || !products.length || typeof products[0] === 'undefined' || !products[0].name) {
  localStorage.removeItem('legionCategories');
  localStorage.removeItem('legionProducts');
  localStorage.removeItem('legionCart');
  localStorage.removeItem('legionAdmin');
  categories = JSON.parse(JSON.stringify(defaultCategories));
  products = JSON.parse(JSON.stringify(defaultProducts));
  localStorage.setItem('legionCategories', JSON.stringify(categories));
  localStorage.setItem('legionProducts', JSON.stringify(products));
}
let cart = JSON.parse(localStorage.getItem('legionCart')) || [];
let isLoggedIn = localStorage.getItem('legionAdmin') === 'true';
let editingId = null;
let editingCategoryId = null;
let activeCategory = 'all';
let imgBase64 = '';
let slide = 0, slideTimer;
let videoSlide = 0;

const testimonials = [
  { name: "Carlos Méndez", company: "Metalúrgica Andina", opinion: "La implementación del láser CNC redujo nuestros tiempos de corte en 42%. Soporte técnico excepcional.", stars: 5 },
  { name: "Ana Torres", company: "Muebles TecnoWood", opinion: "El router CNCelevó nuestro acabado y precisión. La asesoría fue clave.", stars: 5 },
  { name: "Javier Ríos", company: "Industrias FerroMax", opinion: "Equipo robusto y muy estable en producción continua. Totalmente recomendados!", stars: 5 }
];

const $ = id => document.getElementById(id);

function saveData() {
  localStorage.setItem('legionCategories', JSON.stringify(categories));
  localStorage.setItem('legionProducts', JSON.stringify(products));
  localStorage.setItem('legionCart', JSON.stringify(cart));
}

function toast(msg, type = 'error') {
  const t = $('toast');
  t.textContent = msg;
  t.className = 'toast show' + (type === 'success' ? ' success' : '');
  setTimeout(() => t.classList.remove('show'), 3000);
}

function initTheme() {
  const theme = localStorage.getItem('legionTheme') || 'light';
  document.documentElement.setAttribute('data-theme', theme);
  if ($('themeToggle')) $('themeToggle').textContent = theme === 'light' ? '☀️' : '🌙';
}

function renderCategoryTabs() {
  let html = '<button class="category-tab active" data-category="all">Todos</button>';
  categories.forEach(c => {
    html += `<button class="category-tab" data-category="${c.name}">${c.name}</button>`;
  });
  $('categoryTabs').innerHTML = html;
}

function initEvents() {
  $('categoryTabs').onclick = e => {
    const tab = e.target.closest('.category-tab');
    if (!tab) return;
    document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    activeCategory = tab.dataset.category;
    renderProducts();
  };
  $('themeToggle').onclick = () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('legionTheme', next);
    $('themeToggle').textContent = next === 'light' ? '☀️' : '🌙';
  };
  $('searchBtn').onclick = () => renderProducts($('searchInput').value);
  $('searchInput').onkeyup = e => { if(e.key === 'Enter') renderProducts($('searchInput').value); };
  $('productImageFile').onchange = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = evt => { imgBase64 = evt.target.result; $('imgPreview').innerHTML = `<img src="${imgBase64}">`; };
    r.readAsDataURL(file);
  };
  $('closeModal').onclick = closeModal;
  $('productModal').onclick = e => { if(e.target === $('productModal')) closeModal(); };
  $('cartBtn').onclick = openCart;
  $('closeCart').onclick = closeCart;
  $('continueShopping').onclick = closeCart;
  $('checkoutBtn').onclick = checkout;
  $('adminBtn').onclick = () => isLoggedIn ? openAdmin() : showLogin();
  $('closeAdmin').onclick = closeAdmin;
  $('adminPanel').onclick = e => { if(e.target === $('adminPanel')) closeAdmin(); };
  $('loginSubmit').onclick = login;
  $('closeLogin').onclick = closeLogin;
  $('loginModal').onclick = e => { if(e.target === $('loginModal')) closeLogin(); };
  $('adminPassword').onkeypress = e => { if(e.key === 'Enter') login(); };
  $('saveProductBtn').onclick = saveProduct;
  $('clearFormBtn').onclick = resetForm;
  $('newProductBtn').onclick = () => { resetForm(); switchTab('form'); };
  $('newCategoryBtn').onclick = () => { $('categoryName').value = ''; editingCategoryId = null; $('categoryFormTitle').textContent = 'Agregar Categoría'; switchTab('category-form'); };
  $('saveCategoryBtn').onclick = saveCategory;
  $('clearCategoryBtn').onclick = () => { $('categoryName').value = ''; editingCategoryId = null; };
  document.querySelectorAll('.admin-tab').forEach(t => t.onclick = () => switchTab(t.dataset.tab));
  $('sliderDots').onclick = e => { const dot = e.target.closest('.slider-dot'); if (!dot) return; clearInterval(slideTimer); goSlide(parseInt(dot.dataset.i)); startSlide(); };
}

function renderProducts(filter = '') {
  let filtered = products.filter(p => p && p.name && p.category);
  if (activeCategory !== 'all') {
    filtered = filtered.filter(p => p.category === activeCategory);
  }
  if (filter) {
    const search = filter.toLowerCase();
    filtered = filtered.filter(p => p.name.toLowerCase().includes(search) || p.category.toLowerCase().includes(search));
  }
  
  if (!filtered.length) {
    $('productsGrid').innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:40px">No hay productos en esta categoría</p>';
    return;
  }
  
  $('productsGrid').innerHTML = filtered.map(p => `
    <article class="product-card reveal visible">
      <div class="product-img"><img src="${p.image}" alt="${p.name}"><span class="product-badge">${p.category}</span></div>
      <div class="product-body">
        <h3 class="product-name">${p.name}</h3>
        <p class="product-price">${p.price}</p>
        <ul class="product-specs">${(p.specs || []).map(s => `<li>${s}</li>`).join('')}</ul>
        <div class="product-actions">
          <button class="btn btn-outline btn-sm" onclick="openModal(${p.id})">Detalles</button>
          <button class="btn btn-primary btn-sm" onclick="addToCart(${p.id})">Agregar</button>
        </div>
      </div>
    </article>
  `).join('');
}

window.openModal = function(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  $('modalBody').innerHTML = `<h3>${p.name}</h3><p class="modal-price">${p.price}</p><div class="modal-grid"><img src="${p.image}" alt="${p.name}"><div><h4>Especificaciones</h4><ul class="product-specs">${p.details.map(s => `<li>${s}</li>`).join('')}</ul></div></div><button class="btn btn-primary" onclick="addToCart(${p.id});closeModal();" style="margin-top:22px">Agregar al Carrito</button>`;
  $('productModal').classList.add('open');
  document.body.style.overflow = 'hidden';
};
function closeModal() { $('productModal').classList.remove('open'); document.body.style.overflow = ''; }

window.addToCart = function(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  const exist = cart.find(x => x.id === id);
  if (exist) exist.qty++;
  else cart.push({ ...p, qty: 1 });
  saveData();
  updateCartCount();
  toast(`${p.name} agregado`, 'success');
};
function updateCartCount() { $('cartCount').textContent = cart.reduce((s, i) => s + i.qty, 0); }

function renderCart() {
  if (!cart.length) {
    $('cartItems').innerHTML = '<div class="cart-empty">Carrito vacío</div>';
    $('cartTotal').textContent = 'USD 0';
    $('checkoutBtn').style.display = 'none';
    return;
  }
  $('checkoutBtn').style.display = 'inline-flex';
  $('cartItems').innerHTML = cart.map(item => `<div class="cart-item"><img src="${item.image}" alt="${item.name}"><div class="cart-item-info"><div class="cart-item-name">${item.name}</div><div class="cart-item-price">${item.price}</div><div class="cart-qty"><button onclick="changeQty(${item.id},-1)">-</button><span>${item.qty}</span><button onclick="changeQty(${item.id},1)">+</button></div></div><button class="cart-remove" onclick="removeItem(${item.id})">X</button></div>`).join('');
  const total = cart.reduce((s, i) => s + parseInt(i.price.replace(/\D/g,'')) * i.qty, 0);
  $('cartTotal').textContent = 'USD ' + total.toLocaleString();
}
window.changeQty = function(id, d) { const item = cart.find(x => x.id === id); if (!item) return; item.qty += d; if (item.qty <= 0) cart = cart.filter(x => x.id !== id); saveData(); updateCartCount(); renderCart(); };
window.removeItem = function(id) { cart = cart.filter(x => x.id !== id); saveData(); updateCartCount(); renderCart(); };
function openCart() { renderCart(); $('cartModal').classList.add('open'); document.body.style.overflow = 'hidden'; }
function closeCart() { $('cartModal').classList.remove('open'); document.body.style.overflow = ''; }
function checkout() {
  if (!cart.length) return;
  let msg = "Hola! Quiero información:%0A%0A";
  cart.forEach(i => msg += `- ${i.name} (${i.price}) x${i.qty}%0A`);
  const total = cart.reduce((s, i) => s + parseInt(i.price.replace(/\D/g,'')) * i.qty, 0);
  msg += "%0ATotal: USD " + total.toLocaleString();
  window.open(`https://wa.me/${WHATSAPP}?text=${msg}`, '_blank');
}

function renderTestimonials() {
  $('testimonialsTrack').innerHTML = testimonials.map(t => `<div class="testimonial-card"><div class="testimonial-stars">${'★'.repeat(t.stars)}</div><p>"${t.opinion}"</p><div class="testimonial-author">${t.name}</div><div class="testimonial-company">${t.company}</div></div>`).join('');
  $('sliderDots').innerHTML = testimonials.map((_, i) => `<button class="slider-dot ${i===0?'active':''}" data-i="${i}"></button>`).join('');
}
function goSlide(i) { slide = (i + testimonials.length) % testimonials.length; $('testimonialsTrack').style.transform = `translateX(-${slide * 100}%)`; document.querySelectorAll('.slider-dot').forEach((d, x) => d.classList.toggle('active', x === slide)); }
function startSlide() { slideTimer = setInterval(() => goSlide(slide + 1), 5000); }

function initVideoSlider() {
  const track = $('videoTrack');
  const prevBtn = $('videoPrev');
  const nextBtn = $('videoNext');
  const dotsContainer = $('videoDots');
  const videosSection = document.querySelector('.videos-section');
  
  if (!track || !prevBtn || !nextBtn || !dotsContainer) return;
  
  const slides = track.querySelectorAll('.video-slide');
  const total = slides.length;
  if (total === 0) return;
  
  dotsContainer.innerHTML = Array(total).fill(0).map((_, i) => `<button class="video-dot ${i===0?'active':''}" data-i="${i}"></button>`).join('');
  
  let videoTimer = null;
  let isPaused = false;
  
  window.goVideoSlide = function(i) {
    videoSlide = (i + total) % total;
    track.style.transform = `translateX(-${videoSlide * 100}%)`;
    document.querySelectorAll('.video-dot').forEach((d, x) => d.classList.toggle('active', x === videoSlide));
  };
  
  function startTimer() {
    if (videoTimer) clearInterval(videoTimer);
    if (!isPaused) {
      videoTimer = setInterval(() => {
        goVideoSlide(videoSlide + 1);
      }, 6000);
    }
  }
  
  function pauseSlider() {
    isPaused = true;
    if (videoTimer) clearInterval(videoTimer);
    videoTimer = null;
  }
  
  function resumeSlider() {
    isPaused = false;
    startTimer();
  }
  
  startTimer();
  
  prevBtn.addEventListener('click', function() { 
    goVideoSlide(videoSlide - 1); 
    resumeSlider();
  });
  nextBtn.addEventListener('click', function() { 
    goVideoSlide(videoSlide + 1); 
    resumeSlider();
  });
  dotsContainer.addEventListener('click', function(e) { 
    const dot = e.target.closest('.video-dot'); 
    if (!dot) return; 
    goVideoSlide(parseInt(dot.dataset.i)); 
    resumeSlider();
  });
  
  if (videosSection) {
    videosSection.addEventListener('mouseenter', function() {
      pauseSlider();
    });
    videosSection.addEventListener('mouseleave', function() {
      resumeSlider();
    });
  }
  
  track.querySelectorAll('iframe').forEach(iframe => {
    iframe.addEventListener('click', function(e) {
      e.stopPropagation();
      pauseSlider();
    });
  });
}

function initContact() {
  const form = $('contactForm'), emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  form.querySelectorAll('input,select,textarea').forEach(f => { f.addEventListener('blur', () => validate(f)); f.addEventListener('input', () => { if(f.parentElement.classList.contains('invalid')) validate(f); }); });
  function validate(f) { const p = f.parentElement; let ok = true; if (f.name === 'email') ok = emailRe.test(f.value); else if (f.name === 'phone') ok = /^[\d\s-+]{7,}$/.test(f.value); else if (f.name === 'message') ok = f.value.length >= 20; else ok = f.value.trim() !== ''; p.classList.toggle('invalid', !ok); return ok; }
  form.onsubmit = e => { e.preventDefault(); const fields = [...form.querySelectorAll('[name]')]; if (fields.every(validate)) { const d = new FormData(form); let msg = `Hola! Soy ${d.get('name')} de ${d.get('company')}. Interesado en: ${d.get('machine')}%0A%0AMensaje: ${d.get('message')}`; window.open(`https://wa.me/${WHATSAPP}?text=${msg}`, '_blank'); $('successMsg').style.display = 'block'; form.reset(); setTimeout(() => $('successMsg').style.display = 'none', 4000); } };
}

function initScroll() {
  const onScroll = () => { const st = window.scrollY; $('navbar').classList.toggle('scrolled', st > 50); $('backTop').classList.toggle('show', st > 500); const h = document.documentElement.scrollHeight - window.innerHeight; $('progress').style.width = (st / h * 100) + '%'; };
  window.addEventListener('scroll', onScroll); onScroll();
  $('backTop').onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
}

function initReveal() { const obs = new IntersectionObserver(ents => ents.forEach(e => { if(e.isIntersecting){ e.target.classList.add('visible'); obs.unobserve(e.target); }}), { threshold: 0.1 }); document.querySelectorAll('.reveal').forEach(el => obs.observe(el)); }

function initMenu() { $('menuBtn').onclick = () => $('navLinks').classList.toggle('mobile'); $('navLinks').querySelectorAll('a').forEach(a => a.onclick = () => $('navLinks').classList.remove('mobile')); }

function updateAdminBtn() { $('adminBtn').classList.toggle('active', isLoggedIn); }
function showLogin() { $('loginModal').classList.add('open'); document.body.style.overflow = 'hidden'; }
function closeLogin() { $('loginModal').classList.remove('open'); $('adminPassword').value = ''; $('loginError').style.display = 'none'; document.body.style.overflow = ''; }
function login() { if ($('adminPassword').value === ADMIN_PASS) { isLoggedIn = true; localStorage.setItem('legionAdmin', 'true'); closeLogin(); openAdmin(); updateAdminBtn(); toast('Bienvenido', 'success'); } else { $('loginError').style.display = 'block'; } }
function openAdmin() { $('adminPanel').classList.add('open'); document.body.style.overflow = 'hidden'; renderAdminProducts(); renderAdminCategories(); updateCategorySelect(); }
function closeAdmin() { $('adminPanel').classList.remove('open'); document.body.style.overflow = ''; editingId = null; editingCategoryId = null; }

function renderAdminProducts() {
  $('adminProductsBody').innerHTML = products.map(p => `<tr><td><img src="${p.image}" alt="${p.name}"></td><td>${p.name}</td><td>${p.category}</td><td>${p.price}</td><td><div class="admin-actions"><button class="edit-btn" onclick="editProduct(${p.id})"><i class="fas fa-pen-to-square"></i></button><button class="delete-btn" onclick="deleteProduct(${p.id})"><i class="fas fa-trash"></i></button></div></td></tr>`).join('');
}

function renderAdminCategories() {
  $('adminCategoriesBody').innerHTML = categories.map(c => `<tr><td>${c.id}</td><td>${c.name}</td><td>${products.filter(p => p.category === c.name).length}</td><td><div class="admin-actions"><button class="edit-btn" onclick="editCategory(${c.id})"><i class="fas fa-pen-to-square"></i></button><button class="delete-btn" onclick="deleteCategory(${c.id})"><i class="fas fa-trash"></i></button></div></td></tr>`).join('');
}

function updateCategorySelect() {
  let html = '<option value="">Seleccionar</option>';
  categories.forEach(c => html += `<option value="${c.name}">${c.name}</option>`);
  $('productCategory').innerHTML = html;
}

window.editProduct = function(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  editingId = id;
  $('productName').value = p.name;
  $('productCategory').value = p.category;
  $('productPrice').value = p.price;
  $('productSpecs').value = p.specs.join('\n');
  $('productDetails').value = p.details.join('\n');
  $('imgPreview').innerHTML = `<img src="${p.image}">`;
  imgBase64 = p.image;
  $('formTitle').textContent = 'Editar Producto';
  switchTab('form');
};

window.deleteProduct = function(id) { if (!confirm('¿Eliminar?')) return; products = products.filter(x => x.id !== id); saveData(); renderProducts(); renderAdminProducts(); toast('Eliminado', 'success'); };

window.editCategory = function(id) {
  const c = categories.find(x => x.id === id);
  if (!c) return;
  editingCategoryId = id;
  $('categoryName').value = c.name;
  $('categoryFormTitle').textContent = 'Editar Categoría';
  switchTab('category-form');
};

window.deleteCategory = function(id) {
  const c = categories.find(x => x.id === id);
  if (!c) return;
  if (products.some(p => p.category === c.name)) { toast('No puedes eliminar categorías con productos'); return; }
  if (!confirm('¿Eliminar?')) return;
  categories = categories.filter(x => x.id !== id);
  saveData();
  renderCategoryTabs();
  renderAdminCategories();
  updateCategorySelect();
  toast('Categoría eliminada', 'success');
};

function switchTab(tab) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('.admin-content').forEach(c => c.classList.toggle('active', c.id === 'admin-' + tab));
}

function saveProduct() {
  const name = $('productName').value.trim();
  const category = $('productCategory').value;
  const price = $('productPrice').value.trim();
  const specs = $('productSpecs').value.trim().split('\n').filter(x => x.trim());
  const details = $('productDetails').value.trim().split('\n').filter(x => x.trim());

  if (!name || !category || !price || !imgBase64) { toast('Completa todos los campos'); return; }

  if (editingId) {
    const i = products.findIndex(x => x.id === editingId);
    if (i >= 0) products[i] = { ...products[i], name, category, price, image: imgBase64, specs, details };
    toast('Actualizado', 'success');
  } else {
    const newId = products.length ? Math.max(...products.map(p => p.id)) + 1 : 1;
    products.push({ id: newId, name, category, price, image: imgBase64, specs, details });
    toast('Agregado', 'success');
  }

  saveData();
  renderProducts();
  renderAdminProducts();
  renderCategoryTabs();
  resetForm();
}

function saveCategory() {
  const name = $('categoryName').value.trim();
  if (!name) { toast('Ingresa el nombre de la categoría'); return; }
  if (editingCategoryId) {
    const i = categories.findIndex(x => x.id === editingCategoryId);
    if (i >= 0) categories[i] = { ...categories[i], name };
    toast('Categoría actualizada', 'success');
  } else {
    const newId = categories.length ? Math.max(...categories.map(c => c.id)) + 1 : 1;
    categories.push({ id: newId, name });
    toast('Categoría agregada', 'success');
  }
  saveData();
  renderCategoryTabs();
  renderAdminCategories();
  updateCategorySelect();
  $('categoryName').value = '';
  editingCategoryId = null;
  $('categoryFormTitle').textContent = 'Agregar Categoría';
}

function resetForm() {
  editingId = null;
  $('productName').value = '';
  $('productCategory').value = '';
  $('productPrice').value = '';
  $('productSpecs').value = '';
  $('productDetails').value = '';
  $('productImageFile').value = '';
  imgBase64 = '';
  $('imgPreview').innerHTML = '<span>Vista previa</span>';
  $('formTitle').textContent = 'Agregar Producto';
}

function init() {
  initTheme();
  updateAdminBtn();
  renderCategoryTabs();
  renderProducts();
  renderTestimonials();
  initEvents();
  initScroll();
  initReveal();
  initMenu();
  initContact();
  updateCartCount();
  startSlide();
  initVideoSlider();
}
document.addEventListener('DOMContentLoaded', init);
