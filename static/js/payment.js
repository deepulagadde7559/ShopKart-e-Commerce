document.addEventListener("DOMContentLoaded", () => {
    const orderId = window.SHOPKART_ORDER_ID;
    const orderTotal = document.getElementById("orderTotal");
    const paymentForm = document.getElementById("paymentForm");
    const successButton = document.getElementById("simulateSuccess");
    const failureButton = document.getElementById("simulateFailure");
    const paymentMessage = document.getElementById("paymentMessage");

    let currentOrder = null;
    let processing = false;

    function showMessage(message, type = "error") {
        paymentMessage.textContent = message;
        paymentMessage.style.display = "block";
        paymentMessage.style.background =
            type === "success" ? "#eaf8ef" : "#fff0f0";
        paymentMessage.style.color =
            type === "success" ? "#176b57" : "#b42318";
    }

    function setButtonsEnabled(enabled) {
        successButton.disabled = !enabled;
        failureButton.disabled = !enabled;

        paymentForm.querySelectorAll('input[name="paymentMethod"]')
            .forEach(input => {
                input.disabled = !enabled;
            });

        successButton.style.opacity = enabled ? "1" : "0.6";
        failureButton.style.opacity = enabled ? "1" : "0.6";
    }

    async function loadOrder() {
        if (!orderId) {
            orderTotal.textContent = "Unavailable";
            showMessage("Order ID is missing. Please return to checkout.");
            setButtonsEnabled(false);
            return;
        }

        setButtonsEnabled(false);

        try {
            const response = await fetch(
                `/api/orders/${encodeURIComponent(orderId)}`
            );

            const data = await response.json();

            if (!response.ok || !data.success || !data.order) {
                throw new Error(data.message || "Order not found.");
            }

            currentOrder = data.order;

            const amount = Number(currentOrder.total);

            if (!Number.isFinite(amount) || amount < 0) {
                throw new Error("The order amount is invalid.");
            }

            orderTotal.textContent = amount.toLocaleString("en-IN", {
                style: "currency",
                currency: "INR",
                maximumFractionDigits: 2
            });

            if (currentOrder.paymentStatus !== "PENDING") {
                showMessage(
                    `Payment status: ${currentOrder.paymentStatus}.`,
                    currentOrder.paymentStatus === "SUCCESS" ? "success" : "error"
                );

                setButtonsEnabled(false);
                return;
            }

            setButtonsEnabled(true);
        } catch (error) {
            orderTotal.textContent = "Unavailable";
            showMessage(error.message || "Unable to load order details.");
            setButtonsEnabled(false);
        }
    }

    async function processPayment(outcome) {
        if (!currentOrder || processing) {
            return;
        }

        const selectedMethod = paymentForm.querySelector(
            'input[name="paymentMethod"]:checked'
        );

        if (!selectedMethod) {
            showMessage("Please select a payment method.");
            return;
        }

        processing = true;
        setButtonsEnabled(false);

        showMessage("Processing demo payment...", "success");

        try {
            const response = await fetch(
                `/api/orders/${encodeURIComponent(orderId)}/payment`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        paymentMethod: selectedMethod.value,
                        outcome: outcome
                    })
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Unable to process demo payment.");
            }

            showMessage(
                `${data.message} Reference: ${data.paymentReference}`,
                outcome === "SUCCESS" ? "success" : "error"
            );

            // Refresh order status from the database.
            await loadOrder();

            // Continue to receipt after a short pause.
            window.setTimeout(() => {
                window.location.href =
                    `/order-success/${encodeURIComponent(orderId)}`;
            }, 1800);

        } catch (error) {
            showMessage(error.message || "Payment request failed.");
            processing = false;
            await loadOrder();
        }
    }

    successButton.addEventListener("click", () => {
        processPayment("SUCCESS");
    });

    failureButton.addEventListener("click", () => {
        processPayment("FAILED");
    });

    loadOrder();
});