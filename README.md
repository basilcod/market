# Market — Arabic Grocery Storefront

A responsive, right-to-left grocery catalog built in one HTML file with vanilla JavaScript. Categories and products come from two Google Sheets CSV feeds, and checkout prepares a WhatsApp message.

## Run the demo

Requires Python 3 and a modern browser. No package installation or build step is needed.

```bash
git clone https://github.com/basilcod/market.git
cd market
python -m http.server 8081 --bind 127.0.0.1
```

Open **http://127.0.0.1:8081/?demo=1**. On Windows, `py` can replace `python`.

Demo mode loads sample CSV files from `demo/`, uses a separate browser cart, and blocks WhatsApp checkout. The banner confirms that demo mode is active. An internet connection is still required for PapaParse, Google Fonts, and Font Awesome.

## Features

- Category cards with product counts.
- Subcategory filtering and product search.
- Pagination with 20 products per page.
- Product detail dialog, availability display, and quantity controls.
- Persistent cart with an ILS total.
- Customer details and WhatsApp order-message generation.

## Data flow

Published CSV feeds → PapaParse → normalized categories/products → browser filtering and cart → WhatsApp handoff.

There is no application server, payment integration, or database in this repository.

## Configure your own catalog

In `index.html`, set `CATEGORIES_URL`, `PRODUCTS_URL`, and `WA_NUMBER` for your own deployment. The WhatsApp number uses country code and digits without `+`.

Use these CSV headers:

| Feed | Headers |
| --- | --- |
| Categories | `id,name,image,Description,Active` |
| Products | `id,name,price,description,image,stock,category_id,sub_category` |

`category_id` matches a category `id`. `Active=FALSE` hides a category. Prices and stock must be numeric. See the included CSVs for sample rows; only publish catalog data, never private customer information.

## Repository layout

| Path | Purpose |
| --- | --- |
| `index.html` | UI, styling, CSV integration, search, pagination, and cart |
| `demo/categories.csv` | Sample categories |
| `demo/products.csv` | Sample products, including an out-of-stock item |
| `demo/product.svg` | Local sample product illustration |
| `tests/` | Demo-isolation and inline event-encoding regression checks |

## Walkthrough and checks

1. Open `?demo=1`, choose a category, and open a product.
2. Add a product, change its cart quantity, and reload.
3. Search for another product and inspect the out-of-stock example.
4. Attempt checkout; demo mode shows a message and sends nothing.

With Node.js 20 or later, run:

```bash
node --test
```

## Current boundaries

Stock labels are display hints, not inventory reservations; cart quantities are not capped against stock. Normal-mode checkout opens WhatsApp and then clears the cart without delivery confirmation. Social links in the footer are placeholders. Catalog prices and all cart data are controlled by the browser and need server-side validation before real order processing.

Next steps: inventory-aware cart validation, confirmed checkout, resilient storage recovery, and separating the single-file UI into focused modules as it grows.
