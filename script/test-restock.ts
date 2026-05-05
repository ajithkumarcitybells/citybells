import { storage } from "../server/storage";
import { connectDb } from "../server/db";

async function run() {
  console.log("Starting restock flow test...");
  try {
    await connectDb();
    console.log("DB connected for test script");
    // create a test product with stock 0
    const product = await storage.createProduct({
      name: `Test Restock ${Date.now()}`,
      description: "Test product for restock flow",
      image: null,
      categoryId: null,
      originalPrice: "10.00",
      price: "10.00",
      rating: null,
      stock: 0,
      unit: "pc",
      isActive: true,
      vendorId: null,
      discountPercent: 0,
    } as any);

    console.log("Created product:", product.id, product.name, "stock=", product.stock);

    // create a test user
    const user = await storage.createUser({ username: `restock_user_${Date.now()}`, password: "password123", name: "Restock Tester" } as any);
    console.log("Created user:", user.id, user.username);

    // subscribe the user to restock
    await storage.addRestockSubscription(user.id, product.id);
    console.log(`Subscribed user ${user.id} to product ${product.id}`);

    // sanity: list subscriptions for product
    const subsBefore = await storage.getRestockSubscriptionsByProduct(product.id);
    console.log("Subscriptions before restock:", subsBefore.length);

    // update product stock from 0 -> 5 (should trigger notifications)
    const updated = await storage.updateProduct(product.id, { stock: 5 } as any);
    console.log("Updated product stock to:", updated?.stock);

    // fetch notifications for user
    const notifs = await storage.getNotifications(user.id);
    console.log("Notifications for user:", notifs.length);
    if (notifs.length > 0) console.log(notifs[0]);

    // check subscriptions cleaned up
    const subsAfter = await storage.getRestockSubscriptionsByProduct(product.id);
    console.log("Subscriptions after restock (should be 0):", subsAfter.length);

    console.log("Test complete.");
  } catch (err) {
    console.error("Error during restock test:", err);
  } finally {
    process.exit(0);
  }
}

run();
