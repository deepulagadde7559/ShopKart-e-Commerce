document.addEventListener("DOMContentLoaded", async () => {
    const container = document.getElementById("confirmationContent");

    // Get order ID from the URL.
    const match = window.location.pathname.match(
        /^\/order-success\/([^/]+)\/?$/
    );

    if (!match) {
        showError("Invalid order URL.");
        return;
    }

    const orderId = decodeURIComponent(match[1]);

    try {
        const response = await fetch(
            `/api/orders/${encodeURIComponent(orderId)}`
        );

        const data = await response.json();

        if (!response.ok || !data.success || !data.order) {
            throw new Error(data.message || "Unable to find this order.");
        }

        renderOrder(data.order);
    } catch (error) {
        showError(error.message || "Unable to load your order details.");
    }

    function showError(message) {
        container.innerHTML = "";

        const errorBox = document.createElement("div");
        errorBox.className = "error-message";

        const heading = document.createElement("h2");
        heading.textContent = "Unable to Load Order";

        const description = document.createElement("p");
        description.textContent = message;

        errorBox.append(heading, description);
        container.appendChild(errorBox);
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[character]);
    }

    function formatMoney(value) {
        const amount = Number(value);

        if (!Number.isFinite(amount)) {
            return "₹0.00";
        }

        return amount.toLocaleString("en-IN", {
            style: "currency",
            currency: "INR",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function renderOrder(order) {
        const paymentMethodNames = {
            UPI: "UPI",
            CARD: "Debit / Credit Card",
            NET_BANKING: "Net Banking",
            NOT_SELECTED: "Not selected"
        };

        const paymentStatus = String(
            order.paymentStatus || "PENDING"
        ).toUpperCase();

        const paymentMethod = paymentMethodNames[
            order.paymentMethod
        ] || "Not selected";

        const paymentReference = order.paymentReference || "Not available";

        const paymentLabel = {
            SUCCESS: "Demo Payment Successful",
            FAILED: "Demo Payment Failed",
            PENDING: "Payment Pending"
        }[paymentStatus] || "Payment Status Unknown";

        const paymentColor = paymentStatus === "SUCCESS"
            ? "#234d3a"
            : paymentStatus === "FAILED"
                ? "#a52c2c"
                : "#765414";

        const products = Array.isArray(order.items) ? order.items : [];

        const productHTML = products.map(item => {
            const name = escapeHTML(item.name);
            const image = escapeHTML(item.image);
            const quantity = Number(item.quantity) || 0;
            const lineTotal = formatMoney(item.lineTotal);

            return `
                <div class="order-product">
                    <img src="/static/${image}" alt="${name}"
                         onerror="this.style.display='none'">

                    <div>
                        <h3>${name}</h3>
                        <p>Quantity: ${quantity}</p>
                    </div>

                    <div class="order-product-price">${lineTotal}</div>
                </div>
            `;
        }).join("");

        container.innerHTML = `
            <header class="success-header">
                <div class="success-icon" aria-hidden="true">
                    ${paymentStatus === "SUCCESS" ? "✓" : "✓"}
                </div>

                <h1>Thank You for Your Order!</h1>

                <p>
                    Your ShopKart order details are shown below.
                    Please keep your order reference for future use.
                </p>

                <div class="order-reference">
                    <span>ORDER REFERENCE</span>
                    <strong>${escapeHTML(order.orderId)}</strong>
                </div>
            </header>

            <section class="success-section">
                <h2>Order Status</h2>
                <span class="order-status">
                    ${escapeHTML(order.status || "PLACED")}
                </span>
            </section>

            <section class="success-section">
                <h2>Payment Details</h2>

                <div class="customer-details">
                    <div>
                        <strong>Payment Method:</strong>
                        ${escapeHTML(paymentMethod)}
                    </div>

                    <div>
                        <strong>Payment Status:</strong>
                        <span style="color:${paymentColor};font-weight:700">
                            ${escapeHTML(paymentLabel)}
                        </span>
                    </div>

                    <div>
                        <strong>Demo Reference:</strong>
                        ${escapeHTML(paymentReference)}
                    </div>
                </div>

                <p style="margin-top:14px;color:#777;font-size:13px;line-height:1.6">
                    This is a simulated payment for a college project.
                    No real money was charged or transferred.
                </p>
            </section>

            <section class="success-section">
                <h2>Items Ordered</h2>
                ${productHTML || "<p>No product details available.</p>"}
            </section>

            <section class="success-section">
                <h2>Delivery Details</h2>

                <div class="customer-details">
                    <div>
                        <strong>Name:</strong>
                        ${escapeHTML(order.customerName)}
                    </div>

                    <div>
                        <strong>Mobile:</strong>
                        ${escapeHTML(order.mobile)}
                    </div>

                    <div>
                        <strong>Address:</strong>
                        ${escapeHTML(order.address)}
                    </div>

                    <div>
                        <strong>City:</strong>
                        ${escapeHTML(order.city)}
                    </div>

                    <div>
                        <strong>State:</strong>
                        ${escapeHTML(order.state)}
                    </div>

                    <div>
                        <strong>PIN Code:</strong>
                        ${escapeHTML(order.pincode)}
                    </div>
                </div>
            </section>

            <section class="success-section">
                <h2>Order Summary</h2>

                <div class="amount-row">
                    <span>Subtotal</span>
                    <span>${formatMoney(order.subtotal)}</span>
                </div>

                <div class="amount-row">
                    <span>Delivery</span>
                    <span>
                        ${Number(order.delivery) === 0
                            ? "FREE"
                            : formatMoney(order.delivery)}
                    </span>
                </div>

                <div class="amount-row amount-total">
                    <span>Total</span>
                    <span>${formatMoney(order.total)}</span>
                </div>
            </section>

            <div class="success-actions">
                <a href="/" class="success-button primary-button">
                    Continue Shopping
                </a>

                <button type="button"
                        id="printOrder"
                        class="success-button secondary-button">
                    Print Order
                </button>
            </div>
        `;

        document.getElementById("printOrder").addEventListener(
            "click",
            () => window.print()
        );
    }
});