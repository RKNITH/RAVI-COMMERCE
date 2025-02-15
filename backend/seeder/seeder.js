import mongoose from "mongoose";
import products from "./data.js";
import Product from "../models/product.model.js";
import 'dotenv/config'


const seedProducts = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB Connected");

        // Delete existing products
        await Product.deleteMany();
        console.log("Products are deleted");

        // Insert new products
        await Product.insertMany(products);
        console.log("Products are added");

        // Exit process
        process.exit(0);
    } catch (error) {
        console.error("Error seeding products:", error.message);
        process.exit(1);
    }
};

// Run the seed function
seedProducts();
