import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadEnv } from "vite";

const siteUrl = "https://puchipuchi.in";
const env = loadEnv("production", process.cwd(), "");
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required to generate product share pages.");
}

const escapeHtml = (value = "") => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

const plainText = (value = "") => String(value)
  .replace(/<[^>]*>/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const parseImages = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];

  return String(value).split(",").map((item) => item.trim()).filter(Boolean);
};

const getProductImage = (product) => {
  const variants = product.product_variants || [];
  const variant = variants.find((item) => item.is_active !== false) || variants[0];
  const image = parseImages(variant?.image_urls)[0] || variant?.image_url;

  return image || `${siteUrl}/product-placeholder.svg`;
};

const createProductPage = (product, productPath) => {
  const canonicalUrl = `${siteUrl}/product/${encodeURIComponent(product.slug)}`;
  const title = `${product.name} | Puchi Puchi`;
  const description = plainText(product.description) || `Discover ${product.name} at Puchi Puchi.`;
  const image = getProductImage(product);
  const redirectPath = `/product/${encodeURIComponent(productPath)}`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description.slice(0, 200))}" />
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
    <meta property="og:type" content="product" />
    <meta property="og:site_name" content="Puchi Puchi" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description.slice(0, 200))}" />
    <meta property="og:image" content="${escapeHtml(image)}" />
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description.slice(0, 200))}" />
    <meta name="twitter:image" content="${escapeHtml(image)}" />
    <script>
      sessionStorage.setItem("spa-redirect", ${JSON.stringify(redirectPath)});
      window.location.replace("/");
    </script>
  </head>
  <body><a href="/">Open Puchi Puchi</a></body>
</html>`;
};

const endpoint = new URL(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/products`);
endpoint.searchParams.set("select", "id,slug,name,description,product_variants(image_urls,image_url,is_active)");
endpoint.searchParams.set("is_active", "eq.true");
endpoint.searchParams.set("order", "created_at.desc");

const response = await fetch(endpoint, {
  headers: {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${supabaseAnonKey}`,
  },
});

if (!response.ok) {
  throw new Error(`Could not fetch products for share pages: ${await response.text()}`);
}

const products = await response.json();
const outputRoot = resolve(process.cwd(), "dist", "product");

for (const product of products) {
  if (!product.slug) continue;

  for (const path of [product.slug, product.id]) {
    const outputDirectory = resolve(outputRoot, path);
    await mkdir(outputDirectory, { recursive: true });
    await writeFile(resolve(outputDirectory, "index.html"), createProductPage(product, path));
  }
}

console.log(`Generated ${products.length} product share page${products.length === 1 ? "" : "s"}.`);
