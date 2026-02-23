import { db } from "./db";
import { users, categories, products, banners, services, cartItems, wishlistItems, ecomCategories, ecomProducts, sellerProfiles } from "@shared/schema";
import { hashPassword } from "./auth";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Starting database seed...");

  // Create or update admin user
  const existingAdmin = await db.select().from(users).where(eq(users.username, "admin"));
  const hashedPassword = await hashPassword("admin123");
  
  if (existingAdmin.length === 0) {
    await db.insert(users).values({
      username: "admin",
      password: hashedPassword,
      name: "Admin User",
      email: "admin@citybell.com",
      isAdmin: true,
    });
    console.log("Admin user created (username: admin, password: admin123)");
  } else {
    // Update existing admin password to ensure it's correct
    await db.update(users)
      .set({ password: hashedPassword, isAdmin: true })
      .where(eq(users.username, "admin"));
    console.log("Admin user password updated (username: admin, password: admin123)");
  }

  // Only seed categories and products if none exist (don't clear existing data)
  const existingCategories = await db.select().from(categories);
  
  if (existingCategories.length > 0) {
    console.log(`Found ${existingCategories.length} existing categories, skipping grocery seed to preserve data`);
    await seedEcommerce();
    return;
  }
  
  console.log("No categories found, seeding initial data...");

  // Create categories matching the design
  const categoryData = [
    { name: "Fruits & Vegetables", image: "/categories/fruits-vegetables.jpg", sortOrder: 0 },
    { name: "Bakery, Cakes & Dairy", image: "/categories/bakery-dairy.jpg", sortOrder: 1 },
    { name: "Breakfast & More", image: "/categories/breakfast.jpg", sortOrder: 2 },
    { name: "Beverages", image: "/categories/beverages.jpg", sortOrder: 3 },
    { name: "Snacks", image: "/categories/snacks.jpg", sortOrder: 4 },
    { name: "Grocery & Staples", image: "/categories/grocery.jpg", sortOrder: 5 },
    { name: "Meat & Fish", image: "/categories/meat-fish.jpg", sortOrder: 6 },
  ];
  const insertedCategories = await db.insert(categories).values(categoryData).returning();
  console.log(`${insertedCategories.length} categories created`);

  // Get category IDs by name
  const fruitsVegId = insertedCategories.find(c => c.name === "Fruits & Vegetables")!.id;
  const bakeryDairyId = insertedCategories.find(c => c.name === "Bakery, Cakes & Dairy")!.id;
  const breakfastId = insertedCategories.find(c => c.name === "Breakfast & More")!.id;
  const beveragesId = insertedCategories.find(c => c.name === "Beverages")!.id;
  const snacksId = insertedCategories.find(c => c.name === "Snacks")!.id;
  const groceryId = insertedCategories.find(c => c.name === "Grocery & Staples")!.id;
  const meatFishId = insertedCategories.find(c => c.name === "Meat & Fish")!.id;

  // Create products from Excel files
  const productData = [
    // ============ FRUITS (27 products from Excel) - Fruits & Vegetables category ============
    { name: "Banana - Yelakki", description: "Fresh sweet Yelakki bananas", image: "/products/banana-yelakki.jpg", categoryId: fruitsVegId, originalPrice: "78.00", discountPercent: 18, price: "64.00", rating: "4.6", unit: "500g" },
    { name: "Banana - Red", description: "Fresh red bananas", image: "/products/banana-red.jpg", categoryId: fruitsVegId, originalPrice: "75.00", discountPercent: 16, price: "63.00", rating: "4.5", unit: "500g" },
    { name: "Banana - Yellow", description: "Fresh yellow bananas", image: "/products/banana-yellow.jpg", categoryId: fruitsVegId, originalPrice: "53.00", discountPercent: 15, price: "45.00", rating: "4.4", unit: "500g" },
    { name: "Banana - Poovan", description: "Fresh Poovan bananas", image: "/products/banana-yellow.jpg", categoryId: fruitsVegId, originalPrice: "58.00", discountPercent: 22, price: "45.00", rating: "4.5", unit: "500g" },
    { name: "Banana - Karpooravalli", description: "Fresh Karpooravalli bananas", image: "/products/banana-yellow.jpg", categoryId: fruitsVegId, originalPrice: "60.00", discountPercent: 20, price: "48.00", rating: "4.4", unit: "500g" },
    { name: "Banana - Nanderam", description: "Fresh Nanderam bananas", image: "/products/banana-yellow.jpg", categoryId: fruitsVegId, originalPrice: "84.00", discountPercent: 25, price: "63.00", rating: "4.5", unit: "3pc" },
    { name: "Apple - Shimla", description: "Fresh Shimla apples", image: "/products/apple-shimla.jpg", categoryId: fruitsVegId, originalPrice: "113.00", discountPercent: 15, price: "96.00", rating: "4.6", unit: "2pc" },
    { name: "Apple - Washington", description: "Premium Washington apples", image: "/products/apple-washington.jpg", categoryId: fruitsVegId, originalPrice: "138.00", discountPercent: 13, price: "120.00", rating: "4.7", unit: "2pc" },
    { name: "Apple - Royal Gala Imported", description: "Imported Royal Gala apples", image: "/products/apple-gala.jpg", categoryId: fruitsVegId, originalPrice: "172.00", discountPercent: 12, price: "151.00", rating: "4.8", unit: "2pc" },
    { name: "Grapes - Green Seedless", description: "Fresh green seedless grapes", image: "/products/grapes-green.jpg", categoryId: fruitsVegId, originalPrice: "69.00", discountPercent: 13, price: "60.00", rating: "4.5", unit: "250g" },
    { name: "Grapes - Bangalore Blue", description: "Fresh Bangalore blue grapes", image: "/products/grapes-black.jpg", categoryId: fruitsVegId, originalPrice: "73.00", discountPercent: 14, price: "63.00", rating: "4.4", unit: "500g" },
    { name: "Grapes - Black Seedless", description: "Fresh black seedless grapes", image: "/products/grapes-black.jpg", categoryId: fruitsVegId, originalPrice: "102.00", discountPercent: 15, price: "87.00", rating: "4.6", unit: "250g" },
    { name: "Grapes - Panner", description: "Fresh Panner grapes", image: "/products/grapes-green.jpg", categoryId: fruitsVegId, originalPrice: "96.00", discountPercent: 20, price: "77.00", rating: "4.5", unit: "500g" },
    { name: "Pomegranate - Maadhulampazham", description: "Fresh juicy pomegranates", image: "/products/pomegranate.jpg", categoryId: fruitsVegId, originalPrice: "309.00", discountPercent: 13, price: "268.00", rating: "4.7", unit: "4pc" },
    { name: "Guava - Koyyapazham", description: "Fresh green guavas", image: "/products/guava.jpg", categoryId: fruitsVegId, originalPrice: "88.00", discountPercent: 13, price: "77.00", rating: "4.4", unit: "500g" },
    { name: "Papaya - Pappali", description: "Fresh ripe papaya", image: "/products/papaya.jpg", categoryId: fruitsVegId, originalPrice: "88.00", discountPercent: 14, price: "76.00", rating: "4.3", unit: "1pc" },
    { name: "Watermelon - Tharpoosani", description: "Fresh sweet watermelon", image: "/products/watermelon.jpg", categoryId: fruitsVegId, originalPrice: "125.00", discountPercent: 18, price: "103.00", rating: "4.5", unit: "1pc" },
    { name: "Muskmelon - Kirani Pazham", description: "Fresh muskmelon", image: "/products/muskmelon.jpg", categoryId: fruitsVegId, originalPrice: "63.00", discountPercent: 13, price: "55.00", rating: "4.3", unit: "1pc" },
    { name: "Pineapple - Annasi", description: "Fresh sweet pineapple", image: "/products/pineapple.jpg", categoryId: fruitsVegId, originalPrice: "120.00", discountPercent: 18, price: "98.00", rating: "4.6", unit: "1pc" },
    { name: "Sapota/Chikoo - Sapota", description: "Fresh sweet sapota", image: "/products/sapota.jpg", categoryId: fruitsVegId, originalPrice: "72.00", discountPercent: 15, price: "61.00", rating: "4.4", unit: "500g" },
    { name: "Custard Apple - Seethapazham", description: "Fresh custard apple", image: "/products/custardapple.jpg", categoryId: fruitsVegId, originalPrice: "141.00", discountPercent: 23, price: "108.00", rating: "4.5", unit: "300g" },
    { name: "Lemon - Elumichai", description: "Fresh tangy lemons", image: "/products/lemon.jpg", categoryId: fruitsVegId, originalPrice: "28.00", discountPercent: 14, price: "24.00", rating: "4.6", unit: "200g" },
    { name: "Orange - Nagpur", description: "Fresh Nagpur oranges", image: "/products/orange.jpg", categoryId: fruitsVegId, originalPrice: "92.00", discountPercent: 14, price: "79.00", rating: "4.5", unit: "500g" },
    { name: "Orange - Imported", description: "Premium imported oranges", image: "/products/orange.jpg", categoryId: fruitsVegId, originalPrice: "82.00", discountPercent: 11, price: "73.00", rating: "4.6", unit: "2pc" },
    { name: "Gooseberry (Amla) - Nellikai", description: "Fresh Indian gooseberry", image: "/products/gooseberry.jpg", categoryId: fruitsVegId, originalPrice: "52.00", discountPercent: 17, price: "43.00", rating: "4.4", unit: "250g" },
    { name: "Fig - Athipazham", description: "Fresh figs", image: "/products/fig.jpg", categoryId: fruitsVegId, originalPrice: "76.00", discountPercent: 14, price: "65.00", rating: "4.5", unit: "250g" },
    { name: "Wood Apple - Vilampazham", description: "Fresh wood apple", image: "/products/woodapple.jpg", categoryId: fruitsVegId, originalPrice: "36.00", discountPercent: 11, price: "32.00", rating: "4.2", unit: "2pc" },

    // ============ VEGETABLES (35 products from Excel) ============
      { name: "Tomato - Thakkali", description: "Fresh red tomatoes", image: "/products/tomato.jpg", categoryId: fruitsVegId, originalPrice: "28.00", discountPercent: 29, price: "20.00", rating: "4.5", unit: "500g" },
      { name: "Potato - Urulai Kilangu", description: "Fresh potatoes", image: "/products/potato.jpg", categoryId: fruitsVegId, originalPrice: "25.00", discountPercent: 20, price: "20.00", rating: "4.3", unit: "500g" },
      { name: "Potato - Ooty", description: "Premium Ooty potatoes", image: "/products/potato.jpg", categoryId: fruitsVegId, originalPrice: "33.00", discountPercent: 24, price: "25.00", rating: "4.6", unit: "500g" },
      { name: "Onion - Vengayam Big", description: "Large fresh onions", image: "/products/onion.jpg", categoryId: fruitsVegId, originalPrice: "54.00", discountPercent: 17, price: "45.00", rating: "4.4", unit: "1 kg" },
      { name: "Onion - Vengayam Regular", description: "Fresh regular onions", image: "/products/onion.jpg", categoryId: fruitsVegId, originalPrice: "36.00", discountPercent: 17, price: "30.00", rating: "4.3", unit: "1 kg" },
      { name: "Brinjal - Kathirikkai Erode", description: "Fresh Erode brinjal", image: "/products/brinjal.jpg", categoryId: fruitsVegId, originalPrice: "28.00", discountPercent: 11, price: "25.00", rating: "4.2", unit: "250g" },
      { name: "Brinjal Vari - Vari Kathirikkai", description: "Fresh Vari brinjal from Erode", image: "/products/brinjal.jpg", categoryId: fruitsVegId, originalPrice: "21.00", discountPercent: 29, price: "15.00", rating: "4.1", unit: "250g" },
      { name: "Lady's Finger - Vendakkai", description: "Fresh green okra", image: "/products/ladyfinger.jpg", categoryId: fruitsVegId, originalPrice: "25.00", discountPercent: 20, price: "20.00", rating: "4.4", unit: "250g" },
      { name: "Carrot", description: "Fresh orange carrots", image: "/products/carrot.jpg", categoryId: fruitsVegId, originalPrice: "42.00", discountPercent: 17, price: "35.00", rating: "4.5", unit: "500g" },
      { name: "Cabbage - Muttai Kosu", description: "Fresh green cabbage", image: "/products/cabbage.jpg", categoryId: fruitsVegId, originalPrice: "28.00", discountPercent: 21, price: "22.00", rating: "4.3", unit: "400-500g" },
      { name: "Cauliflower - Poo Kosu", description: "Fresh white cauliflower", image: "/products/cauliflower.jpg", categoryId: fruitsVegId, originalPrice: "55.00", discountPercent: 27, price: "40.00", rating: "4.4", unit: "400-600g" },
      { name: "Drumstick - Murungakkai", description: "Fresh green drumsticks", image: "/products/drumstick.jpg", categoryId: fruitsVegId, originalPrice: "60.00", discountPercent: 42, price: "35.00", rating: "4.6", unit: "2pc" },
      { name: "Bitter Gourd - Pavakkai", description: "Fresh bitter gourd", image: "/products/bittergourd.jpg", categoryId: fruitsVegId, originalPrice: "26.00", discountPercent: 31, price: "18.00", rating: "4.2", unit: "250g" },
      { name: "Bottle Gourd - Suraikkai", description: "Fresh bottle gourd", image: "/products/bottlegourd.jpg", categoryId: fruitsVegId, originalPrice: "41.00", discountPercent: 15, price: "35.00", rating: "4.3", unit: "1 pc (500-700g)" },
      { name: "Snake Gourd - Pudalangai", description: "Fresh snake gourd", image: "/products/snakegourd.jpg", categoryId: fruitsVegId, originalPrice: "38.00", discountPercent: 21, price: "30.00", rating: "4.1", unit: "500g" },
      { name: "Ridge Gourd - Peerkangai", description: "Fresh ridge gourd", image: "/products/ridgegourd.jpg", categoryId: fruitsVegId, originalPrice: "52.00", discountPercent: 13, price: "45.00", rating: "4.2", unit: "2pc" },
      { name: "Ash Gourd - Sambal Poosanikkai", description: "Fresh ash gourd", image: "/products/ashgourd.jpg", categoryId: fruitsVegId, originalPrice: "44.00", discountPercent: 20, price: "35.00", rating: "4.0", unit: "1pc" },
      { name: "Pumpkin - Poosanikkai", description: "Fresh orange pumpkin", image: "/products/pumpkin.jpg", categoryId: fruitsVegId, originalPrice: "44.00", discountPercent: 20, price: "35.00", rating: "4.3", unit: "1pc" },
      { name: "Ivy Gourd - Kovakkai", description: "Fresh ivy gourd", image: "/products/ivygourd.jpg", categoryId: fruitsVegId, originalPrice: "36.00", discountPercent: 44, price: "20.00", rating: "4.1", unit: "250g" },
      { name: "Ginger - Inji", description: "Fresh ginger root", image: "/products/ginger.jpg", categoryId: fruitsVegId, originalPrice: "32.00", discountPercent: 31, price: "22.00", rating: "4.6", unit: "200g" },
      { name: "Green Chilli - Pachai Milagai", description: "Fresh green chillies", image: "/products/greenchilli.jpg", categoryId: fruitsVegId, originalPrice: "30.00", discountPercent: 50, price: "15.00", rating: "4.4", unit: "150g" },
      { name: "Green Chilli Bullet", description: "Spicy bullet green chillies", image: "/products/greenchilli.jpg", categoryId: fruitsVegId, originalPrice: "31.00", discountPercent: 35, price: "20.00", rating: "4.3", unit: "150g" },
      { name: "Radish - Mullangi", description: "Fresh white radish", image: "/products/radish.jpg", categoryId: fruitsVegId, originalPrice: "23.00", discountPercent: 35, price: "15.00", rating: "4.2", unit: "250g" },
      { name: "Beetroot - Ooty", description: "Premium Ooty beetroot", image: "/products/beetroot.jpg", categoryId: fruitsVegId, originalPrice: "42.00", discountPercent: 17, price: "35.00", rating: "4.5", unit: "500g" },
      { name: "Beetroot", description: "Fresh red beetroot", image: "/products/beetroot.jpg", categoryId: fruitsVegId, originalPrice: "32.00", discountPercent: 22, price: "25.00", rating: "4.3", unit: "500g" },
      { name: "Beans - Ooty", description: "Premium Ooty green beans", image: "/products/beans.jpg", categoryId: fruitsVegId, originalPrice: "34.00", discountPercent: 26, price: "25.00", rating: "4.5", unit: "250g" },
      { name: "Beans", description: "Fresh green beans", image: "/products/beans.jpg", categoryId: fruitsVegId, originalPrice: "27.00", discountPercent: 26, price: "20.00", rating: "4.3", unit: "250g" },
      { name: "Cluster Beans - Kothavarangai", description: "Fresh cluster beans", image: "/products/clusterbeans.jpg", categoryId: fruitsVegId, originalPrice: "31.00", discountPercent: 19, price: "25.00", rating: "4.2", unit: "250g" },
      { name: "Elephant Foot Yam - Karunai Kilangu", description: "Fresh elephant foot yam", image: "/products/elephantyam.jpg", categoryId: fruitsVegId, originalPrice: "50.00", discountPercent: 10, price: "45.00", rating: "4.1", unit: "1pc (400-500g)" },
      { name: "Colocasia/Taro - Seppan Kilangu", description: "Fresh taro root", image: "/products/taro.jpg", categoryId: fruitsVegId, originalPrice: "42.00", discountPercent: 17, price: "35.00", rating: "4.0", unit: "500g" },
      { name: "Sweet Potato - Sakkarai Valli Kilangu", description: "Fresh sweet potato", image: "/products/sweetpotato.jpg", categoryId: fruitsVegId, originalPrice: "33.00", discountPercent: 18, price: "27.00", rating: "4.4", unit: "250g" },
      { name: "Tapioca - Maravalli Kilangu", description: "Fresh tapioca root", image: "/products/tapioca.jpg", categoryId: fruitsVegId, originalPrice: "62.00", discountPercent: 10, price: "56.00", rating: "4.2", unit: "500g" },
      { name: "Raw Banana - Vazhaikkai", description: "Fresh raw banana", image: "/products/rawbanana.jpg", categoryId: fruitsVegId, originalPrice: "16.00", discountPercent: 25, price: "12.00", rating: "4.3", unit: "1 pc" },
      { name: "Banana Flower - Vazhaipoo", description: "Fresh banana flower", image: "/products/bananaflower.jpg", categoryId: fruitsVegId, originalPrice: "38.00", discountPercent: 21, price: "30.00", rating: "4.2", unit: "600-800g approx" },
      { name: "Banana Stem - Vazhaithandu", description: "Fresh banana stem", image: "/products/bananastem.jpg", categoryId: fruitsVegId, originalPrice: "35.00", discountPercent: 29, price: "25.00", rating: "4.1", unit: "1 pc" },

      // ============ DAIRY (5 products) ============
      { name: "Full Cream Milk", description: "Farm fresh milk", image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400", categoryId: bakeryDairyId, originalPrice: "65.00", discountPercent: 0, price: "65.00", rating: "4.5", unit: "1 liter" },
      { name: "Amul Butter", description: "Creamy butter", image: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400", categoryId: bakeryDairyId, originalPrice: "56.00", discountPercent: 0, price: "56.00", rating: "4.7", unit: "100g" },
      { name: "Fresh Paneer", description: "Cottage cheese", image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400", categoryId: bakeryDairyId, originalPrice: "120.00", discountPercent: 5, price: "114.00", rating: "4.4", unit: "200g" },
      { name: "Yogurt", description: "Fresh curd", image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400", categoryId: bakeryDairyId, originalPrice: "45.00", discountPercent: 0, price: "45.00", rating: "4.3", unit: "400g" },
      { name: "Cheese Slices", description: "Processed cheese", image: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400", categoryId: bakeryDairyId, originalPrice: "140.00", discountPercent: 15, price: "119.00", rating: "4.2", unit: "200g" },

      // ============ BAKERY (3 products) ============
      { name: "White Bread", description: "Soft sandwich bread", image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400", categoryId: bakeryDairyId, originalPrice: "45.00", discountPercent: 0, price: "45.00", rating: "4.1", unit: "400g" },
      { name: "Croissants", description: "Buttery French pastry", image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400", categoryId: bakeryDairyId, originalPrice: "80.00", discountPercent: 10, price: "72.00", rating: "4.6", unit: "2 pcs" },
      { name: "Chocolate Cake", description: "Rich chocolate cake", image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400", categoryId: bakeryDairyId, originalPrice: "450.00", discountPercent: 0, price: "450.00", rating: "4.8", unit: "500g" },

      // ============ BEVERAGES (3 products) ============
      { name: "Orange Juice", description: "Fresh squeezed juice", image: "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400", categoryId: beveragesId, originalPrice: "120.00", discountPercent: 10, price: "108.00", rating: "4.4", unit: "1 liter" },
      { name: "Green Tea", description: "Organic green tea", image: "https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=400", categoryId: beveragesId, originalPrice: "180.00", discountPercent: 15, price: "153.00", rating: "4.5", unit: "100g" },
      { name: "Cold Coffee", description: "Ready to drink coffee", image: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400", categoryId: beveragesId, originalPrice: "60.00", discountPercent: 0, price: "60.00", rating: "4.3", unit: "200ml" },

      // ============ SNACKS (3 products) ============
      { name: "Potato Chips", description: "Crispy salted chips", image: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400", categoryId: snacksId, originalPrice: "40.00", discountPercent: 0, price: "40.00", rating: "4.2", unit: "150g" },
      { name: "Mixed Nuts", description: "Premium dry fruits", image: "https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=400", categoryId: snacksId, originalPrice: "350.00", discountPercent: 20, price: "280.00", rating: "4.7", unit: "250g" },
      { name: "Dark Chocolate", description: "70% cocoa chocolate", image: "https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=400", categoryId: snacksId, originalPrice: "150.00", discountPercent: 10, price: "135.00", rating: "4.6", unit: "100g" },

      // ============ GROCERY (4 products) ============
      { name: "Basmati Rice", description: "Premium aged rice", image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400", categoryId: groceryId, originalPrice: "180.00", discountPercent: 0, price: "180.00", rating: "4.5", unit: "1 kg" },
      { name: "Olive Oil", description: "Extra virgin olive oil", image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400", categoryId: groceryId, originalPrice: "450.00", discountPercent: 10, price: "405.00", rating: "4.6", unit: "500ml" },
      { name: "Honey", description: "Pure organic honey", image: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400", categoryId: groceryId, originalPrice: "280.00", discountPercent: 15, price: "238.00", rating: "4.7", unit: "500g" },
      { name: "Whole Wheat Flour", description: "Atta for chapati", image: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400", categoryId: groceryId, originalPrice: "50.00", discountPercent: 0, price: "50.00", rating: "4.3", unit: "1 kg" },

      // ============ MEAT & FISH (3 products) ============
      { name: "Chicken Breast", description: "Boneless chicken", image: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400", categoryId: meatFishId, originalPrice: "280.00", discountPercent: 0, price: "280.00", rating: "4.4", unit: "500g" },
      { name: "Fresh Salmon", description: "Atlantic salmon fillet", image: "https://images.unsplash.com/photo-1574781330855-d0db8cc6a79c?w=400", categoryId: meatFishId, originalPrice: "650.00", discountPercent: 10, price: "585.00", rating: "4.6", unit: "500g" },
      { name: "Prawns", description: "Fresh tiger prawns", image: "https://images.unsplash.com/photo-1565680018093-ebb6e41fd8c5?w=400", categoryId: meatFishId, originalPrice: "450.00", discountPercent: 15, price: "382.50", rating: "4.5", unit: "500g" },
    ];
    
  const insertedProducts = await db.insert(products).values(productData).returning();
  console.log(`${insertedProducts.length} products created`);

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
      { name: "E-Commerce", description: "Essentials & Elegance", image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400", isActive: true, sortOrder: 1 },
      { name: "Food", description: "Delicious Meals Delivered", image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400", isActive: false, sortOrder: 2 },
      { name: "City Move", description: "Instant Delivery", image: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=400", isActive: false, sortOrder: 3 },
      { name: "Hotel", description: "Book Your Stay", image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400", isActive: false, sortOrder: 4 },
      { name: "Taxi", description: "Ride With Comfort", image: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400", isActive: false, sortOrder: 5 },
      { name: "City Serve", description: "Home Services at Your Doorstep", image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400", isActive: false, sortOrder: 6 },
    ];
    const insertedServices = await db.insert(services).values(serviceData).returning();
    console.log(`${insertedServices.length} services created`);
  }

  console.log("Database seeding complete!");

  // Seed E-Commerce data
  await seedEcommerce();
}

async function seedEcommerce() {
  const existingEcomCats = await db.select().from(ecomCategories);
  if (existingEcomCats.length > 0) {
    console.log(`Found ${existingEcomCats.length} existing e-com categories, skipping e-com seed`);
    return;
  }

  console.log("Seeding e-commerce data...");

  const ecomCatData = [
    { name: "Electronics", image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400", sortOrder: 0 },
    { name: "Fashion", image: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=400", sortOrder: 1 },
    { name: "Home & Kitchen", image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400", sortOrder: 2 },
    { name: "Beauty & Personal Care", image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400", sortOrder: 3 },
    { name: "Sports & Fitness", image: "https://images.unsplash.com/photo-1461896836934-bd45ba8fcf9b?w=400", sortOrder: 4 },
    { name: "Books", image: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400", sortOrder: 5 },
    { name: "Toys & Games", image: "https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=400", sortOrder: 6 },
    { name: "Accessories", image: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=400", sortOrder: 7 },
  ];
  const insertedEcomCats = await db.insert(ecomCategories).values(ecomCatData).returning();
  console.log(`${insertedEcomCats.length} e-com categories created`);

  const electronicsId = insertedEcomCats.find(c => c.name === "Electronics")!.id;
  const fashionId = insertedEcomCats.find(c => c.name === "Fashion")!.id;
  const homeId = insertedEcomCats.find(c => c.name === "Home & Kitchen")!.id;
  const beautyId = insertedEcomCats.find(c => c.name === "Beauty & Personal Care")!.id;
  const sportsId = insertedEcomCats.find(c => c.name === "Sports & Fitness")!.id;
  const booksId = insertedEcomCats.find(c => c.name === "Books")!.id;
  const toysId = insertedEcomCats.find(c => c.name === "Toys & Games")!.id;
  const accessoriesId = insertedEcomCats.find(c => c.name === "Accessories")!.id;

  const sellerPassword = await hashPassword("seller123");

  const existingSeller = await db.select().from(users).where(eq(users.username, "seller1"));
  let sellerId: string;
  if (existingSeller.length === 0) {
    const [seller] = await db.insert(users).values({
      username: "seller1",
      password: sellerPassword,
      name: "City Bell Store",
      email: "seller@citybell.com",
      isVendor: true,
    }).returning();
    sellerId = seller.id;
    console.log("Demo seller created (username: seller1, password: seller123)");
  } else {
    sellerId = existingSeller[0].id;
    await db.update(users).set({ isVendor: true }).where(eq(users.id, sellerId));
  }

  const existingProfile = await db.select().from(sellerProfiles).where(eq(sellerProfiles.userId, sellerId));
  if (existingProfile.length === 0) {
    await db.insert(sellerProfiles).values({
      userId: sellerId,
      storeName: "City Bell Official Store",
      storeDescription: "Your one-stop shop for quality electronics, fashion, and more. Fast delivery and genuine products guaranteed.",
      logo: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=200",
    });
  }

  const ecomProductData = [
    { name: "Wireless Bluetooth Earbuds", description: "Premium wireless earbuds with noise cancellation, 24-hour battery life, and IPX5 water resistance. Perfect for workouts and daily commute.", images: ["https://images.unsplash.com/photo-1590658268037-6bf12f032f55?w=600", "https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=600"], categoryId: electronicsId, vendorId: sellerId, brand: "SoundMax", sku: "SM-EB-001", originalPrice: "2999.00", discountPercent: 40, price: "1799.00", stock: 150, isApproved: true, isFeatured: true, variants: JSON.stringify([{type: "color", options: ["Black", "White", "Blue"]}]), specifications: JSON.stringify({battery: "24 hours", connectivity: "Bluetooth 5.3", waterproof: "IPX5"}) },
    { name: "Smart Watch Pro", description: "Advanced smartwatch with heart rate monitor, SpO2 tracking, GPS, and 14-day battery life. 1.43-inch AMOLED display.", images: ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600"], categoryId: electronicsId, vendorId: sellerId, brand: "TechFit", sku: "TF-SW-002", originalPrice: "4999.00", discountPercent: 30, price: "3499.00", stock: 80, isApproved: true, isFeatured: true, variants: JSON.stringify([{type: "color", options: ["Black", "Silver", "Rose Gold"]}]), specifications: JSON.stringify({display: "1.43 AMOLED", battery: "14 days", sensors: "HR, SpO2, GPS"}) },
    { name: "10000mAh Power Bank", description: "Compact 10000mAh power bank with 22.5W fast charging. Dual USB-C and USB-A ports. LED battery indicator.", images: ["https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=600"], categoryId: electronicsId, vendorId: sellerId, brand: "ChargeUp", sku: "CU-PB-003", originalPrice: "1499.00", discountPercent: 20, price: "1199.00", stock: 200, isApproved: true, isFeatured: false, specifications: JSON.stringify({capacity: "10000mAh", charging: "22.5W", ports: "USB-C, USB-A"}) },
    { name: "Laptop Stand Aluminum", description: "Ergonomic aluminum laptop stand with adjustable height. Compatible with 10-17 inch laptops. Foldable and portable.", images: ["https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600"], categoryId: electronicsId, vendorId: sellerId, brand: "ErgoDesk", sku: "ED-LS-004", originalPrice: "1899.00", discountPercent: 25, price: "1424.00", stock: 120, isApproved: true, specifications: JSON.stringify({material: "Aluminum", compatibility: "10-17 inch", weight: "280g"}) },
    { name: "USB-C Hub 7-in-1", description: "Multiport USB-C hub with HDMI 4K, USB 3.0, SD card reader, and 100W PD charging. Essential for professionals.", images: ["https://images.unsplash.com/photo-1625842268584-8f3296236761?w=600"], categoryId: electronicsId, vendorId: sellerId, brand: "ConnectPro", sku: "CP-HB-005", originalPrice: "2499.00", discountPercent: 15, price: "2124.00", stock: 90, isApproved: true, specifications: JSON.stringify({ports: "HDMI, 2xUSB3.0, SD, TF, USB-C PD", resolution: "4K@60Hz"}) },

    { name: "Men's Cotton Casual Shirt", description: "Premium cotton casual shirt with a relaxed fit. Breathable fabric perfect for everyday wear. Available in multiple colors.", images: ["https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600", "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600"], categoryId: fashionId, vendorId: sellerId, brand: "UrbanStyle", sku: "US-SH-006", originalPrice: "1299.00", discountPercent: 35, price: "844.00", stock: 300, isApproved: true, isFeatured: true, variants: JSON.stringify([{type: "size", options: ["S", "M", "L", "XL", "XXL"]}, {type: "color", options: ["Navy Blue", "White", "Black", "Olive"]}]) },
    { name: "Women's Running Shoes", description: "Lightweight running shoes with memory foam insole and breathable mesh upper. Perfect for daily jogging and gym workouts.", images: ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600"], categoryId: fashionId, vendorId: sellerId, brand: "RunFlex", sku: "RF-RS-007", originalPrice: "3499.00", discountPercent: 30, price: "2449.00", stock: 150, isApproved: true, isFeatured: true, variants: JSON.stringify([{type: "size", options: ["UK 4", "UK 5", "UK 6", "UK 7", "UK 8"]}, {type: "color", options: ["Pink", "White", "Black"]}]) },
    { name: "Leather Wallet Bifold", description: "Genuine leather bifold wallet with RFID protection. 6 card slots, 2 bill compartments, and coin pocket.", images: ["https://images.unsplash.com/photo-1627123424574-724758594e93?w=600"], categoryId: fashionId, vendorId: sellerId, brand: "LeatherCraft", sku: "LC-WL-008", originalPrice: "999.00", discountPercent: 20, price: "799.00", stock: 250, isApproved: true, variants: JSON.stringify([{type: "color", options: ["Brown", "Black", "Tan"]}]) },
    { name: "Women's Ethnic Kurti", description: "Beautiful printed kurti in pure cotton with mandarin collar and 3/4 sleeves. Perfect for festivals and daily wear.", images: ["https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=600"], categoryId: fashionId, vendorId: sellerId, brand: "EthnicVibes", sku: "EV-KT-009", originalPrice: "1599.00", discountPercent: 40, price: "959.00", stock: 200, isApproved: true, variants: JSON.stringify([{type: "size", options: ["S", "M", "L", "XL"]}, {type: "color", options: ["Red", "Blue", "Green", "Yellow"]}]) },

    { name: "Non-Stick Cookware Set 5pc", description: "Premium 5-piece non-stick cookware set includes kadhai, frying pan, saucepan, tawa, and milk pot. PFOA-free coating.", images: ["https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600"], categoryId: homeId, vendorId: sellerId, brand: "CookMaster", sku: "CM-CK-010", originalPrice: "3999.00", discountPercent: 25, price: "2999.00", stock: 60, isApproved: true, isFeatured: true, specifications: JSON.stringify({pieces: 5, material: "Aluminum", coating: "Non-stick PFOA-free"}) },
    { name: "Bedsheet Set King Size", description: "300 thread count cotton bedsheet with 2 pillow covers. Soft, breathable, and wrinkle-resistant.", images: ["https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600"], categoryId: homeId, vendorId: sellerId, brand: "DreamSleep", sku: "DS-BS-011", originalPrice: "1999.00", discountPercent: 30, price: "1399.00", stock: 100, isApproved: true, variants: JSON.stringify([{type: "color", options: ["White", "Grey", "Blue", "Floral"]}]) },
    { name: "LED Desk Lamp", description: "Adjustable LED desk lamp with 5 brightness levels, 3 color temperatures, and USB charging port. Touch control.", images: ["https://images.unsplash.com/photo-1507473885765-e6ed057ab6fe?w=600"], categoryId: homeId, vendorId: sellerId, brand: "BrightLife", sku: "BL-DL-012", originalPrice: "1299.00", discountPercent: 15, price: "1104.00", stock: 140, isApproved: true, specifications: JSON.stringify({brightness: "5 levels", colors: "3 temperatures", feature: "USB charging"}) },

    { name: "Vitamin C Face Serum", description: "20% Vitamin C serum with Hyaluronic Acid and Niacinamide. Brightens skin, reduces dark spots. 30ml.", images: ["https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600"], categoryId: beautyId, vendorId: sellerId, brand: "GlowUp", sku: "GU-FS-013", originalPrice: "699.00", discountPercent: 20, price: "559.00", stock: 300, isApproved: true, isFeatured: true, specifications: JSON.stringify({volume: "30ml", ingredients: "Vitamin C, Hyaluronic Acid, Niacinamide"}) },
    { name: "Hair Dryer Professional", description: "2000W professional hair dryer with ionic technology, 3 heat settings, and cool shot button. Lightweight design.", images: ["https://images.unsplash.com/photo-1522338242992-e1a54571a9f7?w=600"], categoryId: beautyId, vendorId: sellerId, brand: "StylePro", sku: "SP-HD-014", originalPrice: "2499.00", discountPercent: 20, price: "1999.00", stock: 80, isApproved: true, specifications: JSON.stringify({wattage: "2000W", settings: "3 heat + cold", tech: "Ionic"}) },

    { name: "Yoga Mat Premium 6mm", description: "Extra thick 6mm yoga mat with alignment lines. Anti-slip surface, eco-friendly TPE material. Includes carry strap.", images: ["https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=600"], categoryId: sportsId, vendorId: sellerId, brand: "FlexFit", sku: "FF-YM-015", originalPrice: "1299.00", discountPercent: 25, price: "974.00", stock: 200, isApproved: true, isFeatured: true, variants: JSON.stringify([{type: "color", options: ["Purple", "Blue", "Green", "Pink"]}]) },
    { name: "Resistance Bands Set", description: "Set of 5 resistance bands with different resistance levels. Includes door anchor, handles, and carry bag.", images: ["https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=600"], categoryId: sportsId, vendorId: sellerId, brand: "FitBand", sku: "FB-RB-016", originalPrice: "899.00", discountPercent: 30, price: "629.00", stock: 180, isApproved: true, specifications: JSON.stringify({pieces: 5, levels: "Extra Light to Extra Heavy"}) },
    { name: "Stainless Steel Water Bottle 1L", description: "Double-wall vacuum insulated 1L bottle. Keeps drinks cold 24hrs, hot 12hrs. BPA-free, leak-proof.", images: ["https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600"], categoryId: sportsId, vendorId: sellerId, brand: "HydroMax", sku: "HM-WB-017", originalPrice: "799.00", discountPercent: 15, price: "679.00", stock: 250, isApproved: true, variants: JSON.stringify([{type: "color", options: ["Silver", "Black", "Blue", "Red"]}]) },

    { name: "Atomic Habits by James Clear", description: "An easy and proven way to build good habits and break bad ones. International bestseller with practical strategies.", images: ["https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600"], categoryId: booksId, vendorId: sellerId, brand: "Penguin", sku: "PG-BK-018", originalPrice: "799.00", discountPercent: 30, price: "559.00", stock: 500, isApproved: true, isFeatured: true },
    { name: "The Psychology of Money", description: "Timeless lessons on wealth, greed, and happiness by Morgan Housel. A must-read for financial literacy.", images: ["https://images.unsplash.com/photo-1592496431122-2349e0fbc666?w=600"], categoryId: booksId, vendorId: sellerId, brand: "Jaico", sku: "JC-BK-019", originalPrice: "399.00", discountPercent: 25, price: "299.00", stock: 400, isApproved: true },

    { name: "Building Blocks Set 500pc", description: "Creative building blocks set with 500 pieces in multiple colors and shapes. Compatible with major brands. Ages 4+.", images: ["https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=600"], categoryId: toysId, vendorId: sellerId, brand: "BuildFun", sku: "BF-BB-020", originalPrice: "1499.00", discountPercent: 20, price: "1199.00", stock: 120, isApproved: true, isFeatured: true },
    { name: "Remote Control Car", description: "High-speed RC car with rechargeable battery. 2.4GHz remote, 30m range, all-terrain wheels.", images: ["https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=600"], categoryId: toysId, vendorId: sellerId, brand: "SpeedKing", sku: "SK-RC-021", originalPrice: "1999.00", discountPercent: 25, price: "1499.00", stock: 70, isApproved: true },

    { name: "Sunglasses UV400 Polarized", description: "Classic aviator sunglasses with UV400 polarized lenses. Lightweight metal frame with spring hinges.", images: ["https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600"], categoryId: accessoriesId, vendorId: sellerId, brand: "ShadeElite", sku: "SE-SG-022", originalPrice: "1299.00", discountPercent: 35, price: "844.00", stock: 200, isApproved: true, isFeatured: true, variants: JSON.stringify([{type: "color", options: ["Gold/Green", "Silver/Blue", "Black/Grey"]}]) },
    { name: "Laptop Backpack Anti-Theft", description: "Water-resistant laptop backpack with USB charging port and anti-theft pocket. Fits 15.6-inch laptops.", images: ["https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600"], categoryId: accessoriesId, vendorId: sellerId, brand: "TrekPack", sku: "TP-BP-023", originalPrice: "1999.00", discountPercent: 30, price: "1399.00", stock: 150, isApproved: true, specifications: JSON.stringify({size: "15.6 inch", material: "Water-resistant polyester", feature: "USB port, anti-theft"}) },
  ];

  const insertedEcomProducts = await db.insert(ecomProducts).values(ecomProductData).returning();
  console.log(`${insertedEcomProducts.length} e-com products created`);
  console.log("E-commerce seeding complete!");
}

// Export for use in server startup
export async function runSeed() {
  try {
    await seed();
  } catch (err) {
    console.error("Seed error:", err);
  }
}

// Only run directly if this file is executed as a script
if (process.argv[1]?.includes('seed')) {
  seed().then(() => process.exit(0)).catch((err) => {
    console.error("Seed error:", err);
    process.exit(1);
  });
}
