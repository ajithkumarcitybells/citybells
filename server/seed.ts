import { db } from "./db";
import { users, categories, products, banners, services } from "@shared/schema";
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

    // Get category IDs by name
    const fruitsId = insertedCategories.find(c => c.name === "Fruits")!.id;
    const vegetablesId = insertedCategories.find(c => c.name === "Vegetables")!.id;
    const dairyId = insertedCategories.find(c => c.name === "Dairy")!.id;
    const bakeryId = insertedCategories.find(c => c.name === "Bakery")!.id;
    const beveragesId = insertedCategories.find(c => c.name === "Beverages")!.id;
    const snacksId = insertedCategories.find(c => c.name === "Snacks")!.id;
    const groceryId = insertedCategories.find(c => c.name === "Grocery")!.id;
    const meatFishId = insertedCategories.find(c => c.name === "Meat & Fish")!.id;

    // Create all 141 products
    const productData = [
      // ============ VEGETABLES (88 products) ============
      { name: "Regular Onion", description: "Fresh regular onions", image: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400", categoryId: vegetablesId, originalPrice: "40.00", discountPercent: 5, price: "38.00", rating: "4.2", unit: "1 kg" },
      { name: "Potato", description: "Fresh potatoes", image: "https://images.unsplash.com/photo-1518977676601-b53f82eba1b9?w=400", categoryId: vegetablesId, originalPrice: "22.00", discountPercent: 5, price: "21.00", rating: "4.3", unit: "1 kg" },
      { name: "Ooty Potato", description: "Premium Ooty potatoes", image: "https://images.unsplash.com/photo-1518977676601-b53f82eba1b9?w=400", categoryId: vegetablesId, originalPrice: "48.00", discountPercent: 6, price: "45.00", rating: "4.4", unit: "1 kg" },
      { name: "Baby Potato", description: "Small baby potatoes", image: "https://images.unsplash.com/photo-1518977676601-b53f82eba1b9?w=400", categoryId: vegetablesId, originalPrice: "45.00", discountPercent: 7, price: "42.00", rating: "4.3", unit: "500g" },
      { name: "Big Onion", description: "Large onions", image: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400", categoryId: vegetablesId, originalPrice: "24.00", discountPercent: 8, price: "22.00", rating: "4.1", unit: "1 kg" },
      { name: "Small Onion", description: "Shallots/Small onions", image: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400", categoryId: vegetablesId, originalPrice: "50.00", discountPercent: 0, price: "50.00", rating: "4.2", unit: "500g" },
      { name: "Tomato", description: "Fresh red tomatoes", image: "https://images.unsplash.com/photo-1546470427-0d525f8a7f75?w=400", categoryId: vegetablesId, originalPrice: "20.00", discountPercent: 5, price: "19.00", rating: "4.3", unit: "500g" },
      { name: "Jam Tomato", description: "Jam variety tomatoes", image: "https://images.unsplash.com/photo-1546470427-0d525f8a7f75?w=400", categoryId: vegetablesId, originalPrice: "5.00", discountPercent: 0, price: "4.00", rating: "4.1", unit: "250g" },
      { name: "Carrot", description: "Fresh orange carrots", image: "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400", categoryId: vegetablesId, originalPrice: "25.00", discountPercent: 8, price: "23.00", rating: "4.4", unit: "500g" },
      { name: "Veg Beans Regular", description: "Fresh green beans", image: "https://images.unsplash.com/photo-1551326844-4df70f78d0e9?w=400", categoryId: vegetablesId, originalPrice: "28.00", discountPercent: 0, price: "25.00", rating: "4.2", unit: "500g" },
      { name: "Beetroot", description: "Fresh beetroot", image: "https://images.unsplash.com/photo-1593105544559-ecb03bf76f82?w=400", categoryId: vegetablesId, originalPrice: "30.00", discountPercent: 7, price: "28.00", rating: "4.3", unit: "500g" },
      { name: "Chow Chow - Chayote", description: "Fresh chayote squash", image: "https://images.unsplash.com/photo-1518977676601-b53f82eba1b9?w=400", categoryId: vegetablesId, originalPrice: "35.00", discountPercent: 14, price: "30.00", rating: "4.1", unit: "500g" },
      { name: "Cabbage", description: "Fresh green cabbage", image: "https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?w=400", categoryId: vegetablesId, originalPrice: "45.00", discountPercent: 11, price: "40.00", rating: "4.2", unit: "1 pc" },
      { name: "Ladies Finger", description: "Fresh okra/bhindi", image: "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=400", categoryId: vegetablesId, originalPrice: "28.00", discountPercent: 0, price: "25.00", rating: "4.3", unit: "500g" },
      { name: "Bhavani Kathirika", description: "Bhavani variety brinjal", image: "https://images.unsplash.com/photo-1615484477778-ca3b77940c25?w=400", categoryId: vegetablesId, originalPrice: "50.00", discountPercent: 0, price: "45.00", rating: "4.1", unit: "500g" },
      { name: "Veg Brinjal Country", description: "Country variety brinjal", image: "https://images.unsplash.com/photo-1615484477778-ca3b77940c25?w=400", categoryId: vegetablesId, originalPrice: "45.00", discountPercent: 11, price: "40.00", rating: "4.1", unit: "500g" },
      { name: "Veg Brinjal Round Green", description: "Round green brinjal", image: "https://images.unsplash.com/photo-1615484477778-ca3b77940c25?w=400", categoryId: vegetablesId, originalPrice: "45.00", discountPercent: 0, price: "40.00", rating: "4.0", unit: "500g" },
      { name: "Veg Brinjal Vari", description: "Vari variety brinjal", image: "https://images.unsplash.com/photo-1615484477778-ca3b77940c25?w=400", categoryId: vegetablesId, originalPrice: "45.00", discountPercent: 0, price: "40.00", rating: "4.0", unit: "500g" },
      { name: "Veg Butter Beans", description: "Fresh butter beans", image: "https://images.unsplash.com/photo-1551326844-4df70f78d0e9?w=400", categoryId: vegetablesId, originalPrice: "45.00", discountPercent: 0, price: "40.00", rating: "4.2", unit: "500g" },
      { name: "Veg Drumstick", description: "Fresh moringa pods", image: "https://images.unsplash.com/photo-1518977676601-b53f82eba1b9?w=400", categoryId: vegetablesId, originalPrice: "45.00", discountPercent: 11, price: "40.00", rating: "4.2", unit: "500g" },
      { name: "Ginger", description: "Fresh ginger root", image: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400", categoryId: vegetablesId, originalPrice: "50.00", discountPercent: 10, price: "45.00", rating: "4.4", unit: "250g" },
      { name: "Green Chilli", description: "Fresh green chillies", image: "https://images.unsplash.com/photo-1526346698789-22fd84314424?w=400", categoryId: vegetablesId, originalPrice: "22.00", discountPercent: 9, price: "20.00", rating: "4.2", unit: "100g" },
      { name: "New Ginger", description: "Fresh new ginger", image: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400", categoryId: vegetablesId, originalPrice: "45.00", discountPercent: 0, price: "40.00", rating: "4.3", unit: "250g" },
      { name: "Veg Bottle Gourd Round", description: "Round bottle gourd", image: "https://images.unsplash.com/photo-1518977676601-b53f82eba1b9?w=400", categoryId: vegetablesId, originalPrice: "40.00", discountPercent: 0, price: "35.00", rating: "4.1", unit: "1 pc" },
      { name: "Ottu Mangai", description: "Raw mango", image: "https://images.unsplash.com/photo-1553279768-865429fa0078?w=400", categoryId: vegetablesId, originalPrice: "45.00", discountPercent: 16, price: "38.00", rating: "4.2", unit: "500g" },
      { name: "Capsicum", description: "Fresh green capsicum", image: "https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=400", categoryId: vegetablesId, originalPrice: "35.00", discountPercent: 14, price: "30.00", rating: "4.3", unit: "250g" },
      { name: "Colour Capsicum", description: "Mixed color bell peppers", image: "https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=400", categoryId: vegetablesId, originalPrice: "75.00", discountPercent: 0, price: "70.00", rating: "4.4", unit: "250g" },
      { name: "White Radish", description: "Fresh white radish", image: "https://images.unsplash.com/photo-1518977676601-b53f82eba1b9?w=400", categoryId: vegetablesId, originalPrice: "25.00", discountPercent: 0, price: "22.00", rating: "4.1", unit: "500g" },
      { name: "Veg Bajji Milagai", description: "Bajji chillies", image: "https://images.unsplash.com/photo-1526346698789-22fd84314424?w=400", categoryId: vegetablesId, originalPrice: "50.00", discountPercent: 0, price: "45.00", rating: "4.0", unit: "250g" },
      { name: "Veg Cabbage Violet", description: "Purple cabbage", image: "https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?w=400", categoryId: vegetablesId, originalPrice: "55.00", discountPercent: 0, price: "50.00", rating: "4.2", unit: "1 pc" },
      { name: "Veg Cucumber Hybrid", description: "Hybrid cucumber", image: "https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?w=400", categoryId: vegetablesId, originalPrice: "35.00", discountPercent: 0, price: "30.00", rating: "4.2", unit: "500g" },
      { name: "Kohlrabi - Knol Khol", description: "Fresh kohlrabi", image: "https://images.unsplash.com/photo-1518977676601-b53f82eba1b9?w=400", categoryId: vegetablesId, originalPrice: "45.00", discountPercent: 16, price: "38.00", rating: "4.1", unit: "500g" },
      { name: "Avarakkai - Broad Beans", description: "Fresh broad beans", image: "https://images.unsplash.com/photo-1551326844-4df70f78d0e9?w=400", categoryId: vegetablesId, originalPrice: "40.00", discountPercent: 12, price: "35.00", rating: "4.3", unit: "500g" },
      { name: "Broad Beans Patta Avarai", description: "Flat broad beans", image: "https://images.unsplash.com/photo-1551326844-4df70f78d0e9?w=400", categoryId: vegetablesId, originalPrice: "45.00", discountPercent: 11, price: "40.00", rating: "4.2", unit: "500g" },
      { name: "Kozhi Avarai", description: "Kozhi variety beans", image: "https://images.unsplash.com/photo-1551326844-4df70f78d0e9?w=400", categoryId: vegetablesId, originalPrice: "45.00", discountPercent: 0, price: "40.00", rating: "4.1", unit: "500g" },
      { name: "Kothavarangai - Cluster Beans", description: "Fresh cluster beans", image: "https://images.unsplash.com/photo-1551326844-4df70f78d0e9?w=400", categoryId: vegetablesId, originalPrice: "35.00", discountPercent: 14, price: "30.00", rating: "4.2", unit: "500g" },
      { name: "Senai Kilangu - Elephant Foot Yam", description: "Fresh elephant foot yam", image: "https://images.unsplash.com/photo-1518977676601-b53f82eba1b9?w=400", categoryId: vegetablesId, originalPrice: "47.00", discountPercent: 9, price: "43.00", rating: "4.1", unit: "500g" },
      { name: "Peerkangai - Ridge Gourd", description: "Fresh ridge gourd", image: "https://images.unsplash.com/photo-1518977676601-b53f82eba1b9?w=400", categoryId: vegetablesId, originalPrice: "45.00", discountPercent: 7, price: "42.00", rating: "4.2", unit: "500g" },
      { name: "Veg Bitter Gourd Small", description: "Small bitter gourd", image: "https://images.unsplash.com/photo-1518977676601-b53f82eba1b9?w=400", categoryId: vegetablesId, originalPrice: "35.00", discountPercent: 0, price: "30.00", rating: "4.0", unit: "500g" },
      { name: "Bitter Gourd", description: "Fresh bitter gourd", image: "https://images.unsplash.com/photo-1518977676601-b53f82eba1b9?w=400", categoryId: vegetablesId, originalPrice: "28.00", discountPercent: 0, price: "25.00", rating: "4.1", unit: "500g" },
      { name: "Snake Gourd", description: "Fresh snake gourd", image: "https://images.unsplash.com/photo-1518977676601-b53f82eba1b9?w=400", categoryId: vegetablesId, originalPrice: "45.00", discountPercent: 11, price: "40.00", rating: "4.2", unit: "500g" },
      { name: "Veg Bottle Gourd Long", description: "Long bottle gourd", image: "https://images.unsplash.com/photo-1518977676601-b53f82eba1b9?w=400", categoryId: vegetablesId, originalPrice: "40.00", discountPercent: 0, price: "35.00", rating: "4.1", unit: "1 pc" },
      { name: "Pidi Karunai - Indian Yam", description: "Fresh Indian yam", image: "https://images.unsplash.com/photo-1518977676601-b53f82eba1b9?w=400", categoryId: vegetablesId, originalPrice: "125.00", discountPercent: 0, price: "120.00", rating: "4.2", unit: "1 kg" },
      { name: "Seppakizhangu - Colocasia", description: "Fresh colocasia/taro", image: "https://images.unsplash.com/photo-1518977676601-b53f82eba1b9?w=400", categoryId: vegetablesId, originalPrice: "40.00", discountPercent: 12, price: "35.00", rating: "4.1", unit: "500g" },
      { name: "Cauliflower", description: "Fresh cauliflower", image: "https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?w=400", categoryId: vegetablesId, originalPrice: "50.00", discountPercent: 10, price: "45.00", rating: "4.3", unit: "1 pc" },
      { name: "Button Mushroom", description: "Fresh button mushrooms", image: "https://images.unsplash.com/photo-1504545102780-26774c1bb073?w=400", categoryId: vegetablesId, originalPrice: "55.00", discountPercent: 5, price: "52.00", rating: "4.4", unit: "1 box" },
      { name: "Coconut", description: "Fresh coconut", image: "https://images.unsplash.com/photo-1560769680-ba2f3767c785?w=400", categoryId: vegetablesId, originalPrice: "35.00", discountPercent: 0, price: "30.00", rating: "4.3", unit: "1 pc" },
      { name: "Green Peas", description: "Fresh green peas", image: "https://images.unsplash.com/photo-1587735243615-c03f25aaff15?w=400", categoryId: vegetablesId, originalPrice: "80.00", discountPercent: 6, price: "75.00", rating: "4.4", unit: "500g" },
      { name: "Plantain - Vazhakkai", description: "Raw banana/plantain", image: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400", categoryId: vegetablesId, originalPrice: "10.00", discountPercent: 0, price: "8.00", rating: "4.2", unit: "1 pc" },
      { name: "Kovakkai - Ivy Gourd", description: "Fresh ivy gourd", image: "https://images.unsplash.com/photo-1518977676601-b53f82eba1b9?w=400", categoryId: vegetablesId, originalPrice: "40.00", discountPercent: 0, price: "35.00", rating: "4.1", unit: "500g" },
      { name: "Valaithandu - Banana Stem", description: "Fresh banana stem", image: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400", categoryId: vegetablesId, originalPrice: "35.00", discountPercent: 0, price: "30.00", rating: "4.0", unit: "1 pc" },
      { name: "Vazhaipoo - Banana Flower", description: "Fresh banana flower", image: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400", categoryId: vegetablesId, originalPrice: "40.00", discountPercent: 0, price: "35.00", rating: "4.1", unit: "1 pc" },
      { name: "Spring Onion", description: "Fresh spring onions", image: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400", categoryId: vegetablesId, originalPrice: "45.00", discountPercent: 0, price: "40.00", rating: "4.2", unit: "1 bunch" },
      { name: "Veg Leeks", description: "Fresh leeks", image: "https://images.unsplash.com/photo-1518977676601-b53f82eba1b9?w=400", categoryId: vegetablesId, originalPrice: "85.00", discountPercent: 0, price: "80.00", rating: "4.1", unit: "1 bunch" },
      { name: "Veg Iceberg Lettuce", description: "Iceberg lettuce", image: "https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=400", categoryId: vegetablesId, originalPrice: "90.00", discountPercent: 0, price: "85.00", rating: "4.3", unit: "1 pc" },
      { name: "Curry Leaves", description: "Fresh curry leaves", image: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400", categoryId: vegetablesId, originalPrice: "12.00", discountPercent: 17, price: "10.00", rating: "4.4", unit: "1 bunch" },
      { name: "Curry Leaves Bundle", description: "Fresh aromatic curry leaves", image: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400", categoryId: vegetablesId, originalPrice: "12.00", discountPercent: 17, price: "10.00", rating: "4.3", unit: "1 bunch" },
      { name: "Celery", description: "Fresh celery stalks", image: "https://images.unsplash.com/photo-1518977676601-b53f82eba1b9?w=400", categoryId: vegetablesId, originalPrice: "210.00", discountPercent: 0, price: "200.00", rating: "4.2", unit: "1 bunch" },
      { name: "Mint Leaf", description: "Fresh mint leaves", image: "https://images.unsplash.com/photo-1628556270448-4d4e4148e1b1?w=400", categoryId: vegetablesId, originalPrice: "12.00", discountPercent: 17, price: "10.00", rating: "4.3", unit: "1 bunch" },
      { name: "Coriander", description: "Fresh coriander leaves", image: "https://images.unsplash.com/photo-1585486164392-6cf3e7b80e43?w=400", categoryId: vegetablesId, originalPrice: "13.00", discountPercent: 8, price: "12.00", rating: "4.4", unit: "1 bunch" },
      { name: "Lettuce", description: "Fresh lettuce leaves", image: "https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=400", categoryId: vegetablesId, originalPrice: "40.00", discountPercent: 12, price: "35.00", rating: "4.2", unit: "1 bunch" },
      { name: "Zucchini", description: "Fresh zucchini", image: "https://images.unsplash.com/photo-1563252722-6434563a985d?w=400", categoryId: vegetablesId, originalPrice: "60.00", discountPercent: 0, price: "55.00", rating: "4.3", unit: "500g" },
      { name: "Hummingbird Tree Leaves", description: "Fresh Agathi keerai", image: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400", categoryId: vegetablesId, originalPrice: "35.00", discountPercent: 0, price: "30.00", rating: "4.0", unit: "1 bunch" },
      { name: "Parsley", description: "Fresh parsley leaves", image: "https://images.unsplash.com/photo-1628556270448-4d4e4148e1b1?w=400", categoryId: vegetablesId, originalPrice: "110.00", discountPercent: 0, price: "100.00", rating: "4.1", unit: "1 bunch" },
      { name: "Aavaram Flower", description: "Fresh aavaram flowers", image: "https://images.unsplash.com/photo-1518977676601-b53f82eba1b9?w=400", categoryId: vegetablesId, originalPrice: "130.00", discountPercent: 0, price: "120.00", rating: "4.0", unit: "100g" },
      { name: "Kang Kong", description: "Water spinach", image: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400", categoryId: vegetablesId, originalPrice: "190.00", discountPercent: 0, price: "180.00", rating: "4.1", unit: "1 bunch" },
      { name: "Taragon", description: "Fresh tarragon herb", image: "https://images.unsplash.com/photo-1628556270448-4d4e4148e1b1?w=400", categoryId: vegetablesId, originalPrice: "190.00", discountPercent: 0, price: "180.00", rating: "4.0", unit: "1 bunch" },
      { name: "Broccoli", description: "Fresh broccoli", image: "https://images.unsplash.com/photo-1584270354949-c26b0d5b4a0c?w=400", categoryId: vegetablesId, originalPrice: "110.00", discountPercent: 14, price: "95.00", rating: "4.4", unit: "500g" },
      { name: "Lemon", description: "Fresh lemons", image: "https://images.unsplash.com/photo-1590502593747-42a996133562?w=400", categoryId: vegetablesId, originalPrice: "6.00", discountPercent: 0, price: "5.00", rating: "4.3", unit: "1 pc" },
      { name: "Chinese Cabbage", description: "Fresh Chinese cabbage", image: "https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?w=400", categoryId: vegetablesId, originalPrice: "70.00", discountPercent: 9, price: "64.00", rating: "4.2", unit: "1 pc" },
      { name: "Drumstick Leaves", description: "Fresh moringa leaves", image: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400", categoryId: vegetablesId, originalPrice: "35.00", discountPercent: 0, price: "30.00", rating: "4.1", unit: "1 bunch" },
      { name: "Dwarf Copper Leaves", description: "Fresh copper leaves", image: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400", categoryId: vegetablesId, originalPrice: "35.00", discountPercent: 0, price: "30.00", rating: "4.0", unit: "1 bunch" },
      { name: "Amaranthus", description: "Fresh amaranth greens", image: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400", categoryId: vegetablesId, originalPrice: "35.00", discountPercent: 0, price: "30.00", rating: "4.1", unit: "1 bunch" },
      { name: "Tropical Amaranth", description: "Siru keerai", image: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400", categoryId: vegetablesId, originalPrice: "35.00", discountPercent: 0, price: "30.00", rating: "4.0", unit: "1 bunch" },
      { name: "Spinach", description: "Fresh spinach leaves", image: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400", categoryId: vegetablesId, originalPrice: "35.00", discountPercent: 0, price: "30.00", rating: "4.3", unit: "1 bunch" },
      { name: "Gandan Purslane", description: "Fresh purslane greens", image: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400", categoryId: vegetablesId, originalPrice: "35.00", discountPercent: 0, price: "30.00", rating: "4.0", unit: "1 bunch" },
      { name: "Pennywort Brahmi Leaf", description: "Fresh brahmi leaves", image: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400", categoryId: vegetablesId, originalPrice: "35.00", discountPercent: 0, price: "30.00", rating: "4.1", unit: "1 bunch" },
      { name: "Fenugreek Leaf", description: "Fresh methi leaves", image: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400", categoryId: vegetablesId, originalPrice: "35.00", discountPercent: 0, price: "30.00", rating: "4.2", unit: "1 bunch" },
      { name: "Common Purslane", description: "Fresh purslane", image: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400", categoryId: vegetablesId, originalPrice: "35.00", discountPercent: 0, price: "30.00", rating: "4.0", unit: "1 bunch" },
      { name: "Foxtail Amaranth", description: "Fresh foxtail amaranth", image: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400", categoryId: vegetablesId, originalPrice: "35.00", discountPercent: 0, price: "30.00", rating: "4.1", unit: "1 bunch" },
      { name: "Sweet Corn", description: "Fresh sweet corn", image: "https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=400", categoryId: vegetablesId, originalPrice: "85.00", discountPercent: 0, price: "80.00", rating: "4.3", unit: "2 pcs" },
      { name: "Pointed Gourd - Parwal", description: "Fresh parwal", image: "https://images.unsplash.com/photo-1518977676601-b53f82eba1b9?w=400", categoryId: vegetablesId, originalPrice: "55.00", discountPercent: 15, price: "47.00", rating: "4.1", unit: "500g" },
      { name: "Red Radish", description: "Fresh red radish", image: "https://images.unsplash.com/photo-1518977676601-b53f82eba1b9?w=400", categoryId: vegetablesId, originalPrice: "45.00", discountPercent: 0, price: "40.00", rating: "4.0", unit: "500g" },
      { name: "Turnips", description: "Fresh turnips", image: "https://images.unsplash.com/photo-1518977676601-b53f82eba1b9?w=400", categoryId: vegetablesId, originalPrice: "55.00", discountPercent: 0, price: "50.00", rating: "4.0", unit: "500g" },
      { name: "Panji Thengai - Coconut", description: "Tender coconut", image: "https://images.unsplash.com/photo-1560769680-ba2f3767c785?w=400", categoryId: vegetablesId, originalPrice: "25.00", discountPercent: 12, price: "22.00", rating: "4.2", unit: "1 pc" },
      { name: "Ash Gourd", description: "Fresh ash gourd", image: "https://images.unsplash.com/photo-1518977676601-b53f82eba1b9?w=400", categoryId: vegetablesId, originalPrice: "35.00", discountPercent: 14, price: "30.00", rating: "4.1", unit: "1 kg" },
      { name: "Pumpkin", description: "Fresh pumpkin", image: "https://images.unsplash.com/photo-1570586437263-ab629fccc818?w=400", categoryId: vegetablesId, originalPrice: "45.00", discountPercent: 0, price: "40.00", rating: "4.2", unit: "1 kg" },
      { name: "Sweet Potato", description: "Fresh sweet potato", image: "https://images.unsplash.com/photo-1518977676601-b53f82eba1b9?w=400", categoryId: vegetablesId, originalPrice: "85.00", discountPercent: 0, price: "80.00", rating: "4.3", unit: "1 kg" },

      // ============ FRUITS (53 products) ============
      { name: "Banana Yelakki", description: "Sweet elaichi banana", image: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400", categoryId: fruitsId, originalPrice: "60.00", discountPercent: 0, price: "55.00", rating: "4.5", unit: "1 dozen" },
      { name: "Mango Neelam", description: "Sweet Neelam mangoes", image: "https://images.unsplash.com/photo-1553279768-865429fa0078?w=400", categoryId: fruitsId, originalPrice: "100.00", discountPercent: 0, price: "90.00", rating: "4.6", unit: "1 kg" },
      { name: "Longan Fruit", description: "Fresh longan fruit", image: "https://images.unsplash.com/photo-1546548970-71785318a17b?w=400", categoryId: fruitsId, originalPrice: "250.00", discountPercent: 0, price: "240.00", rating: "4.3", unit: "500g" },
      { name: "Apples Delhi", description: "Delhi apples", image: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400", categoryId: fruitsId, originalPrice: "135.00", discountPercent: 4, price: "130.00", rating: "4.3", unit: "1 kg" },
      { name: "Grapes Red Globe Imported", description: "Imported red globe grapes", image: "https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=400", categoryId: fruitsId, originalPrice: "190.00", discountPercent: 0, price: "180.00", rating: "4.5", unit: "500g" },
      { name: "Grapes Paneer", description: "Paneer grapes", image: "https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=400", categoryId: fruitsId, originalPrice: "70.00", discountPercent: 0, price: "65.00", rating: "4.3", unit: "500g" },
      { name: "Banana Red", description: "Red banana", image: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400", categoryId: fruitsId, originalPrice: "55.00", discountPercent: 0, price: "50.00", rating: "4.4", unit: "1 kg" },
      { name: "Banana Rasthali", description: "Rasthali banana", image: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400", categoryId: fruitsId, originalPrice: "85.00", discountPercent: 0, price: "80.00", rating: "4.5", unit: "1 kg" },
      { name: "Banana Poovan", description: "Poovan banana", image: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400", categoryId: fruitsId, originalPrice: "52.00", discountPercent: 0, price: "48.00", rating: "4.3", unit: "1 kg" },
      { name: "Banana Nendran", description: "Nendran banana", image: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400", categoryId: fruitsId, originalPrice: "65.00", discountPercent: 0, price: "60.00", rating: "4.4", unit: "1 kg" },
      { name: "Banana Morris", description: "Morris banana", image: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400", categoryId: fruitsId, originalPrice: "48.00", discountPercent: 0, price: "45.00", rating: "4.2", unit: "1 kg" },
      { name: "Banana Karpooravalli", description: "Karpooravalli banana", image: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400", categoryId: fruitsId, originalPrice: "85.00", discountPercent: 0, price: "80.00", rating: "4.5", unit: "1 kg" },
      { name: "Banana Hill", description: "Hill banana", image: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400", categoryId: fruitsId, originalPrice: "90.00", discountPercent: 0, price: "85.00", rating: "4.4", unit: "1 kg" },
      { name: "Banana Green", description: "Green raw banana", image: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400", categoryId: fruitsId, originalPrice: "40.00", discountPercent: 0, price: "35.00", rating: "4.1", unit: "1 kg" },
      { name: "Seedless Grapes", description: "Sweet seedless grapes", image: "https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=400", categoryId: fruitsId, originalPrice: "110.00", discountPercent: 9, price: "100.00", rating: "4.5", unit: "500g" },
      { name: "White Dragon Fruit", description: "White dragon fruit", image: "https://images.unsplash.com/photo-1527325678964-54921661f888?w=400", categoryId: fruitsId, originalPrice: "140.00", discountPercent: 0, price: "130.00", rating: "4.4", unit: "1 pc" },
      { name: "Red Dragon Fruit", description: "Red dragon fruit", image: "https://images.unsplash.com/photo-1527325678964-54921661f888?w=400", categoryId: fruitsId, originalPrice: "160.00", discountPercent: 0, price: "150.00", rating: "4.5", unit: "1 pc" },
      { name: "Indian Orange", description: "Fresh Indian oranges", image: "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=400", categoryId: fruitsId, originalPrice: "75.00", discountPercent: 0, price: "70.00", rating: "4.3", unit: "1 kg" },
      { name: "Custard Apple", description: "Fresh custard apple", image: "https://images.unsplash.com/photo-1546548970-71785318a17b?w=400", categoryId: fruitsId, originalPrice: "120.00", discountPercent: 0, price: "110.00", rating: "4.4", unit: "500g" },
      { name: "Melon Muskmelon", description: "Sweet muskmelon", image: "https://images.unsplash.com/photo-1571575173700-afb9492e6a50?w=400", categoryId: fruitsId, originalPrice: "55.00", discountPercent: 0, price: "50.00", rating: "4.3", unit: "1 pc" },
      { name: "Lychee", description: "Fresh lychee", image: "https://images.unsplash.com/photo-1546548970-71785318a17b?w=400", categoryId: fruitsId, originalPrice: "180.00", discountPercent: 0, price: "170.00", rating: "4.5", unit: "500g" },
      { name: "Cherry", description: "Fresh cherries", image: "https://images.unsplash.com/photo-1528821128474-27f963b062bf?w=400", categoryId: fruitsId, originalPrice: "450.00", discountPercent: 0, price: "420.00", rating: "4.6", unit: "250g" },
      { name: "Mangosteen", description: "Fresh mangosteen", image: "https://images.unsplash.com/photo-1546548970-71785318a17b?w=400", categoryId: fruitsId, originalPrice: "350.00", discountPercent: 0, price: "320.00", rating: "4.5", unit: "500g" },
      { name: "Durian", description: "Fresh durian", image: "https://images.unsplash.com/photo-1546548970-71785318a17b?w=400", categoryId: fruitsId, originalPrice: "650.00", discountPercent: 0, price: "600.00", rating: "4.3", unit: "1 pc" },
      { name: "Fig Anjur Fresh", description: "Fresh figs", image: "https://images.unsplash.com/photo-1601379760883-1bb497c558e0?w=400", categoryId: fruitsId, originalPrice: "250.00", discountPercent: 0, price: "230.00", rating: "4.4", unit: "250g" },
      { name: "Coconut Elanir", description: "Tender coconut water", image: "https://images.unsplash.com/photo-1560769680-ba2f3767c785?w=400", categoryId: fruitsId, originalPrice: "50.00", discountPercent: 0, price: "45.00", rating: "4.5", unit: "1 pc" },
      { name: "Watermelon Kiran", description: "Sweet Kiran watermelon", image: "https://images.unsplash.com/photo-1589984662646-e7b2e4962f18?w=400", categoryId: fruitsId, originalPrice: "55.00", discountPercent: 0, price: "50.00", rating: "4.4", unit: "1 pc" },
      { name: "Pineapple", description: "Fresh pineapple", image: "https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=400", categoryId: fruitsId, originalPrice: "60.00", discountPercent: 0, price: "55.00", rating: "4.4", unit: "1 pc" },
      { name: "Plum", description: "Fresh plums", image: "https://images.unsplash.com/photo-1546548970-71785318a17b?w=400", categoryId: fruitsId, originalPrice: "180.00", discountPercent: 0, price: "170.00", rating: "4.3", unit: "500g" },
      { name: "Pomegranate", description: "Fresh pomegranate", image: "https://images.unsplash.com/photo-1541344999736-83eca272f6fc?w=400", categoryId: fruitsId, originalPrice: "160.00", discountPercent: 0, price: "150.00", rating: "4.5", unit: "1 kg" },
      { name: "Strawberry", description: "Fresh strawberries", image: "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=400", categoryId: fruitsId, originalPrice: "180.00", discountPercent: 0, price: "165.00", rating: "4.6", unit: "200g" },
      { name: "Apple Red Delicious", description: "Red delicious apples", image: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400", categoryId: fruitsId, originalPrice: "200.00", discountPercent: 0, price: "185.00", rating: "4.5", unit: "1 kg" },
      { name: "Avocado", description: "Fresh avocado", image: "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=400", categoryId: fruitsId, originalPrice: "160.00", discountPercent: 0, price: "150.00", rating: "4.4", unit: "1 pc" },
      { name: "Watermelon", description: "Sweet watermelon", image: "https://images.unsplash.com/photo-1589984662646-e7b2e4962f18?w=400", categoryId: fruitsId, originalPrice: "50.00", discountPercent: 0, price: "45.00", rating: "4.4", unit: "1 pc" },
      { name: "Chikoo", description: "Fresh sapota/chikoo", image: "https://images.unsplash.com/photo-1546548970-71785318a17b?w=400", categoryId: fruitsId, originalPrice: "80.00", discountPercent: 0, price: "75.00", rating: "4.3", unit: "500g" },
      { name: "Dates", description: "Fresh dates", image: "https://images.unsplash.com/photo-1567306295427-94503f8300d7?w=400", categoryId: fruitsId, originalPrice: "180.00", discountPercent: 0, price: "165.00", rating: "4.5", unit: "500g" },
      { name: "Grapes Black", description: "Black grapes", image: "https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=400", categoryId: fruitsId, originalPrice: "90.00", discountPercent: 0, price: "85.00", rating: "4.4", unit: "500g" },
      { name: "Grapes Green", description: "Green grapes", image: "https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=400", categoryId: fruitsId, originalPrice: "85.00", discountPercent: 0, price: "80.00", rating: "4.4", unit: "500g" },
      { name: "Green Apple", description: "Fresh green apples", image: "https://images.unsplash.com/photo-1569870499705-504209102861?w=400", categoryId: fruitsId, originalPrice: "220.00", discountPercent: 0, price: "200.00", rating: "4.5", unit: "1 kg" },
      { name: "Guava", description: "Fresh guava", image: "https://images.unsplash.com/photo-1536511132770-e5058c7e8c46?w=400", categoryId: fruitsId, originalPrice: "55.00", discountPercent: 0, price: "50.00", rating: "4.3", unit: "500g" },
      { name: "Kiwi", description: "Fresh kiwi fruit", image: "https://images.unsplash.com/photo-1585059895524-72359e06133a?w=400", categoryId: fruitsId, originalPrice: "180.00", discountPercent: 0, price: "165.00", rating: "4.5", unit: "3 pcs" },
      { name: "Mosambi", description: "Sweet lime", image: "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=400", categoryId: fruitsId, originalPrice: "70.00", discountPercent: 0, price: "65.00", rating: "4.3", unit: "1 kg" },
      { name: "Orange Imported", description: "Imported oranges", image: "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=400", categoryId: fruitsId, originalPrice: "150.00", discountPercent: 0, price: "140.00", rating: "4.5", unit: "1 kg" },
      { name: "Papaya", description: "Fresh papaya", image: "https://images.unsplash.com/photo-1517282009859-f000ec3b26fe?w=400", categoryId: fruitsId, originalPrice: "45.00", discountPercent: 0, price: "40.00", rating: "4.3", unit: "1 pc" },
      { name: "Pears Imported", description: "Imported pears", image: "https://images.unsplash.com/photo-1514756331096-242fdeb70d4a?w=400", categoryId: fruitsId, originalPrice: "200.00", discountPercent: 0, price: "185.00", rating: "4.4", unit: "1 kg" },
      { name: "Ber", description: "Fresh Indian jujube", image: "https://images.unsplash.com/photo-1546548970-71785318a17b?w=400", categoryId: fruitsId, originalPrice: "60.00", discountPercent: 0, price: "55.00", rating: "4.2", unit: "500g" },
      { name: "Blueberry", description: "Fresh blueberries", image: "https://images.unsplash.com/photo-1498557850523-fd3d118b962e?w=400", categoryId: fruitsId, originalPrice: "350.00", discountPercent: 0, price: "320.00", rating: "4.6", unit: "125g" },
      { name: "Jamun", description: "Fresh java plum", image: "https://images.unsplash.com/photo-1546548970-71785318a17b?w=400", categoryId: fruitsId, originalPrice: "90.00", discountPercent: 0, price: "85.00", rating: "4.3", unit: "500g" },
      { name: "Wild Gooseberry", description: "Fresh amla", image: "https://images.unsplash.com/photo-1546548970-71785318a17b?w=400", categoryId: fruitsId, originalPrice: "55.00", discountPercent: 0, price: "50.00", rating: "4.2", unit: "500g" },
      { name: "Chinese Apple", description: "Chinese variety apple", image: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400", categoryId: fruitsId, originalPrice: "180.00", discountPercent: 0, price: "165.00", rating: "4.4", unit: "1 kg" },
      { name: "Apple Royal Gala", description: "Royal gala apples", image: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400", categoryId: fruitsId, originalPrice: "210.00", discountPercent: 0, price: "195.00", rating: "4.5", unit: "1 kg" },
      { name: "Simla Apples", description: "Simla hill apples", image: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400", categoryId: fruitsId, originalPrice: "180.00", discountPercent: 0, price: "170.00", rating: "4.4", unit: "1 kg" },
      { name: "Mosambi Juice Quality", description: "Juice quality mosambi", image: "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=400", categoryId: fruitsId, originalPrice: "60.00", discountPercent: 0, price: "55.00", rating: "4.2", unit: "1 kg" },

      // ============ DAIRY (5 products) ============
      { name: "Full Cream Milk", description: "Farm fresh milk", image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400", categoryId: dairyId, originalPrice: "65.00", discountPercent: 0, price: "65.00", rating: "4.5", unit: "1 liter" },
      { name: "Amul Butter", description: "Creamy butter", image: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400", categoryId: dairyId, originalPrice: "56.00", discountPercent: 0, price: "56.00", rating: "4.7", unit: "100g" },
      { name: "Fresh Paneer", description: "Cottage cheese", image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400", categoryId: dairyId, originalPrice: "120.00", discountPercent: 5, price: "114.00", rating: "4.4", unit: "200g" },
      { name: "Yogurt", description: "Fresh curd", image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400", categoryId: dairyId, originalPrice: "45.00", discountPercent: 0, price: "45.00", rating: "4.3", unit: "400g" },
      { name: "Cheese Slices", description: "Processed cheese", image: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400", categoryId: dairyId, originalPrice: "140.00", discountPercent: 15, price: "119.00", rating: "4.2", unit: "200g" },

      // ============ BAKERY (3 products) ============
      { name: "White Bread", description: "Soft sandwich bread", image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400", categoryId: bakeryId, originalPrice: "45.00", discountPercent: 0, price: "45.00", rating: "4.1", unit: "400g" },
      { name: "Croissants", description: "Buttery French pastry", image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400", categoryId: bakeryId, originalPrice: "80.00", discountPercent: 10, price: "72.00", rating: "4.6", unit: "2 pcs" },
      { name: "Chocolate Cake", description: "Rich chocolate cake", image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400", categoryId: bakeryId, originalPrice: "450.00", discountPercent: 0, price: "450.00", rating: "4.8", unit: "500g" },

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
