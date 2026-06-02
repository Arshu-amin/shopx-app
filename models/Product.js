import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  title: { type: String },
  description: { type: String },
  price: { type: Number },
  image: { type: String },
  category: { type: String },
});

export default mongoose.models.Product || mongoose.model("Product", productSchema);
