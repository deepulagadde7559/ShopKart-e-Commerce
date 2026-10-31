// ========================================
// ShopKart - Shopping Cart
// ========================================

const products = [
    {
        id: 1,
        name: "Wireless Headphones",
        price: 1499,
        category: "Electronics",
        image: "images/headphones.jpg"
    },
    {
        id: 2,
        name: "Ceramic Coffee Mug",
        price: 399,
        category: "Home & Kitchen",
        image: "images/mug.jpg"
    },
    {
        id: 3,
        name: "Travel Water Bottle",
        price: 599,
        category: "Accessories",
        image: "images/waterbottle.jpg"
    },
    {
        id: 4,
        name: "Everyday Carry Tote",
        price: 799,
        category: "Accessories",
        image: "images/tote.jpg"
    }
];

// Restore cart after refresh
let cart = JSON.parse(localStorage.getItem("shopkartCart")) || [];

// Save cart
function saveCart() {
    localStorage.setItem("shopkartCart", JSON.stringify(cart));
}

// Total quantity
function getCartCount() {
    return cart.reduce((total, item) => total + item.quantity, 0);
}

// Add product to cart
function addToCart(productId) {
    const product = products.find(item => item.id === productId);

    if (!product) return;

    const existingItem = cart.find(item => item.id === productId);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            ...product,
            quantity: 1
        });
    }

    saveCart();
    updateCartCount();

}

// Update navbar cart count
function updateCartCount() {
    const cartCount = document.getElementById("cartCount");

    if (cartCount) {
        cartCount.textContent = getCartCount();
    }
}
// Connect product buttons
function setupAddToCartButtons() {
    const buttons = document.querySelectorAll(".add-button");

    buttons.forEach((button, index) => {
        if (index < products.length) {
            button.addEventListener("click", () => {
                addToCart(products[index].id);
            });
        }
    });
}

// Initialize
document.addEventListener("DOMContentLoaded", function () {
    updateCartCount();
    setupAddToCartButtons();
    setupProductFilters();
});

// ========================================
// ShopKart - Product Search and Filter
// ========================================

function setupProductFilters() {
    const searchInput = document.getElementById("productSearch");
    const productGrid = document.querySelector(".product-grid");
    const noProductsMessage = document.getElementById("noProductsMessage");

    const categoryDropdown = document.getElementById("customCategoryDropdown");
    const categoryButton = document.getElementById("categoryDropdownButton");
    const categoryMenu = document.getElementById("categoryDropdownMenu");
    const categoryLabel = document.getElementById("selectedCategoryLabel");

    const sortDropdown = document.getElementById("customSortDropdown");
    const sortButton = document.getElementById("sortDropdownButton");
    const sortMenu = document.getElementById("sortDropdownMenu");
    const sortLabel = document.getElementById("selectedSortLabel");

    if (!searchInput || !productGrid) {
        return;
    }

    const productCards = Array.from(
        productGrid.querySelectorAll(".product-card")
    );

    let selectedCategory = "all";
    let selectedSort = "default";

    // Close a custom dropdown
    function closeDropdown(menu, button, wrapper) {
        if (!menu || !button || !wrapper) return;

        menu.hidden = true;
        button.setAttribute("aria-expanded", "false");
        wrapper.classList.remove("is-open");
    }

    // Toggle a custom dropdown
    function toggleDropdown(menu, button, wrapper) {
        if (!menu || !button || !wrapper) return;

        const shouldOpen = menu.hidden;

        // Close both menus before opening the requested one
        closeDropdown(categoryMenu, categoryButton, categoryDropdown);
        closeDropdown(sortMenu, sortButton, sortDropdown);

        if (shouldOpen) {
            menu.hidden = false;
            button.setAttribute("aria-expanded", "true");
            wrapper.classList.add("is-open");
        }
    }

    // Filter and sort products
    function filterAndSortProducts() {
        const searchText = searchInput.value.trim().toLowerCase();

        let visibleCards = productCards.filter(card => {
            const name =
                card.querySelector("h3")?.textContent.trim().toLowerCase() || "";

            const product = products.find(
                item => item.name.toLowerCase() === name
            );

            const category = product?.category || "";

            const matchesSearch = name.includes(searchText);

            const matchesCategory =
                selectedCategory === "all" ||
                category === selectedCategory;

            return matchesSearch && matchesCategory;
        });

        // Price sorting
        if (selectedSort === "low-high" || selectedSort === "high-low") {
            visibleCards.sort((a, b) => {
                const nameA = a.querySelector("h3").textContent.trim().toLowerCase();
                const nameB = b.querySelector("h3").textContent.trim().toLowerCase();

                const priceA = products.find(
                    item => item.name.toLowerCase() === nameA
                )?.price || 0;

                const priceB = products.find(
                    item => item.name.toLowerCase() === nameB
                )?.price || 0;

                return selectedSort === "low-high"
                    ? priceA - priceB
                    : priceB - priceA;
            });
        }

        productCards.forEach(card => {
            card.hidden = true;
        });

        visibleCards.forEach(card => {
            card.hidden = false;
            productGrid.appendChild(card);
        });

        if (noProductsMessage) {
            noProductsMessage.hidden = visibleCards.length > 0;
        }
    }

    // Search
    searchInput.addEventListener("input", filterAndSortProducts);

    // Category dropdown
    if (categoryDropdown && categoryButton && categoryMenu && categoryLabel) {
        const categoryOptions = categoryMenu.querySelectorAll(
            ".category-dropdown-option"
        );

        categoryButton.addEventListener("click", event => {
            event.stopPropagation();

            toggleDropdown(
                categoryMenu,
                categoryButton,
                categoryDropdown
            );
        });

        categoryOptions.forEach(option => {
            option.addEventListener("click", () => {
                selectedCategory = option.dataset.category;

                categoryLabel.textContent = option.textContent.trim();

                categoryOptions.forEach(item => {
                    item.classList.remove("active");
                    item.removeAttribute("aria-current");
                });

                option.classList.add("active");
                option.setAttribute("aria-current", "true");

                filterAndSortProducts();

                closeDropdown(
                    categoryMenu,
                    categoryButton,
                    categoryDropdown
                );
            });
        });
    }

    // Price sorting dropdown
    if (sortDropdown && sortButton && sortMenu && sortLabel) {
        const sortOptions = sortMenu.querySelectorAll(
            ".sort-dropdown-option"
        );

        sortButton.addEventListener("click", event => {
            event.stopPropagation();

            toggleDropdown(sortMenu, sortButton, sortDropdown);
        });

        sortOptions.forEach(option => {
            option.addEventListener("click", () => {
                selectedSort = option.dataset.sort;

                sortLabel.textContent = option.textContent.trim();

                sortOptions.forEach(item => {
                    item.classList.remove("active");
                    item.removeAttribute("aria-current");
                });

                option.classList.add("active");
                option.setAttribute("aria-current", "true");

                filterAndSortProducts();

                closeDropdown(
                    sortMenu,
                    sortButton,
                    sortDropdown
                );
            });
        });
    }

    // Close menus when clicking outside
    document.addEventListener("click", event => {
        if (categoryDropdown && !categoryDropdown.contains(event.target)) {
            closeDropdown(categoryMenu, categoryButton, categoryDropdown);
        }

        if (sortDropdown && !sortDropdown.contains(event.target)) {
            closeDropdown(sortMenu, sortButton, sortDropdown);
        }
    });

    // Close menus with Escape key
    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeDropdown(categoryMenu, categoryButton, categoryDropdown);
            closeDropdown(sortMenu, sortButton, sortDropdown);
        }
    });

    filterAndSortProducts();
}

// ========================================
// SHOPKART WISHLIST FUNCTIONALITY
// ========================================

const WISHLIST_KEY = "shopkartWishlist";

// Get saved wishlist product IDs
function getWishlist() {
    try {
        const wishlist = JSON.parse(
            localStorage.getItem(WISHLIST_KEY) || "[]"
        );

        return Array.isArray(wishlist) ? wishlist.map(String) : [];
    } catch (error) {
        console.error("Unable to read wishlist:", error);
        return [];
    }
}

// Save wishlist product IDs
function saveWishlist(wishlist) {
    localStorage.setItem(
        WISHLIST_KEY,
        JSON.stringify(wishlist)
    );
}

// Update heart button appearance
function updateWishlistButtons() {
    const wishlist = getWishlist();

    const wishlistCount = document.getElementById("navbarWishlistCount");

        if (wishlistCount) {
        wishlistCount.textContent = getWishlist().length;
    }

    document.querySelectorAll(".wishlist-button").forEach(button => {
        const productId = button.dataset.productId;
        const isActive = wishlist.includes(productId);

        button.classList.toggle("active", isActive);
        button.setAttribute("aria-pressed", String(isActive));

        const productName = button.getAttribute("aria-label")
            .replace(/^Add /, "")
            .replace(/ to wishlist$/, "")
            .replace(/^Remove /, "");

        button.setAttribute(
            "aria-label",
            `${isActive ? "Remove" : "Add"} ${productName} ${
                isActive ? "from" : "to"
            } wishlist`
        );
    });
}

// Toggle product in wishlist
function setupWishlistButtons() {
    document.querySelectorAll(".wishlist-button").forEach(button => {
        button.addEventListener("click", function () {
            const productId = this.dataset.productId;
            let wishlist = getWishlist();

            if (wishlist.includes(productId)) {
                wishlist = wishlist.filter(id => id !== productId);
            } else {
                wishlist.push(productId);
            }

            saveWishlist(wishlist);
            updateWishlistButtons();
        });
    });

    updateWishlistButtons();
}

// Initialize wishlist after page loads
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupWishlistButtons);
} else {
    setupWishlistButtons();
}