const API = 'http://localhost:3000/api/products';
let allProducts = [];

document.addEventListener('DOMContentLoaded', () => {
  fetchProducts();

  const form = document.getElementById('product-form');
  if (form) form.onsubmit = addProduct;

  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.addEventListener('input', handleSearch);
});

async function fetchProducts() {
  try {
    const res = await fetch(API);
    allProducts = await res.json();
    renderCatalog(allProducts);
    renderAdmin(allProducts);
    enableDragReorder(); // 👈 Enable drag after rendering
  } catch (err) {
    console.error('Failed to fetch products:', err);
  }
}

function renderCatalog(products) {
  const grid = document.getElementById('productGrid');
  if (!grid) return;

  grid.innerHTML = '';
  products.forEach(p => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <img src="${p.image}" alt="${p.name}" class="product-image" />
      <div class="product-details">
        <div class="product-name">${p.name}</div>
        <div class="product-price">₹${p.price}</div>
      </div>
    `;
    grid.appendChild(card);
  });
}

function renderAdmin(products) {
  const adminGrid = document.getElementById('admin-products');
  if (!adminGrid) return;

  adminGrid.innerHTML = '';
  products.forEach(p => {
    const original = {
      _id: p._id,
      name: p.name,
      price: p.price,
      image: p.image
    };

    const card = document.createElement('div');
    card.className = 'admin-product';
    card.setAttribute('data-id', p._id); // 👈 Needed for drag tracking
    card.innerHTML = `
      <img src="${p.image}" alt="${p.name}" />
      <h3 contenteditable="true">${p.name}</h3>
      <p contenteditable="true">₹${p.price}</p>
      <input type="text" value="${p.image}" style="width:90%;margin-bottom:10px;" />
      <button>Delete</button>
    `;

    const nameEl = card.querySelector('h3');
    const priceEl = card.querySelector('p');
    const imageEl = card.querySelector('input[type="text"]');
    const deleteBtn = card.querySelector('button');

    nameEl.addEventListener('blur', () => updateField(p._id, 'name', nameEl.innerText.trim()));
    priceEl.addEventListener('blur', () => updatePrice(priceEl, p._id));
    imageEl.addEventListener('blur', () => updateField(p._id, 'image', imageEl.value.trim()));
    deleteBtn.addEventListener('click', () => deleteProduct(p._id));

    adminGrid.appendChild(card);
  });
}

function enableDragReorder() {
  const adminGrid = document.getElementById('admin-products');
  if (!adminGrid) return;

  new Sortable(adminGrid, {
    animation: 150,
    onEnd: async () => {
      const cards = Array.from(adminGrid.querySelectorAll('.admin-product'));
      for (let i = 0; i < cards.length; i++) {
        const id = cards[i].getAttribute('data-id');
        await updateField(id, 'sortOrder', i + 1);
      }
      console.log('Reordering complete');
    }
  });
}

function undoChanges(elements, original) {
  const { nameEl, priceEl, imageEl } = elements;

  nameEl.onblur = null;
  priceEl.onblur = null;
  imageEl.onblur = null;

  nameEl.innerText = original.name;
  priceEl.innerText = `₹${original.price}`;
  imageEl.value = original.image;

  setTimeout(() => {
    nameEl.addEventListener('blur', () => updateField(original._id, 'name', nameEl.innerText.trim()));
    priceEl.addEventListener('blur', () => updatePrice(priceEl, original._id));
    imageEl.addEventListener('blur', () => updateField(original._id, 'image', imageEl.value.trim()));
  }, 100);
}

function updatePrice(el, id) {
  const raw = el.innerText.trim();
  const cleaned = raw.replace(/[^\d.]/g, '');
  const price = parseFloat(cleaned);

  if (!isNaN(price)) {
    updateField(id, 'price', price);
  } else {
    console.warn(`Invalid price input: "${raw}"`);
  }
}

function handleSearch(e) {
  const query = e.target.value.toLowerCase();
  const filtered = allProducts.filter(p =>
    p.name.toLowerCase().includes(query)
  );
  renderCatalog(filtered);
}

async function addProduct(e) {
  e.preventDefault();
  const form = e.target;
  const product = {
    name: form.name.value.trim(),
    price: parseInt(form.price.value),
    image: form.image.value.trim(),
    sortOrder: parseInt(form.sortOrder.value)
  };

  try {
    await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product)
    });
    form.reset();
    fetchProducts();
  } catch (err) {
    console.error('Failed to add product:', err);
  }
}

async function deleteProduct(id) {
  try {
    await fetch(`${API}/${id}`, { method: 'DELETE' });
    fetchProducts();
  } catch (err) {
    console.error('Failed to delete product:', err);
  }
}

async function updateField(id, field, value) {
  console.log(`Updating ${field} of ${id} to`, value);

  if (!id || !field || value === undefined || value === null) return;
  if (field === 'price' && isNaN(value)) return;
  if (field === 'image' && !value.startsWith('http')) return;

  try {
    const res = await fetch(`${API}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value })
    });

    if (!res.ok) {
      console.error(`PATCH failed with status ${res.status}`);
      return;
    }

    fetchProducts();
  } catch (err) {
    console.error(`Failed to update ${field}:`, err);
  }
}
