// ========================================
// SHOPKART WISHLIST PAGE
// ========================================

const WISHLIST_STORAGE_KEY = "shopkartWishlist";
const CART_STORAGE_KEY = "shopkartCart";

// Product details
const wishlistProducts = [
    {
        id: "1",
        name: "Wireless Headphones",
        price: 1499,
        category: "TECH",
        description: "Sound for every day",
        image: "images/headphones.jpg"
    },
    {
        id: "2",
        name: "Ceramic Coffee Mug",
        price: 399,
        category: "HOME & LIVING",
        description: "Your morning ritual",
        image: "images/mug.jpg"
    },
    {
        id: "3",
        name: "Travel Water Bottle",
        price: 599,
        category: "OUTDOORS",
        description: "Take it everywhere",
        image: "images/waterbottle.jpg"
    },
    {
        id: "4",
        name: "Everyday Carry Tote",
        price: 799,
        category: "ACCESSORIES",
        description: "Simple and useful",
        image: "images/tote.jpg"
    }
];

// Get saved wishlist
function getSavedWishlist() {
    try {
        const saved = JSON.parse(
            localStorage.getItem(WISHLIST_STORAGE_KEY) || "[]"
        );

        if (!Array.isArray(saved)) {
            return [];
        }

        return [...new Set(saved.map(String))];
    } catch (error) {
        console.error("Unable to read wishlist:", error);
        return [];
    }
}

// Save wishlist
function saveWishlistItems(items) {
    localStorage.setItem(
        WISHLIST_STORAGE_KEY,
        JSON.stringify(items)
    );
}

// Display wishlist products
function renderWishlist() {
    const wishlistGrid = document.getElementById("wishlistGrid");
    const wishlistEmpty = document.getElementById("wishlistEmpty");
    const wishlistCount = document.getElementById("wishlistCount");

    if (!wishlistGrid || !wishlistEmpty || !wishlistCount) {
        return;
    }

    const savedIds = getSavedWishlist();

    const productsToShow = wishlistProducts.filter(product =>
        savedIds.includes(product.id)
    );

    wishlistCount.textContent =
        `(${productsToShow.length} ${
            productsToShow.length === 1 ? "item" : "items"
        })`;

    wishlistGrid.replaceChildren();

    if (productsToShow.length === 0) {
        wishlistEmpty.hidden = false;
        wishlistGrid.hidden = true;
        return;
    }

    wishlistEmpty.hidden = true;
    wishlistGrid.hidden = false;

    productsToShow.forEach(product => {
        const card = document.createElement("article");
        card.className = "wishlist-card";

        const imageWrapper = document.createElement("div");
        imageWrapper.className = "wishlist-card-image";

        const image = document.createElement("img");
        image.src = `/static/${product.image}`;
        image.alt = product.name;
        image.loading = "lazy";

        imageWrapper.appendChild(image);

        const info = document.createElement("div");
        info.className = "wishlist-card-info";

        const category = document.createElement("p");
        category.className = "wishlist-card-category";
        category.textContent = product.category;

        const name = document.createElement("h3");
        name.textContent = product.name;

        const price = document.createElement("strong");
        price.className = "wishlist-card-price";
        price.textContent = `₹${product.price.toLocaleString("en-IN")}`;

        const actions = document.createElement("div");
        actions.className = "wishlist-card-actions";

        const addButton = document.createElement("button");
        addButton.type = "button";
        addButton.className = "wishlist-add-button";
        addButton.textContent = "Add to Bag";

        addButton.addEventListener("click", function () {
            addWishlistProductToCart(product);
        });

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "wishlist-remove-button";
        removeButton.textContent = "Remove ♡";

        removeButton.addEventListener("click", function () {
            removeWishlistProduct(product.id);
        });

        actions.append(addButton, removeButton);
        info.append(category, name, price, actions);
        card.append(imageWrapper, info);

        wishlistGrid.appendChild(card);
    });
}

// Remove product from wishlist
function removeWishlistProduct(productId) {
    const updatedWishlist = getSavedWishlist().filter(
        id => id !== String(productId)
    );

    saveWishlistItems(updatedWishlist);
    renderWishlist();
}

// Add product to cart
function addWishlistProductToCart(product) {
    try {
        const savedCart = JSON.parse(
            localStorage.getItem(CART_STORAGE_KEY) || "[]"
        );

        if (!Array.isArray(savedCart)) {
            throw new Error("Invalid cart format");
        }

        const existingItem = savedCart.find(item =>
            String(item.id) === product.id
        );

        if (existingItem) {
            existingItem.quantity =
                (Number(existingItem.quantity) || 1) + 1;
        } else {
            savedCart.push({
                id: Number(product.id),
                name: product.name,
                price: product.price,
                image: product.image,
                quantity: 1
            });
        }

        localStorage.setItem(
            CART_STORAGE_KEY,
            JSON.stringify(savedCart)
        );


    } catch (error) {
        console.error("Unable to add product to cart:", error);
        alert("Unable to update your bag. Please try again.");
    }
}

// Initialize wishlist page
document.addEventListener("DOMContentLoaded", renderWishlist);