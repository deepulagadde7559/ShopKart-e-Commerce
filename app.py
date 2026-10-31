from flask import Flask, render_template, request, jsonify, redirect, url_for, session, flash
import sqlite3
import uuid
import re
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
import os

app = Flask(__name__)

app.secret_key = os.environ.get("SHOPKART_SECRET_KEY")

if not app.secret_key:
    raise RuntimeError(
        "SHOPKART_SECRET_KEY environment variable is not configured."
    )

DATABASE = "shopkart.db"

# Product prices are controlled by the backend.
# Do not trust prices sent by the browser.
PRODUCTS = {
    1: {
        "name": "Wireless Headphones",
        "price": 1499,
        "image": "images/headphones.jpg"
    },
    2: {
        "name": "Ceramic Coffee Mug",
        "price": 399,
        "image": "images/mug.jpg"
    },
    3: {
        "name": "Travel Water Bottle",
        "price": 599,
        "image": "images/waterbottle.jpg"
    },
    4: {
        "name": "Everyday Carry Tote",
        "price": 799,
        "image": "images/tote.jpg"
    }
}

DELIVERY_CHARGE = 50
FREE_DELIVERY_LIMIT = 1999


# ========================================
# Database
# ========================================

def get_db_connection():
    connection = sqlite3.connect(DATABASE)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database():
    with get_db_connection() as connection:
        # Create Orders Table
        connection.execute("""
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id TEXT UNIQUE NOT NULL,
                customer_name TEXT NOT NULL,
                mobile TEXT NOT NULL,
                address TEXT NOT NULL,
                city TEXT NOT NULL,
                state TEXT NOT NULL,
                pincode TEXT NOT NULL,
                items_json TEXT NOT NULL,
                subtotal REAL NOT NULL,
                delivery REAL NOT NULL,
                total REAL NOT NULL,
                status TEXT NOT NULL DEFAULT 'PLACED',
                created_at TEXT NOT NULL
            )
        """)

        # Create Users Table
        connection.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE COLLATE NOCASE,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)
        connection.execute("""
            CREATE TABLE IF NOT EXISTS contact_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                subject TEXT NOT NULL,
                message TEXT NOT NULL,
                created_at TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'NEW'
            )
        """)

# ========================================
# User Registration
# ========================================

@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        full_name = request.form.get("full_name", "").strip()
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        confirm_password = request.form.get("confirm_password", "")

        # Validate input
        if not full_name or not email or not password or not confirm_password:
            flash("All fields are required.", "error")
            return redirect(url_for("register"))

        if len(full_name) > 100:
            flash("Name must be 100 characters or fewer.", "error")
            return redirect(url_for("register"))

        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
            flash("Please enter a valid email address.", "error")
            return redirect(url_for("register"))

        if len(password) < 8:
            flash("Password must contain at least 8 characters.", "error")
            return redirect(url_for("register"))

        if password != confirm_password:
            flash("Passwords do not match.", "error")
            return redirect(url_for("register"))

        password_hash = generate_password_hash(password)
        created_at = datetime.now().isoformat(timespec="seconds")

        try:
            with get_db_connection() as connection:
                connection.execute(
                    """
                    INSERT INTO users (full_name, email, password_hash, created_at)
                    VALUES (?, ?, ?, ?)
                    """,
                    (full_name, email, password_hash, created_at)
                )

            flash("Registration successful! Please log in.", "success")
            return redirect(url_for("login"))

        except sqlite3.IntegrityError:
            flash("An account with this email already exists.", "error")
            return redirect(url_for("register"))

    return render_template("register.html")

# ========================================
# User Login
# ========================================

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")

        if not email or not password:
            flash("Please enter your email and password.", "error")
            return redirect(url_for("login"))

        with get_db_connection() as connection:
            user = connection.execute(
                """
                SELECT id, full_name, email, password_hash
                FROM users
                WHERE email = ?
                """,
                (email,)
            ).fetchone()

        if user is None or not check_password_hash(
            user["password_hash"], password
        ):
            flash("Invalid email or password.", "error")
            return redirect(url_for("login"))

        # Start a new authenticated session
        session.clear()
        session["user_id"] = user["id"]
        session["user_name"] = user["full_name"]
        session["user_email"] = user["email"]

        flash("Login successful!", "success")
        return redirect(url_for("account"))

    return render_template("login.html")


# ========================================
# Account and Logout
# ========================================

def login_required(view_function):
    @wraps(view_function)
    def wrapped_view(*args, **kwargs):
        if "user_id" not in session:
            flash("Please log in to access your account.", "error")
            return redirect(url_for("login"))

        return view_function(*args, **kwargs)

    return wrapped_view


@app.route("/account")
@login_required
def account():
    with get_db_connection() as connection:
        user = connection.execute(
            """
            SELECT id, full_name, email, created_at
            FROM users
            WHERE id = ?
            """,
            (session["user_id"],)
        ).fetchone()

    if user is None:
        session.clear()
        flash("Please log in again.", "error")
        return redirect(url_for("login"))

    return render_template("account.html", user=user)


@app.route("/logout", methods=["POST"])
def logout():
    session.clear()
    flash("You have been logged out successfully.", "success")
    return redirect(url_for("login"))


# ========================================
# Existing Pages
# ========================================

@app.route("/")
def home():
    return render_template("index.html")


@app.route("/product/<int:product_id>")
def product_details(product_id):
    products = [
        {
            "id": 1,
            "name": "Wireless Headphones",
            "price": 1499,
            "category": "Electronics",
            "image": "images/headphones.jpg",
            "description": "Enjoy clear sound and comfortable listening every day with these wireless headphones."
        },
        {
            "id": 2,
            "name": "Ceramic Coffee Mug",
            "price": 399,
            "category": "Home & Kitchen",
            "image": "images/mug.jpg",
            "description": "Make your morning special with this stylish ceramic coffee mug."
        },
        {
            "id": 3,
            "name": "Travel Water Bottle",
            "price": 599,
            "category": "Accessories",
            "image": "images/waterbottle.jpg",
            "description": "Carry your favourite drink wherever you go with this practical travel water bottle."
        },
        {
            "id": 4,
            "name": "Everyday Carry Tote",
            "price": 799,
            "category": "Accessories",
            "image": "images/tote.jpg",
            "description": "A simple and useful tote bag for everyday essentials."
        }
    ]

    product = next(
        (item for item in products if item["id"] == product_id),
        None
    )

    if product is None:
        return "Product not found", 404

    return render_template("product_details.html", product=product)


@app.route("/wishlist")
def wishlist():
    return render_template("wishlist.html")


@app.route("/contact", methods=["GET", "POST"])
def contact():
    if request.method == "POST":
        name = request.form.get("name", "").strip()
        email = request.form.get("email", "").strip().lower()
        subject = request.form.get("subject", "").strip()
        message = request.form.get("message", "").strip()

        if (
            not name
            or len(name) > 100
            or not email
            or len(email) > 254
            or not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email)
            or not subject
            or len(subject) > 100
            or not message
            or len(message) > 3000
        ):
            flash("Please enter valid information in all fields.", "error")
            return redirect(url_for("contact"))

        allowed_subjects = {
            "Product Enquiry",
            "Order Support",
            "Shipping and Delivery",
            "Returns and Refunds",
            "Other",
        }

        if subject not in allowed_subjects:
            flash("Please select a valid subject.", "error")
            return redirect(url_for("contact"))

        created_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        try:
            with get_db_connection() as connection:
                connection.execute(
                    """
                    INSERT INTO contact_messages
                    (name, email, subject, message, created_at)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (name, email, subject, message, created_at),
                )

            flash("Your message has been submitted successfully!", "success")
            return redirect(url_for("contact"))

        except sqlite3.Error:
            app.logger.exception("Failed to save contact message.")
            flash(
                "Sorry, we could not save your message. Please try again later.",
                "error",
            )
            return redirect(url_for("contact"))

    return render_template("contact.html")


@app.route("/faqs")
def faqs():
    return render_template("faqs.html")


@app.route("/about")
def about():
    return render_template("about.html")


@app.route("/privacy-policy")
def privacy_policy():
    return render_template("privacy.html")


@app.route("/terms")
def terms():
    return render_template("terms.html")


@app.route("/shipping")
def shipping():
    return render_template("shipping.html")    

    
@app.route("/cart")
def cart():
    return render_template("cart.html")


@app.route("/checkout")
def checkout():
    return render_template("checkout.html")


@app.route("/payment/<order_id>")
def payment(order_id):
    return render_template("payment.html", order_id=order_id)


@app.route("/order-success/<order_id>")
def order_success(order_id):
    return render_template("order_success.html")



# ========================================
# Create Order API
# ========================================

@app.route("/api/orders", methods=["POST"])
def create_order():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "success": False,
            "message": "Invalid JSON request."
        }), 400

    # Customer information
    customer_name = str(data.get("customerName", "")).strip()
    mobile = str(data.get("mobile", "")).strip()
    address = str(data.get("address", "")).strip()
    city = str(data.get("city", "")).strip()
    state = str(data.get("state", "")).strip()
    pincode = str(data.get("pincode", "")).strip()

    # Validate customer details
    if not 2 <= len(customer_name) <= 100:
        return jsonify({
            "success": False,
            "message": "Enter a valid customer name."
        }), 400

    if not re.fullmatch(r"[6-9][0-9]{9}", mobile):
        return jsonify({
            "success": False,
            "message": "Enter a valid 10-digit Indian mobile number."
        }), 400

    if not 5 <= len(address) <= 500:
        return jsonify({
            "success": False,
            "message": "Enter a valid delivery address."
        }), 400

    if not city or len(city) > 100:
        return jsonify({
            "success": False,
            "message": "Enter a valid city."
        }), 400

    if not state or len(state) > 100:
        return jsonify({
            "success": False,
            "message": "Select a valid state."
        }), 400

    if not re.fullmatch(r"[1-9][0-9]{5}", pincode):
        return jsonify({
            "success": False,
            "message": "Enter a valid 6-digit PIN code."
        }), 400

    # Validate cart
    items = data.get("items")

    if not isinstance(items, list) or not items:
        return jsonify({
            "success": False,
            "message": "Your cart is empty."
        }), 400

    if len(items) > len(PRODUCTS):
        return jsonify({
            "success": False,
            "message": "Cart contains invalid or duplicate product entries."
        }), 400

    order_items = []
    subtotal = 0
    seen_ids = set()

    for item in items:
        if not isinstance(item, dict):
            return jsonify({
                "success": False,
                "message": "Invalid product in cart."
            }), 400

        try:
            product_id = int(item.get("id"))
            quantity = int(item.get("quantity"))
        except (TypeError, ValueError):
            return jsonify({
                "success": False,
                "message": "Invalid product ID or quantity."
            }), 400

        if product_id in seen_ids:
            return jsonify({
                "success": False,
                "message": "Duplicate products are not allowed."
            }), 400

        seen_ids.add(product_id)

        product = PRODUCTS.get(product_id)

        if product is None:
            return jsonify({
                "success": False,
                "message": "An invalid product was found."
            }), 400

        if not 1 <= quantity <= 99:
            return jsonify({
                "success": False,
                "message": "Product quantity must be between 1 and 99."
            }), 400

        line_total = product["price"] * quantity
        subtotal += line_total

        order_items.append({
            "id": product_id,
            "name": product["name"],
            "price": product["price"],
            "quantity": quantity,
            "image": product["image"],
            "lineTotal": line_total
        })

    if subtotal > 10000000:
        return jsonify({
            "success": False,
            "message": "Order amount exceeds the allowed limit."
        }), 400

    delivery = 0 if subtotal >= FREE_DELIVERY_LIMIT else DELIVERY_CHARGE
    total = subtotal + delivery

    # Generate unique order ID
    order_id = "SK-" + uuid.uuid4().hex[:10].upper()
    created_at = datetime.now().astimezone().isoformat(timespec="seconds")

    import json

    try:
        with get_db_connection() as connection:
            connection.execute("""
                INSERT INTO orders (
                    order_id,
                    customer_name,
                    mobile,
                    address,
                    city,
                    state,
                    pincode,
                    items_json,
                    subtotal,
                    delivery,
                    total,
                    status,
                    created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                order_id,
                customer_name,
                mobile,
                address,
                city,
                state,
                pincode,
                json.dumps(order_items),
                subtotal,
                delivery,
                total,
                "PLACED",
                created_at
            ))

    except sqlite3.Error:
        app.logger.exception("Unable to save order")
        return jsonify({
            "success": False,
            "message": "Unable to save your order. Please try again."
        }), 500

    return jsonify({
        "success": True,
        "message": "Order placed successfully.",
        "orderId": order_id,
        "status": "PLACED",
        "subtotal": subtotal,
        "delivery": delivery,
        "total": total,
        "createdAt": created_at
    }), 201

    
@app.route("/api/orders/<order_id>/payment", methods=["POST"])
def process_demo_payment(order_id):
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "success": False,
            "message": "Invalid JSON request."
        }), 400

    payment_method = data.get("paymentMethod")
    outcome = data.get("outcome")

    # Validate payment method
    allowed_methods = {"UPI", "CARD", "NET_BANKING"}

    if payment_method not in allowed_methods:
        return jsonify({
            "success": False,
            "message": "Invalid payment method."
        }), 400

    # Validate demo outcome
    if outcome not in {"SUCCESS", "FAILED"}:
        return jsonify({
            "success": False,
            "message": "Invalid demo payment outcome."
        }), 400

    try:
        with get_db_connection() as connection:
            order = connection.execute("""
                SELECT order_id, payment_status
                FROM orders
                WHERE order_id = ?
            """, (order_id,)).fetchone()

            if order is None:
                return jsonify({
                    "success": False,
                    "message": "Order not found."
                }), 404

            if order["payment_status"] != "PENDING":
                return jsonify({
                    "success": False,
                    "message": "Payment has already been processed.",
                    "paymentStatus": order["payment_status"]
                }), 409

            payment_reference = (
                "DEMO-" + uuid.uuid4().hex[:12].upper()
            )

            connection.execute("""
                UPDATE orders
                SET payment_method = ?,
                    payment_status = ?,
                    payment_reference = ?
                WHERE order_id = ?
                  AND payment_status = 'PENDING'
            """, (
                payment_method,
                outcome,
                payment_reference,
                order_id
            ))

    except sqlite3.Error:
        app.logger.exception("Unable to update demo payment")
        return jsonify({
            "success": False,
            "message": "Unable to save payment result."
        }), 500

    return jsonify({
        "success": True,
        "message": (
            "Demo payment successful."
            if outcome == "SUCCESS"
            else "Demo payment failed."
        ),
        "orderId": order_id,
        "paymentMethod": payment_method,
        "paymentStatus": outcome,
        "paymentReference": payment_reference,
        "demoOnly": True
    }), 200


# ========================================
# Retrieve a Saved Order
# ========================================

@app.route("/api/orders/<order_id>", methods=["GET"])
def get_order(order_id):
    import json

    with get_db_connection() as connection:
        order = connection.execute("""
            SELECT
                order_id,
                customer_name,
                mobile,
                address,
                city,
                state,
                pincode,
                items_json,
                subtotal,
                delivery,
                total,
                status,
                created_at,
                payment_method,
                payment_status,
                payment_reference
            FROM orders
            WHERE order_id = ?
        """, (order_id,)).fetchone()

    if order is None:
        return jsonify({
            "success": False,
            "message": "Order not found."
        }), 404

    return jsonify({
        "success": True,
        "order": {
            "orderId": order["order_id"],
            "customerName": order["customer_name"],
            "mobile": order["mobile"],
            "address": order["address"],
            "city": order["city"],
            "state": order["state"],
            "pincode": order["pincode"],
            "items": json.loads(order["items_json"]),
            "subtotal": order["subtotal"],
            "delivery": order["delivery"],
            "total": order["total"],
            "status": order["status"],
            "createdAt": order["created_at"],
            "paymentMethod": order["payment_method"],
            "paymentStatus": order["payment_status"],
            "paymentReference": order["payment_reference"]
        }
    })


# ========================================
# Application Startup
# ========================================

def migrate_payment_columns():
    with get_db_connection() as connection:
        existing_columns = {
            row["name"]
            for row in connection.execute(
                "PRAGMA table_info(orders)"
            ).fetchall()
        }

        if "payment_method" not in existing_columns:
            connection.execute("""
                ALTER TABLE orders
                ADD COLUMN payment_method TEXT DEFAULT 'NOT_SELECTED'
            """)

        if "payment_status" not in existing_columns:
            connection.execute("""
                ALTER TABLE orders
                ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'PENDING'
            """)

        if "payment_reference" not in existing_columns:
            connection.execute("""
                ALTER TABLE orders
                ADD COLUMN payment_reference TEXT
            """)


initialize_database()
migrate_payment_columns()


if __name__ == "__main__":
    app.run(debug=True)