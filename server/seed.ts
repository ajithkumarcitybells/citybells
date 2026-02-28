import { db } from "./db";
import { users, categories, products, banners, services, cartItems, wishlistItems, ecomCategories, ecomProducts, sellerProfiles, foodRestaurants, foodMenuItems, movingVehicleTypes, movingDrivers, hotels, hotelRooms, taxiVehicleTypes, taxiDrivers, cityServiceCategories, cityServices, cityServiceProviders } from "@shared/schema";
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
    { name: "Wireless Bluetooth Earbuds", description: "Premium wireless earbuds with noise cancellation, 24-hour battery life, and IPX5 water resistance. Perfect for workouts and daily commute.", images: ["https://images.unsplash.com/photo-1590658268037-6bf12f032f55?w=600", "https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=600"], categoryId: electronicsId, vendorId: sellerId, brand: "SoundMax", sku: "SM-EB-001", originalPrice: "2999.00", discountPercent: 40, price: "1799.00", stock: 150, isApproved: true, isFeatured: true, isInstantDelivery: true, variants: JSON.stringify([{type: "color", options: ["Black", "White", "Blue"]}]), specifications: JSON.stringify({battery: "24 hours", connectivity: "Bluetooth 5.3", waterproof: "IPX5"}) },
    { name: "Smart Watch Pro", description: "Advanced smartwatch with heart rate monitor, SpO2 tracking, GPS, and 14-day battery life. 1.43-inch AMOLED display.", images: ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600"], categoryId: electronicsId, vendorId: sellerId, brand: "TechFit", sku: "TF-SW-002", originalPrice: "4999.00", discountPercent: 30, price: "3499.00", stock: 80, isApproved: true, isFeatured: true, variants: JSON.stringify([{type: "color", options: ["Black", "Silver", "Rose Gold"]}]), specifications: JSON.stringify({display: "1.43 AMOLED", battery: "14 days", sensors: "HR, SpO2, GPS"}) },
    { name: "10000mAh Power Bank", description: "Compact 10000mAh power bank with 22.5W fast charging. Dual USB-C and USB-A ports. LED battery indicator.", images: ["https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=600"], categoryId: electronicsId, vendorId: sellerId, brand: "ChargeUp", sku: "CU-PB-003", originalPrice: "1499.00", discountPercent: 20, price: "1199.00", stock: 200, isApproved: true, isFeatured: false, isInstantDelivery: true, specifications: JSON.stringify({capacity: "10000mAh", charging: "22.5W", ports: "USB-C, USB-A"}) },
    { name: "Laptop Stand Aluminum", description: "Ergonomic aluminum laptop stand with adjustable height. Compatible with 10-17 inch laptops. Foldable and portable.", images: ["https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600"], categoryId: electronicsId, vendorId: sellerId, brand: "ErgoDesk", sku: "ED-LS-004", originalPrice: "1899.00", discountPercent: 25, price: "1424.00", stock: 120, isApproved: true, specifications: JSON.stringify({material: "Aluminum", compatibility: "10-17 inch", weight: "280g"}) },
    { name: "USB-C Hub 7-in-1", description: "Multiport USB-C hub with HDMI 4K, USB 3.0, SD card reader, and 100W PD charging. Essential for professionals.", images: ["https://images.unsplash.com/photo-1625842268584-8f3296236761?w=600"], categoryId: electronicsId, vendorId: sellerId, brand: "ConnectPro", sku: "CP-HB-005", originalPrice: "2499.00", discountPercent: 15, price: "2124.00", stock: 90, isApproved: true, specifications: JSON.stringify({ports: "HDMI, 2xUSB3.0, SD, TF, USB-C PD", resolution: "4K@60Hz"}) },

    { name: "Men's Cotton Casual Shirt", description: "Premium cotton casual shirt with a relaxed fit. Breathable fabric perfect for everyday wear. Available in multiple colors.", images: ["https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600", "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600"], categoryId: fashionId, vendorId: sellerId, brand: "UrbanStyle", sku: "US-SH-006", originalPrice: "1299.00", discountPercent: 35, price: "844.00", stock: 300, isApproved: true, isFeatured: true, variants: JSON.stringify([{type: "size", options: ["S", "M", "L", "XL", "XXL"]}, {type: "color", options: ["Navy Blue", "White", "Black", "Olive"]}]) },
    { name: "Women's Running Shoes", description: "Lightweight running shoes with memory foam insole and breathable mesh upper. Perfect for daily jogging and gym workouts.", images: ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600"], categoryId: fashionId, vendorId: sellerId, brand: "RunFlex", sku: "RF-RS-007", originalPrice: "3499.00", discountPercent: 30, price: "2449.00", stock: 150, isApproved: true, isFeatured: true, variants: JSON.stringify([{type: "size", options: ["UK 4", "UK 5", "UK 6", "UK 7", "UK 8"]}, {type: "color", options: ["Pink", "White", "Black"]}]) },
    { name: "Leather Wallet Bifold", description: "Genuine leather bifold wallet with RFID protection. 6 card slots, 2 bill compartments, and coin pocket.", images: ["https://images.unsplash.com/photo-1627123424574-724758594e93?w=600"], categoryId: fashionId, vendorId: sellerId, brand: "LeatherCraft", sku: "LC-WL-008", originalPrice: "999.00", discountPercent: 20, price: "799.00", stock: 250, isApproved: true, isInstantDelivery: true, variants: JSON.stringify([{type: "color", options: ["Brown", "Black", "Tan"]}]) },
    { name: "Women's Ethnic Kurti", description: "Beautiful printed kurti in pure cotton with mandarin collar and 3/4 sleeves. Perfect for festivals and daily wear.", images: ["https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=600"], categoryId: fashionId, vendorId: sellerId, brand: "EthnicVibes", sku: "EV-KT-009", originalPrice: "1599.00", discountPercent: 40, price: "959.00", stock: 200, isApproved: true, variants: JSON.stringify([{type: "size", options: ["S", "M", "L", "XL"]}, {type: "color", options: ["Red", "Blue", "Green", "Yellow"]}]) },

    { name: "Non-Stick Cookware Set 5pc", description: "Premium 5-piece non-stick cookware set includes kadhai, frying pan, saucepan, tawa, and milk pot. PFOA-free coating.", images: ["https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600"], categoryId: homeId, vendorId: sellerId, brand: "CookMaster", sku: "CM-CK-010", originalPrice: "3999.00", discountPercent: 25, price: "2999.00", stock: 60, isApproved: true, isFeatured: true, specifications: JSON.stringify({pieces: 5, material: "Aluminum", coating: "Non-stick PFOA-free"}) },
    { name: "Bedsheet Set King Size", description: "300 thread count cotton bedsheet with 2 pillow covers. Soft, breathable, and wrinkle-resistant.", images: ["https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600"], categoryId: homeId, vendorId: sellerId, brand: "DreamSleep", sku: "DS-BS-011", originalPrice: "1999.00", discountPercent: 30, price: "1399.00", stock: 100, isApproved: true, variants: JSON.stringify([{type: "color", options: ["White", "Grey", "Blue", "Floral"]}]) },
    { name: "LED Desk Lamp", description: "Adjustable LED desk lamp with 5 brightness levels, 3 color temperatures, and USB charging port. Touch control.", images: ["https://images.unsplash.com/photo-1507473885765-e6ed057ab6fe?w=600"], categoryId: homeId, vendorId: sellerId, brand: "BrightLife", sku: "BL-DL-012", originalPrice: "1299.00", discountPercent: 15, price: "1104.00", stock: 140, isApproved: true, specifications: JSON.stringify({brightness: "5 levels", colors: "3 temperatures", feature: "USB charging"}) },

    { name: "Vitamin C Face Serum", description: "20% Vitamin C serum with Hyaluronic Acid and Niacinamide. Brightens skin, reduces dark spots. 30ml.", images: ["https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600"], categoryId: beautyId, vendorId: sellerId, brand: "GlowUp", sku: "GU-FS-013", originalPrice: "699.00", discountPercent: 20, price: "559.00", stock: 300, isApproved: true, isFeatured: true, isInstantDelivery: true, specifications: JSON.stringify({volume: "30ml", ingredients: "Vitamin C, Hyaluronic Acid, Niacinamide"}) },
    { name: "Hair Dryer Professional", description: "2000W professional hair dryer with ionic technology, 3 heat settings, and cool shot button. Lightweight design.", images: ["https://images.unsplash.com/photo-1522338242992-e1a54571a9f7?w=600"], categoryId: beautyId, vendorId: sellerId, brand: "StylePro", sku: "SP-HD-014", originalPrice: "2499.00", discountPercent: 20, price: "1999.00", stock: 80, isApproved: true, specifications: JSON.stringify({wattage: "2000W", settings: "3 heat + cold", tech: "Ionic"}) },

    { name: "Yoga Mat Premium 6mm", description: "Extra thick 6mm yoga mat with alignment lines. Anti-slip surface, eco-friendly TPE material. Includes carry strap.", images: ["https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=600"], categoryId: sportsId, vendorId: sellerId, brand: "FlexFit", sku: "FF-YM-015", originalPrice: "1299.00", discountPercent: 25, price: "974.00", stock: 200, isApproved: true, isFeatured: true, variants: JSON.stringify([{type: "color", options: ["Purple", "Blue", "Green", "Pink"]}]) },
    { name: "Resistance Bands Set", description: "Set of 5 resistance bands with different resistance levels. Includes door anchor, handles, and carry bag.", images: ["https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=600"], categoryId: sportsId, vendorId: sellerId, brand: "FitBand", sku: "FB-RB-016", originalPrice: "899.00", discountPercent: 30, price: "629.00", stock: 180, isApproved: true, isInstantDelivery: true, specifications: JSON.stringify({pieces: 5, levels: "Extra Light to Extra Heavy"}) },
    { name: "Stainless Steel Water Bottle 1L", description: "Double-wall vacuum insulated 1L bottle. Keeps drinks cold 24hrs, hot 12hrs. BPA-free, leak-proof.", images: ["https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600"], categoryId: sportsId, vendorId: sellerId, brand: "HydroMax", sku: "HM-WB-017", originalPrice: "799.00", discountPercent: 15, price: "679.00", stock: 250, isApproved: true, isInstantDelivery: true, variants: JSON.stringify([{type: "color", options: ["Silver", "Black", "Blue", "Red"]}]) },

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

async function seedNewServices() {
  const existingRestaurants = await db.select().from(foodRestaurants);
  if (existingRestaurants.length > 0) {
    console.log("New services already seeded, skipping");
    return;
  }

  console.log("Seeding new services data...");

  const restaurantData = [
    { name: "Spice Garden", image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600", cuisine: ["North Indian", "Mughlai"], rating: "4.3", deliveryTime: "30-40 min", minOrder: "149", address: "123 MG Road, Bangalore", description: "Authentic North Indian cuisine with rich flavors" },
    { name: "Dragon Wok", image: "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=600", cuisine: ["Chinese", "Thai"], rating: "4.1", deliveryTime: "25-35 min", minOrder: "199", address: "45 Brigade Road, Bangalore", description: "Pan-Asian delights with fresh ingredients" },
    { name: "Pizza Paradise", image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600", cuisine: ["Italian", "Fast Food"], rating: "4.5", deliveryTime: "20-30 min", minOrder: "249", address: "78 Church Street, Bangalore", description: "Wood-fired pizzas and Italian favorites" },
    { name: "Dosa Corner", image: "https://images.unsplash.com/photo-1630383249896-424e482df921?w=600", cuisine: ["South Indian"], rating: "4.4", deliveryTime: "15-25 min", minOrder: "99", address: "22 Jayanagar, Bangalore", description: "Crispy dosas and authentic South Indian meals" },
    { name: "Biryani House", image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600", cuisine: ["Biryani", "Mughlai"], rating: "4.6", deliveryTime: "35-45 min", minOrder: "199", address: "56 Koramangala, Bangalore", description: "Hyderabadi dum biryani cooked to perfection" },
    { name: "Burger Junction", image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600", cuisine: ["Fast Food", "American"], rating: "4.2", deliveryTime: "15-25 min", minOrder: "149", address: "89 Indiranagar, Bangalore", description: "Juicy burgers and crispy fries" },
    { name: "Sushi Zen", image: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600", cuisine: ["Japanese", "Sushi"], rating: "4.7", deliveryTime: "40-50 min", minOrder: "499", address: "12 Whitefield, Bangalore", description: "Premium Japanese sushi and ramen" },
    { name: "Tandoori Nights", image: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=600", cuisine: ["North Indian", "Tandoor"], rating: "4.3", deliveryTime: "30-40 min", minOrder: "199", address: "34 HSR Layout, Bangalore", description: "Smoky tandoori grills and kebabs" },
    { name: "Green Bowl", image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600", cuisine: ["Healthy", "Salads"], rating: "4.4", deliveryTime: "20-30 min", minOrder: "199", address: "67 Marathahalli, Bangalore", description: "Healthy bowls and fresh salads" },
    { name: "Sweet Tooth Bakery", image: "https://images.unsplash.com/photo-1486427944544-d2c246c4d318?w=600", cuisine: ["Desserts", "Bakery"], rating: "4.5", deliveryTime: "25-35 min", minOrder: "149", address: "90 JP Nagar, Bangalore", description: "Freshly baked cakes and desserts" },
  ];
  const insertedRestaurants = await db.insert(foodRestaurants).values(restaurantData).returning();

  const menuData: any[] = [];
  for (const restaurant of insertedRestaurants) {
    const isIndian = restaurant.cuisine?.includes("North Indian") || restaurant.cuisine?.includes("South Indian");
    const isChinese = restaurant.cuisine?.includes("Chinese");
    const isPizza = restaurant.cuisine?.includes("Italian");
    const isBurger = restaurant.cuisine?.includes("Fast Food") && restaurant.name.includes("Burger");
    const isDessert = restaurant.cuisine?.includes("Desserts");

    if (isIndian) {
      menuData.push(
        { restaurantId: restaurant.id, name: "Butter Chicken", description: "Tender chicken in creamy tomato gravy", price: "320", category: "Main Course", isVeg: false },
        { restaurantId: restaurant.id, name: "Paneer Butter Masala", description: "Cottage cheese in rich butter gravy", price: "280", category: "Main Course", isVeg: true },
        { restaurantId: restaurant.id, name: "Dal Makhani", description: "Slow cooked black lentils", price: "220", category: "Main Course", isVeg: true },
        { restaurantId: restaurant.id, name: "Garlic Naan", description: "Fresh baked garlic bread", price: "60", category: "Breads", isVeg: true },
        { restaurantId: restaurant.id, name: "Gulab Jamun", description: "Sweet milk dumplings", price: "120", category: "Desserts", isVeg: true },
        { restaurantId: restaurant.id, name: "Chicken Biryani", description: "Fragrant basmati rice with chicken", price: "350", category: "Rice", isVeg: false },
      );
    } else if (isChinese) {
      menuData.push(
        { restaurantId: restaurant.id, name: "Veg Manchurian", description: "Crispy veggie balls in tangy sauce", price: "220", category: "Starters", isVeg: true },
        { restaurantId: restaurant.id, name: "Chicken Fried Rice", description: "Wok-tossed rice with chicken", price: "280", category: "Main Course", isVeg: false },
        { restaurantId: restaurant.id, name: "Spring Rolls", description: "Crispy rolls with veggie filling", price: "180", category: "Starters", isVeg: true },
        { restaurantId: restaurant.id, name: "Hakka Noodles", description: "Stir-fried noodles with vegetables", price: "240", category: "Main Course", isVeg: true },
        { restaurantId: restaurant.id, name: "Chilli Paneer", description: "Spicy paneer in Indo-Chinese style", price: "260", category: "Starters", isVeg: true },
      );
    } else if (isPizza) {
      menuData.push(
        { restaurantId: restaurant.id, name: "Margherita Pizza", description: "Classic tomato and mozzarella", price: "299", category: "Pizzas", isVeg: true },
        { restaurantId: restaurant.id, name: "Pepperoni Pizza", description: "Loaded with pepperoni slices", price: "449", category: "Pizzas", isVeg: false },
        { restaurantId: restaurant.id, name: "Garlic Bread", description: "Cheesy garlic bread sticks", price: "149", category: "Sides", isVeg: true },
        { restaurantId: restaurant.id, name: "Pasta Alfredo", description: "Creamy white sauce pasta", price: "329", category: "Pasta", isVeg: true },
        { restaurantId: restaurant.id, name: "Tiramisu", description: "Classic Italian coffee dessert", price: "249", category: "Desserts", isVeg: true },
      );
    } else if (isBurger) {
      menuData.push(
        { restaurantId: restaurant.id, name: "Classic Burger", description: "Beef patty with cheese and lettuce", price: "199", category: "Burgers", isVeg: false },
        { restaurantId: restaurant.id, name: "Veggie Burger", description: "Crispy veggie patty burger", price: "179", category: "Burgers", isVeg: true },
        { restaurantId: restaurant.id, name: "French Fries", description: "Crispy golden fries", price: "129", category: "Sides", isVeg: true },
        { restaurantId: restaurant.id, name: "Chicken Nuggets", description: "6 piece crispy nuggets", price: "199", category: "Sides", isVeg: false },
        { restaurantId: restaurant.id, name: "Milkshake", description: "Thick chocolate milkshake", price: "149", category: "Drinks", isVeg: true },
      );
    } else if (isDessert) {
      menuData.push(
        { restaurantId: restaurant.id, name: "Chocolate Cake", description: "Rich dark chocolate layer cake", price: "350", category: "Cakes", isVeg: true },
        { restaurantId: restaurant.id, name: "Red Velvet Cupcake", description: "Cream cheese frosted cupcake", price: "120", category: "Cupcakes", isVeg: true },
        { restaurantId: restaurant.id, name: "Brownie Sundae", description: "Warm brownie with ice cream", price: "280", category: "Desserts", isVeg: true },
        { restaurantId: restaurant.id, name: "Fruit Tart", description: "Fresh fruit on vanilla custard", price: "220", category: "Pastries", isVeg: true },
      );
    } else {
      menuData.push(
        { restaurantId: restaurant.id, name: "Special Combo Meal", description: "Chef's special combination", price: "350", category: "Main Course", isVeg: false },
        { restaurantId: restaurant.id, name: "Garden Salad", description: "Fresh seasonal vegetables", price: "180", category: "Starters", isVeg: true },
        { restaurantId: restaurant.id, name: "Grilled Chicken", description: "Herb marinated grilled chicken", price: "320", category: "Main Course", isVeg: false },
        { restaurantId: restaurant.id, name: "Fresh Juice", description: "Seasonal fresh pressed juice", price: "120", category: "Drinks", isVeg: true },
      );
    }
  }
  await db.insert(foodMenuItems).values(menuData);
  console.log(`${menuData.length} food menu items created for ${insertedRestaurants.length} restaurants`);

  const vehicleData = [
    { name: "Two Wheeler", description: "Perfect for small packages and documents", basePrice: "50", pricePerKm: "8", capacity: "Up to 20 kg", icon: "bike" },
    { name: "Auto Rickshaw", description: "Good for medium packages", basePrice: "100", pricePerKm: "12", capacity: "Up to 50 kg", icon: "auto" },
    { name: "Mini Truck", description: "Ideal for furniture and appliances", basePrice: "300", pricePerKm: "18", capacity: "Up to 500 kg", icon: "truck" },
    { name: "Large Truck", description: "For full house shifting", basePrice: "800", pricePerKm: "25", capacity: "Up to 2000 kg", icon: "truck-large" },
    { name: "Packers & Movers", description: "Complete packing, loading, and moving", basePrice: "2000", pricePerKm: "30", capacity: "Full house", icon: "package" },
  ];
  await db.insert(movingVehicleTypes).values(vehicleData);
  console.log("5 moving vehicle types created");

  const hotelData = [
    { name: "Grand Palace Hotel", description: "Luxury 5-star hotel in the heart of the city", images: ["https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600"], city: "Bangalore", address: "MG Road, Bangalore", rating: "4.7", amenities: ["WiFi", "Pool", "Spa", "Gym", "Restaurant", "Bar"], starRating: 5 },
    { name: "Comfort Inn Express", description: "Budget-friendly hotel with all essentials", images: ["https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=600"], city: "Bangalore", address: "Koramangala, Bangalore", rating: "4.0", amenities: ["WiFi", "AC", "TV", "Parking"], starRating: 3 },
    { name: "Seaside Resort", description: "Beautiful beachfront resort", images: ["https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600"], city: "Goa", address: "Calangute Beach, Goa", rating: "4.5", amenities: ["WiFi", "Pool", "Beach Access", "Restaurant", "Bar", "Water Sports"], starRating: 4 },
    { name: "Mountain View Lodge", description: "Scenic mountain retreat", images: ["https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600"], city: "Mumbai", address: "Juhu, Mumbai", rating: "4.3", amenities: ["WiFi", "Restaurant", "Gym", "Spa", "Parking"], starRating: 4 },
    { name: "Royal Heritage Hotel", description: "Heritage property with modern amenities", images: ["https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600"], city: "Jaipur", address: "MI Road, Jaipur", rating: "4.6", amenities: ["WiFi", "Pool", "Spa", "Heritage Walk", "Restaurant"], starRating: 5 },
    { name: "Business Suites", description: "Perfect for business travelers", images: ["https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=600"], city: "Delhi", address: "Connaught Place, Delhi", rating: "4.2", amenities: ["WiFi", "Business Center", "Gym", "Restaurant", "Laundry"], starRating: 4 },
    { name: "Backpacker Hostel", description: "Social hostel for budget travelers", images: ["https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600"], city: "Bangalore", address: "Indiranagar, Bangalore", rating: "4.1", amenities: ["WiFi", "Kitchen", "Lounge", "Laundry"], starRating: 2 },
    { name: "Lake View Resort", description: "Peaceful lakeside retreat", images: ["https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600"], city: "Chennai", address: "ECR Road, Chennai", rating: "4.4", amenities: ["WiFi", "Pool", "Lake View", "Restaurant", "Boating"], starRating: 4 },
    { name: "The Taj Garden", description: "Premium luxury experience", images: ["https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600"], city: "Mumbai", address: "Colaba, Mumbai", rating: "4.8", amenities: ["WiFi", "Pool", "Spa", "Gym", "Restaurant", "Bar", "Concierge"], starRating: 5 },
    { name: "Hill Station Retreat", description: "Cool mountain getaway", images: ["https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=600"], city: "Ooty", address: "Elk Hill, Ooty", rating: "4.5", amenities: ["WiFi", "Fireplace", "Garden", "Restaurant", "Trek Guide"], starRating: 3 },
  ];
  const insertedHotels = await db.insert(hotels).values(hotelData).returning();

  const roomData: any[] = [];
  for (const hotel of insertedHotels) {
    roomData.push(
      { hotelId: hotel.id, type: "standard", name: "Standard Room", price: hotel.starRating === 5 ? "5000" : hotel.starRating === 4 ? "3000" : "1500", maxGuests: 2, amenities: ["WiFi", "AC", "TV"], totalRooms: 20, availableRooms: 15 },
      { hotelId: hotel.id, type: "deluxe", name: "Deluxe Room", price: hotel.starRating === 5 ? "8000" : hotel.starRating === 4 ? "5000" : "2500", maxGuests: 3, amenities: ["WiFi", "AC", "TV", "Mini Bar", "City View"], totalRooms: 10, availableRooms: 8 },
    );
    if (hotel.starRating && hotel.starRating >= 4) {
      roomData.push(
        { hotelId: hotel.id, type: "suite", name: "Premium Suite", price: hotel.starRating === 5 ? "15000" : "8000", maxGuests: 4, amenities: ["WiFi", "AC", "TV", "Mini Bar", "Living Room", "Jacuzzi"], totalRooms: 5, availableRooms: 3 },
      );
    }
  }
  await db.insert(hotelRooms).values(roomData);
  console.log(`${insertedHotels.length} hotels with ${roomData.length} rooms created`);

  const taxiData = [
    { name: "Auto", description: "Affordable 3-wheeler rides", baseFare: "25", perKmRate: "12", perMinRate: "1", capacity: 3, icon: "auto" },
    { name: "Mini", description: "Compact car for city rides", baseFare: "40", perKmRate: "14", perMinRate: "1.5", capacity: 4, icon: "car-mini" },
    { name: "Sedan", description: "Comfortable sedan rides", baseFare: "60", perKmRate: "18", perMinRate: "2", capacity: 4, icon: "car-sedan" },
    { name: "SUV", description: "Spacious SUV for groups", baseFare: "80", perKmRate: "22", perMinRate: "2.5", capacity: 6, icon: "car-suv" },
  ];
  await db.insert(taxiVehicleTypes).values(taxiData);
  console.log("4 taxi vehicle types created");

  const serviceCatData = [
    { name: "Cleaning", description: "Home and office cleaning services", image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400", icon: "sparkles" },
    { name: "Plumbing", description: "Plumbing repair and installation", image: "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=400", icon: "wrench" },
    { name: "Electrician", description: "Electrical repair and wiring", image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400", icon: "zap" },
    { name: "Painting", description: "Home and wall painting", image: "https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?w=400", icon: "paintbrush" },
    { name: "Pest Control", description: "Pest removal and prevention", image: "https://images.unsplash.com/photo-1632935190508-1cbc0a1e02cd?w=400", icon: "bug" },
    { name: "Appliance Repair", description: "AC, washing machine, fridge repair", image: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400", icon: "settings" },
    { name: "Salon at Home", description: "Beauty and grooming at your doorstep", image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400", icon: "scissors" },
    { name: "Carpentry", description: "Furniture repair and assembly", image: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400", icon: "hammer" },
  ];
  const insertedServiceCats = await db.insert(cityServiceCategories).values(serviceCatData).returning();

  const cityServiceData: any[] = [];
  const serviceItems: Record<string, Array<{name: string, price: string, duration: string, rating: string}>> = {
    "Cleaning": [
      { name: "Full Home Deep Cleaning", price: "2499", duration: "4-5 hours", rating: "4.5" },
      { name: "Bathroom Cleaning", price: "499", duration: "1 hour", rating: "4.3" },
      { name: "Kitchen Deep Clean", price: "799", duration: "2 hours", rating: "4.4" },
      { name: "Sofa Cleaning", price: "699", duration: "1-2 hours", rating: "4.2" },
    ],
    "Plumbing": [
      { name: "Tap Repair/Replacement", price: "299", duration: "30-45 min", rating: "4.3" },
      { name: "Toilet Repair", price: "499", duration: "1 hour", rating: "4.1" },
      { name: "Pipeline Repair", price: "799", duration: "1-2 hours", rating: "4.2" },
      { name: "Water Tank Cleaning", price: "1499", duration: "2-3 hours", rating: "4.4" },
    ],
    "Electrician": [
      { name: "Fan Installation", price: "299", duration: "30-45 min", rating: "4.4" },
      { name: "Switchboard Repair", price: "199", duration: "30 min", rating: "4.2" },
      { name: "Wiring Work", price: "599", duration: "1-2 hours", rating: "4.3" },
      { name: "Inverter Installation", price: "499", duration: "1 hour", rating: "4.5" },
    ],
    "Painting": [
      { name: "1 Room Painting", price: "4999", duration: "1-2 days", rating: "4.5" },
      { name: "Full Home Painting", price: "14999", duration: "3-5 days", rating: "4.6" },
      { name: "Wall Texture", price: "2999", duration: "1 day", rating: "4.3" },
    ],
    "Pest Control": [
      { name: "General Pest Control", price: "999", duration: "1-2 hours", rating: "4.4" },
      { name: "Cockroach Treatment", price: "799", duration: "1 hour", rating: "4.3" },
      { name: "Termite Treatment", price: "2499", duration: "2-3 hours", rating: "4.5" },
    ],
    "Appliance Repair": [
      { name: "AC Service & Repair", price: "499", duration: "1 hour", rating: "4.3" },
      { name: "Washing Machine Repair", price: "399", duration: "1 hour", rating: "4.2" },
      { name: "Refrigerator Repair", price: "449", duration: "1 hour", rating: "4.1" },
      { name: "Geyser Repair", price: "349", duration: "45 min", rating: "4.3" },
    ],
    "Salon at Home": [
      { name: "Haircut (Men)", price: "249", duration: "30 min", rating: "4.4" },
      { name: "Facial (Women)", price: "699", duration: "1 hour", rating: "4.5" },
      { name: "Full Body Massage", price: "1299", duration: "1.5 hours", rating: "4.6" },
      { name: "Manicure & Pedicure", price: "799", duration: "1 hour", rating: "4.4" },
    ],
    "Carpentry": [
      { name: "Furniture Assembly", price: "399", duration: "1-2 hours", rating: "4.3" },
      { name: "Door Repair", price: "499", duration: "1 hour", rating: "4.2" },
      { name: "Shelf Installation", price: "349", duration: "45 min", rating: "4.4" },
    ],
  };

  for (const cat of insertedServiceCats) {
    const items = serviceItems[cat.name] || [];
    for (const item of items) {
      cityServiceData.push({
        categoryId: cat.id,
        name: item.name,
        price: item.price,
        duration: item.duration,
        rating: item.rating,
        description: `Professional ${cat.name.toLowerCase()} service`,
      });
    }
  }
  await db.insert(cityServices).values(cityServiceData);
  console.log(`${insertedServiceCats.length} service categories with ${cityServiceData.length} services created`);

  console.log("All new services seeded successfully!");
}

async function seedPartnerAccounts() {
  const existingRestPartner = await db.select().from(users).where(eq(users.username, "restaurant1"));
  if (existingRestPartner.length > 0) {
    console.log("Partner accounts already seeded, skipping");
    return;
  }

  console.log("Seeding partner demo accounts...");
  const partnerPassword = await hashPassword("partner123");

  const [restaurantUser] = await db.insert(users).values({
    username: "restaurant1",
    password: partnerPassword,
    name: "Spice Garden Owner",
    email: "restaurant@citybell.com",
    isVendor: true,
    partnerType: "restaurant",
  }).returning();

  const allRestaurants = await db.select().from(foodRestaurants);
  if (allRestaurants.length > 0) {
    await db.update(foodRestaurants)
      .set({ ownerId: restaurantUser.id })
      .where(eq(foodRestaurants.id, allRestaurants[0].id));
  }
  console.log("  Restaurant partner: restaurant1 / partner123 (linked to Spice Garden)");

  const [driverUser] = await db.insert(users).values({
    username: "driver1",
    password: partnerPassword,
    name: "Rajesh Kumar",
    email: "driver@citybell.com",
    isVendor: true,
    partnerType: "driver",
  }).returning();

  const allVehicleTypes = await db.select().from(movingVehicleTypes);
  const miniTruck = allVehicleTypes.find(v => v.name === "Mini Truck") || allVehicleTypes[0];
  if (miniTruck) {
    await db.insert(movingDrivers).values({
      userId: driverUser.id,
      name: "Rajesh Kumar",
      phone: "9876543210",
      vehicleTypeId: miniTruck.id,
      vehicleNumber: "KA-01-AB-1234",
      isAvailable: true,
      rating: "4.6",
    });
  }
  console.log("  Moving driver: driver1 / partner123 (Mini Truck)");

  const [hotelUser] = await db.insert(users).values({
    username: "hotel1",
    password: partnerPassword,
    name: "Grand Palace Manager",
    email: "hotel@citybell.com",
    isVendor: true,
    partnerType: "hotel",
  }).returning();

  const allHotels = await db.select().from(hotels);
  if (allHotels.length > 0) {
    await db.update(hotels)
      .set({ managerId: hotelUser.id })
      .where(eq(hotels.id, allHotels[0].id));
  }
  console.log("  Hotel manager: hotel1 / partner123 (linked to first hotel)");

  const [taxiUser] = await db.insert(users).values({
    username: "taxidriver1",
    password: partnerPassword,
    name: "Suresh Reddy",
    email: "taxi@citybell.com",
    isVendor: true,
    partnerType: "driver",
  }).returning();

  const allTaxiTypes = await db.select().from(taxiVehicleTypes);
  const sedan = allTaxiTypes.find(v => v.name === "Sedan") || allTaxiTypes[0];
  if (sedan) {
    await db.insert(taxiDrivers).values({
      userId: taxiUser.id,
      name: "Suresh Reddy",
      phone: "9876543211",
      vehicleTypeId: sedan.id,
      vehicleNumber: "KA-02-CD-5678",
      licenseNumber: "KA0520210012345",
      isOnline: true,
      rating: "4.7",
    });
  }
  console.log("  Taxi driver: taxidriver1 / partner123 (Sedan)");

  const [providerUser] = await db.insert(users).values({
    username: "provider1",
    password: partnerPassword,
    name: "CleanPro Services",
    email: "provider@citybell.com",
    isVendor: true,
    partnerType: "service_provider",
  }).returning();

  await db.insert(cityServiceProviders).values({
    userId: providerUser.id,
    name: "CleanPro Services",
    phone: "9876543212",
    specializations: ["Cleaning", "Pest Control", "Painting"],
    experience: "5 years",
    rating: "4.5",
    isAvailable: true,
    isAgency: true,
    agencyName: "CleanPro Home Solutions",
  });
  console.log("  Service provider: provider1 / partner123 (CleanPro Services)");

  const existingSeller = await db.select().from(users).where(eq(users.username, "seller1"));
  if (existingSeller.length > 0 && !existingSeller[0].partnerType) {
    await db.update(users)
      .set({ partnerType: "seller" })
      .where(eq(users.username, "seller1"));
    console.log("  Updated seller1 partnerType to 'seller'");
  }

  console.log("All partner demo accounts created!");
}

export async function runSeed() {
  try {
    await seed();
    await seedNewServices();
    await seedPartnerAccounts();
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
