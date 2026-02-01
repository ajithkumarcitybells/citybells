import { db } from "./db";
import { users, categories, products, banners, services } from "@shared/schema";
import { hashPassword } from "./auth";

async function seed() {
  console.log("Starting database seed...");

  // Create admin user
  const existingAdmin = await db.select().from(users);
  if (existingAdmin.length === 0) {
    const hashedPassword = await hashPassword("admin123");
    await db.insert(users).values({
      username: "admin",
      password: hashedPassword,
      name: "Admin User",
      email: "admin@citybell.com",
      isAdmin: true,
    });
    console.log("Admin user created (username: admin, password: admin123)");
  }

  // Create categories
  const existingCategories = await db.select().from(categories);
  if (existingCategories.length === 0) {
    const categoryData = [
      { name: "Fruits", image: "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=200", sortOrder: 0 },
      { name: "Vegetables", image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=200", sortOrder: 1 },
      { name: "Dairy", image: "https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=200", sortOrder: 2 },
      { name: "Bakery", image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200", sortOrder: 3 },
      { name: "Beverages", image: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=200", sortOrder: 4 },
      { name: "Snacks", image: "https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=200", sortOrder: 5 },
      { name: "Grocery", image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200", sortOrder: 6 },
      { name: "Meat & Fish", image: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=200", sortOrder: 7 },
    ];
    const insertedCategories = await db.insert(categories).values(categoryData).returning();
    console.log(`${insertedCategories.length} categories created`);

    // Create products for each category
    const productData = [
      // Fruits
      { name: "Fresh Apples", description: "Crisp and juicy red apples", image: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400", categoryId: insertedCategories[0].id, originalPrice: "180.00", discountPercent: 10, price: "162.00", rating: "4.5", unit: "1 kg" },
      { name: "Organic Bananas", description: "Sweet yellow bananas", image: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400", categoryId: insertedCategories[0].id, originalPrice: "60.00", discountPercent: 0, price: "60.00", rating: "4.3", unit: "1 dozen" },
      { name: "Fresh Oranges", description: "Juicy citrus oranges", image: "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=400", categoryId: insertedCategories[0].id, originalPrice: "120.00", discountPercent: 15, price: "102.00", rating: "4.6", unit: "1 kg" },
      { name: "Watermelon", description: "Sweet and refreshing", image: "https://images.unsplash.com/photo-1589984662646-e7b2e4962f18?w=400", categoryId: insertedCategories[0].id, originalPrice: "50.00", discountPercent: 0, price: "50.00", rating: "4.4", unit: "1 pc" },
      { name: "Mango", description: "Alphonso mangoes", image: "https://images.unsplash.com/photo-1553279768-865429fa0078?w=400", categoryId: insertedCategories[0].id, originalPrice: "350.00", discountPercent: 20, price: "280.00", rating: "4.8", unit: "1 kg" },
      
      // Vegetables
      { name: "Fresh Tomatoes", description: "Ripe red tomatoes", image: "https://images.unsplash.com/photo-1546470427-f5d2d3c5d0b1?w=400", categoryId: insertedCategories[1].id, originalPrice: "40.00", discountPercent: 0, price: "40.00", rating: "4.2", unit: "500g" },
      { name: "Green Capsicum", description: "Fresh bell peppers", image: "https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=400", categoryId: insertedCategories[1].id, originalPrice: "80.00", discountPercent: 10, price: "72.00", rating: "4.1", unit: "500g" },
      { name: "Onions", description: "Fresh red onions", image: "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=400", categoryId: insertedCategories[1].id, originalPrice: "35.00", discountPercent: 0, price: "35.00", rating: "4.0", unit: "1 kg" },
      { name: "Potatoes", description: "Fresh potatoes", image: "https://images.unsplash.com/photo-1518977676601-b53f82ber1b9?w=400", categoryId: insertedCategories[1].id, originalPrice: "45.00", discountPercent: 5, price: "42.75", rating: "4.2", unit: "1 kg" },
      { name: "Spinach", description: "Fresh leafy greens", image: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400", categoryId: insertedCategories[1].id, originalPrice: "30.00", discountPercent: 0, price: "30.00", rating: "4.3", unit: "1 bunch" },
      { name: "Carrots", description: "Fresh orange carrots", image: "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400", categoryId: insertedCategories[1].id, originalPrice: "55.00", discountPercent: 10, price: "49.50", rating: "4.4", unit: "500g" },
      
      // Dairy
      { name: "Full Cream Milk", description: "Farm fresh milk", image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400", categoryId: insertedCategories[2].id, originalPrice: "65.00", discountPercent: 0, price: "65.00", rating: "4.5", unit: "1 liter" },
      { name: "Amul Butter", description: "Creamy butter", image: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400", categoryId: insertedCategories[2].id, originalPrice: "56.00", discountPercent: 0, price: "56.00", rating: "4.7", unit: "100g" },
      { name: "Fresh Paneer", description: "Cottage cheese", image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400", categoryId: insertedCategories[2].id, originalPrice: "120.00", discountPercent: 5, price: "114.00", rating: "4.4", unit: "200g" },
      { name: "Yogurt", description: "Fresh curd", image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400", categoryId: insertedCategories[2].id, originalPrice: "45.00", discountPercent: 0, price: "45.00", rating: "4.3", unit: "400g" },
      { name: "Cheese Slices", description: "Processed cheese", image: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400", categoryId: insertedCategories[2].id, originalPrice: "140.00", discountPercent: 15, price: "119.00", rating: "4.2", unit: "200g" },
      
      // Bakery
      { name: "White Bread", description: "Soft sandwich bread", image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400", categoryId: insertedCategories[3].id, originalPrice: "45.00", discountPercent: 0, price: "45.00", rating: "4.1", unit: "400g" },
      { name: "Croissants", description: "Buttery French pastry", image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400", categoryId: insertedCategories[3].id, originalPrice: "80.00", discountPercent: 10, price: "72.00", rating: "4.6", unit: "2 pcs" },
      { name: "Chocolate Cake", description: "Rich chocolate cake", image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400", categoryId: insertedCategories[3].id, originalPrice: "450.00", discountPercent: 0, price: "450.00", rating: "4.8", unit: "500g" },
      
      // Beverages
      { name: "Orange Juice", description: "Fresh squeezed juice", image: "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400", categoryId: insertedCategories[4].id, originalPrice: "120.00", discountPercent: 10, price: "108.00", rating: "4.4", unit: "1 liter" },
      { name: "Green Tea", description: "Organic green tea", image: "https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=400", categoryId: insertedCategories[4].id, originalPrice: "180.00", discountPercent: 15, price: "153.00", rating: "4.5", unit: "100g" },
      { name: "Cold Coffee", description: "Ready to drink coffee", image: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400", categoryId: insertedCategories[4].id, originalPrice: "60.00", discountPercent: 0, price: "60.00", rating: "4.3", unit: "200ml" },
      
      // Snacks
      { name: "Potato Chips", description: "Crispy salted chips", image: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400", categoryId: insertedCategories[5].id, originalPrice: "40.00", discountPercent: 0, price: "40.00", rating: "4.2", unit: "150g" },
      { name: "Mixed Nuts", description: "Premium dry fruits", image: "https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=400", categoryId: insertedCategories[5].id, originalPrice: "350.00", discountPercent: 20, price: "280.00", rating: "4.7", unit: "250g" },
      { name: "Dark Chocolate", description: "70% cocoa chocolate", image: "https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=400", categoryId: insertedCategories[5].id, originalPrice: "150.00", discountPercent: 10, price: "135.00", rating: "4.6", unit: "100g" },
      
      // Grocery
      { name: "Basmati Rice", description: "Premium aged rice", image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400", categoryId: insertedCategories[6].id, originalPrice: "180.00", discountPercent: 0, price: "180.00", rating: "4.5", unit: "1 kg" },
      { name: "Olive Oil", description: "Extra virgin olive oil", image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400", categoryId: insertedCategories[6].id, originalPrice: "450.00", discountPercent: 10, price: "405.00", rating: "4.6", unit: "500ml" },
      { name: "Honey", description: "Pure organic honey", image: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400", categoryId: insertedCategories[6].id, originalPrice: "280.00", discountPercent: 15, price: "238.00", rating: "4.7", unit: "500g" },
      { name: "Whole Wheat Flour", description: "Atta for chapati", image: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400", categoryId: insertedCategories[6].id, originalPrice: "50.00", discountPercent: 0, price: "50.00", rating: "4.3", unit: "1 kg" },
      
      // Meat & Fish
      { name: "Chicken Breast", description: "Boneless chicken", image: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400", categoryId: insertedCategories[7].id, originalPrice: "280.00", discountPercent: 0, price: "280.00", rating: "4.4", unit: "500g" },
      { name: "Fresh Salmon", description: "Atlantic salmon fillet", image: "https://images.unsplash.com/photo-1574781330855-d0db8cc6a79c?w=400", categoryId: insertedCategories[7].id, originalPrice: "650.00", discountPercent: 10, price: "585.00", rating: "4.6", unit: "500g" },
      { name: "Prawns", description: "Fresh tiger prawns", image: "https://images.unsplash.com/photo-1565680018093-ebb6e41fd8c5?w=400", categoryId: insertedCategories[7].id, originalPrice: "450.00", discountPercent: 15, price: "382.50", rating: "4.5", unit: "500g" },
    ];
    
    const insertedProducts = await db.insert(products).values(productData).returning();
    console.log(`${insertedProducts.length} products created`);
  }

  // Create banners
  const existingBanners = await db.select().from(banners);
  if (existingBanners.length === 0) {
    const bannerData = [
      { title: "CHOOSE FRESH", subtitle: "Fruit & Vegetables Special Promo - Fresh every day at pocket-friendly prices", image: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=600", sortOrder: 0 },
      { title: "DAIRY DELIGHTS", subtitle: "Farm fresh dairy products delivered to your doorstep", image: "https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=600", sortOrder: 1 },
      { title: "WEEKEND SPECIALS", subtitle: "Up to 30% off on selected grocery items", image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600", sortOrder: 2 },
    ];
    const insertedBanners = await db.insert(banners).values(bannerData).returning();
    console.log(`${insertedBanners.length} banners created`);
  }

  // Create services
  const existingServices = await db.select().from(services);
  if (existingServices.length === 0) {
    const serviceData = [
      { name: "Grocery", description: "Fresh & Local Delivered Fast", image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400", isActive: true, sortOrder: 0 },
      { name: "E-Commerce", description: "Essentials & Elegance", image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400", isActive: false, sortOrder: 1 },
      { name: "Food", description: "Delicious Meals Delivered", image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400", isActive: false, sortOrder: 2 },
      { name: "City Move", description: "Instant Delivery", image: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=400", isActive: false, sortOrder: 3 },
      { name: "Hotel", description: "Book Your Stay", image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400", isActive: false, sortOrder: 4 },
      { name: "Taxi", description: "Ride With Comfort", image: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400", isActive: false, sortOrder: 5 },
    ];
    const insertedServices = await db.insert(services).values(serviceData).returning();
    console.log(`${insertedServices.length} services created`);
  }

  console.log("Database seeding complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
