import Typesense from 'typesense';
import { getDb } from './db';

const TYPESENSE_HOST = process.env.TYPESENSE_HOST || '';
const TYPESENSE_PORT = process.env.TYPESENSE_PORT || '';
const TYPESENSE_PROTOCOL = process.env.TYPESENSE_PROTOCOL || 'http';
const TYPESENSE_API_KEY = process.env.TYPESENSE_API_KEY || '';

let client: any = null;
let enabled = false;

if (TYPESENSE_HOST && TYPESENSE_API_KEY) {
  try {
    client = new Typesense.Client({
      nodes: [
        { host: TYPESENSE_HOST, port: parseInt(TYPESENSE_PORT || (TYPESENSE_PROTOCOL === 'https' ? '443' : '8108'), 10), protocol: TYPESENSE_PROTOCOL }
      ],
      apiKey: TYPESENSE_API_KEY,
      connectionTimeoutSeconds: 2,
    });
    enabled = true;
  } catch (err) {
    console.error('Failed to initialize Typesense client', err);
    enabled = false;
  }
}

async function ensureCollection() {
  if (!enabled || !client) return;
  try {
    const schema = {
      name: 'products',
      fields: [
        { name: 'id', type: 'string' },
        { name: 'name', type: 'string' },
        { name: 'category', type: 'string', facet: true },
        { name: 'tags', type: 'string[]', facet: true },
        { name: 'price', type: 'float' },
        { name: 'stock', type: 'int32' },
        { name: 'image', type: 'string' },
        { name: 'source', type: 'string', facet: true },
        { name: 'route', type: 'string' }
      ],
      default_sorting_field: 'stock'
    };
    const colList = await client.collections().retrieve();
    const exists = colList.some((c: any) => c.name === 'products');
    if (!exists) {
      await client.collections().create(schema);
    }
  } catch (err: any) {
    if (err?.httpStatus !== 404) {
      // ignore missing collection retrieval errors
    }
  }
}

export async function indexProduct(product: any, opts?: { source?: string, route?: string }) {
  if (!enabled || !client) return;
  try {
    await ensureCollection();
    const source = opts?.source || (product.source) || 'grocery';
    const route = opts?.route || (product.route) || (source === 'ecom' ? '/ecommerce/product/' : '/product/');
    const idVal = String(product._id || product.id);
    const doc = {
      id: `${source}:${idVal}`,
      name: product.name || '',
      category: product.categoryName || product.categoryId || '',
      tags: Array.isArray(product.tags) ? product.tags : (product.tags ? [product.tags] : []),
      price: product.price ? Number(product.price) : 0,
      stock: product.stock ? Number(product.stock) : 0,
      image: product.image || '',
      source,
      route
    };
    await client.collections('products').documents().upsert(doc);
  } catch (err) {
    console.error('Typesense indexProduct error:', err);
  }
}

export async function deleteProductFromIndex(id: string) {
  if (!enabled || !client) return;
  try {
    // id expected in format source:id
    await client.collections('products').documents(id).delete();
  } catch (err) {
    console.error('Typesense deleteProduct error:', err);
  }
}

export async function searchProductsTypesense(q: string, limit = 20) {
  if (!enabled || !client) return null;
  try {
    await ensureCollection();
    const res = await client.collections('products').documents().search({
      q: q,
      query_by: 'name,category,tags',
      per_page: limit,
      sort_by: 'stock:desc'
    });
    const hits = res.hits || [];
    return hits.map((h: any) => ({ id: h.document.id, name: h.document.name, category: h.document.category, tags: h.document.tags, price: h.document.price, stock: h.document.stock, image: h.document.image, source: h.document.source, route: h.document.route, score: h.highlight && h.highlight.length ? h.highlight : 0 }));
  } catch (err) {
    console.error('Typesense search error:', err);
    return null;
  }
}

export const typesenseEnabled = enabled;
