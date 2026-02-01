import { db } from "./db";
import { users, categories, products, banners, services, cartItems, wishlistItems } from "@shared/schema";
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

  // Always reseed categories and products
  console.log("Clearing existing data for reseed...");
  await db.delete(cartItems);
  await db.delete(wishlistItems);
  await db.delete(products);
  await db.delete(categories);
  console.log("Existing data cleared");

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
      { name: "E-Commerce", description: "Essentials & Elegance", image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400", isActive: false, sortOrder: 1 },
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
