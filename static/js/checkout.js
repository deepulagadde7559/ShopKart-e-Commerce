// ========================================
// ShopKart - Checkout and Order Placement
// ========================================

const CHECKOUT_CART_KEY = "shopkartCart";
const CHECKOUT_DELIVERY_CHARGE = 50;
const CHECKOUT_FREE_DELIVERY_LIMIT = 1999;

function getCheckoutCart() {
    try {
        const cart = JSON.parse(
            localStorage.getItem(CHECKOUT_CART_KEY)
        );

        return Array.isArray(cart) ? cart : [];
    } catch (error) {
        console.error("Unable to load cart:", error);
        return [];
    }
}

function formatCheckoutPrice(amount) {
    return "₹" + Number(amount).toLocaleString("en-IN", {
        maximumFractionDigits: 2
    });
}

function escapeCheckoutHTML(value) {
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

function getCheckoutSubtotal(cart) {
    return cart.reduce((total, item) => {
        return total +
            (Number(item.price) || 0) *
            (Number(item.quantity) || 0);
    }, 0);
}

// ========================================
// Display Order Summary
// ========================================

function renderCheckoutSummary() {
    const cart = getCheckoutCart();

    const itemsContainer = document.getElementById("checkoutItems");
    const subtotalElement = document.getElementById("checkoutSubtotal");
    const deliveryElement = document.getElementById("checkoutDelivery");
    const totalElement = document.getElementById("checkoutTotal");
    const placeOrderButton = document.getElementById("placeOrderButton");
    const checkoutForm = document.getElementById("checkoutForm");

    if (!itemsContainer) return;

    if (cart.length === 0) {
        itemsContainer.innerHTML = `
            <div class="empty-checkout">
                <h3>Your bag is empty</h3>
                <p>Add some products before proceeding to checkout.</p>
                <a href="/" class="back-to-cart-button">
                    Start Shopping
                </a>
            </div>
        `;

        subtotalElement.textContent = formatCheckoutPrice(0);
        deliveryElement.textContent = formatCheckoutPrice(0);
        totalElement.textContent = formatCheckoutPrice(0);

        placeOrderButton.disabled = true;
        placeOrderButton.style.opacity = "0.5";

        checkoutForm.querySelectorAll("input, textarea, select")
            .forEach(field => field.disabled = true);

        return;
    }

    placeOrderButton.disabled = false;
    placeOrderButton.style.opacity = "1";

    checkoutForm.querySelectorAll("input, textarea, select")
        .forEach(field => field.disabled = false);

    itemsContainer.innerHTML = cart.map(item => {
        const name = escapeCheckoutHTML(item.name || "Product");
        const price = Number(item.price) || 0;
        const quantity = Math.max(1, Number(item.quantity) || 1);

        const imagePath = item.image
            ? "/static/" + String(item.image).replace(/^\/+/, "")
            : "";

        return `
            <div class="summary-product">
                <img
                    src="${escapeCheckoutHTML(imagePath)}"
                    alt="${name}"
                    onerror="this.style.visibility='hidden'"
                >

                <div>
                    <h3>${name}</h3>
                    <p>Quantity: ${quantity}</p>
                </div>

                <div class="summary-product-price">
                    ${formatCheckoutPrice(price * quantity)}
                </div>
            </div>
        `;
    }).join("");

    const subtotal = getCheckoutSubtotal(cart);

    const delivery = subtotal >= CHECKOUT_FREE_DELIVERY_LIMIT
        ? 0
        : CHECKOUT_DELIVERY_CHARGE;

    subtotalElement.textContent = formatCheckoutPrice(subtotal);

    deliveryElement.textContent = delivery === 0
        ? "FREE"
        : formatCheckoutPrice(delivery);

    totalElement.textContent = formatCheckoutPrice(
        subtotal + delivery
    );
}

// ========================================
// Form Validation
// ========================================

function validateCheckoutForm(form) {
    const customerName = form.elements["customerName"].value.trim();
    const mobile = form.elements["mobile"].value.trim();
    const address = form.elements["address"].value.trim();
    const city = form.elements["city"].value.trim();
    const state = form.elements["state"].value.trim();
    const pincode = form.elements["pincode"].value.trim();

    if (customerName.length < 2 || customerName.length > 100) {
        alert("Please enter your full name.");
        form.elements["customerName"].focus();
        return false;
    }

    if (!/^[6-9]\d{9}$/.test(mobile)) {
        alert("Please enter a valid 10-digit Indian mobile number.");
        form.elements["mobile"].focus();
        return false;
    }

    if (address.length < 5 || address.length > 500) {
        alert("Please enter your complete delivery address.");
        form.elements["address"].focus();
        return false;
    }

    if (!city || city.length > 100) {
        alert("Please enter a valid city.");
        form.elements["city"].focus();
        return false;
    }

    if (!state || state.length > 100) {
        alert("Please select your state.");
        form.elements["state"].focus();
        return false;
    }

    if (!/^[1-9]\d{5}$/.test(pincode)) {
        alert("Please enter a valid 6-digit PIN code.");
        form.elements["pincode"].focus();
        return false;
    }

    return true;
}

// ========================================
// Place Order - Flask API
// ========================================

async function handleCheckoutSubmit(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const cart = getCheckoutCart();
    const button = document.getElementById("placeOrderButton");

    if (cart.length === 0) {
        alert("Your shopping bag is empty.");
        window.location.href = "/cart";
        return;
    }

    if (!form.reportValidity() || !validateCheckoutForm(form)) {
        return;
    }

    const orderData = {
        customerName: form.elements["customerName"].value.trim(),
        mobile: form.elements["mobile"].value.trim(),
        address: form.elements["address"].value.trim(),
        city: form.elements["city"].value.trim(),
        state: form.elements["state"].value.trim(),
        pincode: form.elements["pincode"].value.trim(),

        // Backend independently verifies product IDs and prices.
        items: cart.map(item => ({
            id: item.id,
            quantity: item.quantity
        }))
    };

    button.disabled = true;
    button.textContent = "Placing Order...";

    try {
        const response = await fetch("/api/orders", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(orderData)
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(
                result.message || "Unable to place your order."
            );
        }

        // Clear the cart only after the server confirms success.
        localStorage.removeItem(CHECKOUT_CART_KEY);

        // Save only the confirmation reference for the next page.
        sessionStorage.setItem(
            "shopkartLastOrderId",
            result.orderId
        );

        window.location.href =
    "/payment/" + encodeURIComponent(result.orderId);

    } catch (error) {
        console.error("Order placement failed:", error);

        alert(
            error.message ||
            "Something went wrong. Please try again."
        );

        button.disabled = false;
        button.textContent = "Place Order";
    }
}

// ========================================
// Initialize
// ========================================

document.addEventListener("DOMContentLoaded", function () {
    renderCheckoutSummary();

    const checkoutForm = document.getElementById("checkoutForm");

    if (checkoutForm) {
        checkoutForm.addEventListener(
            "submit",
            handleCheckoutSubmit
        );
    }
});