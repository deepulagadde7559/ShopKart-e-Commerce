// ========================================
// ShopKart - Shopping Cart Page
// ========================================

const CART_STORAGE_KEY = "shopkartCart";
const DELIVERY_CHARGE = 50;
const FREE_DELIVERY_LIMIT = 1999;

// Load cart from localStorage safely
function getCart() {
    try {
        const savedCart = JSON.parse(
            localStorage.getItem(CART_STORAGE_KEY)
        );

        return Array.isArray(savedCart) ? savedCart : [];
    } catch (error) {
        console.error("Unable to load cart:", error);
        return [];
    }
}

// Save cart to localStorage
function saveCart(cart) {
    localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify(cart)
    );
}

// Format amount in Indian currency
function formatPrice(amount) {
    return "₹" + Number(amount).toLocaleString("en-IN", {
        maximumFractionDigits: 2
    });
}

// Calculate subtotal
function calculateSubtotal(cart) {
    return cart.reduce((total, item) => {
        const price = Number(item.price) || 0;
        const quantity = Number(item.quantity) || 0;

        return total + price * quantity;
    }, 0);
}

// Render cart items
function renderCart() {
    const cart = getCart();

    const cartItemsContainer = document.getElementById("cartItems");
    const subtotalElement = document.getElementById("subtotal");
    const deliveryElement = document.getElementById("delivery");
    const totalElement = document.getElementById("total");
    const checkoutButton = document.getElementById("checkoutButton");

    if (!cartItemsContainer) return;

    // Empty cart
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="empty-cart">
                <div class="empty-icon">🛍️</div>
                <h2>Your bag is empty</h2>
                <p>Looks like you haven't added anything yet.</p>
                <a href="/" class="continue-button">
                    Start Shopping
                </a>
            </div>
        `;

        subtotalElement.textContent = formatPrice(0);
        deliveryElement.textContent = formatPrice(0);
        totalElement.textContent = formatPrice(0);

        checkoutButton.disabled = true;
        checkoutButton.style.opacity = "0.5";
        checkoutButton.style.cursor = "not-allowed";

        return;
    }

    checkoutButton.disabled = false;
    checkoutButton.style.opacity = "1";
    checkoutButton.style.cursor = "pointer";

    // Display products
    cartItemsContainer.innerHTML = cart.map(item => {
        const price = Number(item.price) || 0;
        const quantity = Math.max(1, Number(item.quantity) || 1);

        // Images are stored relative to the static folder
        const imagePath = item.image
            ? `/static/${item.image.replace(/^\/+/, "")}`
            : "";

        return `
            <article class="cart-item">
                <img
                    src="${imagePath}"
                    alt="${item.name || "Product"}"
                    onerror="this.style.visibility='hidden'"
                >

                <div class="cart-item-details">
                    <h3>${escapeHTML(item.name || "Product")}</h3>

                    <div class="cart-item-price">
                        ${formatPrice(price)}
                    </div>

                    <div class="quantity-control">
                        <button
                            type="button"
                            onclick="changeQuantity(${Number(item.id)}, -1)"
                            aria-label="Decrease quantity"
                        >−</button>

                        <span>${quantity}</span>

                        <button
                            type="button"
                            onclick="changeQuantity(${Number(item.id)}, 1)"
                            aria-label="Increase quantity"
                        >+</button>
                    </div>
                </div>

                <div class="cart-item-right">
                    <div class="item-total">
                        ${formatPrice(price * quantity)}
                    </div>

                    <button
                        type="button"
                        class="remove-button"
                        onclick="removeItem(${Number(item.id)})"
                    >
                        Remove
                    </button>
                </div>
            </article>
        `;
    }).join("");

    // Update order summary
    const subtotal = calculateSubtotal(cart);

    // Free delivery for orders of ₹1,999 or more
    const delivery = subtotal >= FREE_DELIVERY_LIMIT
        ? 0
        : DELIVERY_CHARGE;

    const total = subtotal + delivery;

    subtotalElement.textContent = formatPrice(subtotal);

    deliveryElement.textContent = delivery === 0
        ? "FREE"
        : formatPrice(delivery);

    totalElement.textContent = formatPrice(total);
}

// Prevent product names from being interpreted as HTML
function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return entities[character];
    });
}

// Change product quantity
function changeQuantity(productId, change) {
    const cart = getCart();

    const item = cart.find(product =>
        Number(product.id) === productId
    );

    if (!item) return;

    const newQuantity = Number(item.quantity) + change;

    // Minimum quantity is 1
    if (newQuantity < 1) return;

    item.quantity = newQuantity;

    saveCart(cart);
    renderCart();
}

// Remove product from cart
function removeItem(productId) {
    const cart = getCart();

    const updatedCart = cart.filter(item =>
        Number(item.id) !== productId
    );

    saveCart(updatedCart);
    renderCart();
}

// Checkout placeholder
function handleCheckout() {
    const cart = JSON.parse(
        localStorage.getItem("shopkartCart") || "[]"
    );

    if (!Array.isArray(cart) || cart.length === 0) {
        alert("Your shopping cart is empty.");
        return;
    }

    window.location.href = "/checkout";
}

// Initialize cart page
document.addEventListener("DOMContentLoaded", function () {
    renderCart();

    const checkoutButton = document.getElementById("checkoutButton");

    if (checkoutButton) {
        checkoutButton.addEventListener("click", handleCheckout);
    }
});
