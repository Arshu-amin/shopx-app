import connectDB from "@/lib/db";
import Product from "@/models/Product";
import { NextResponse } from "next/server";
import Groq from "groq-sdk"; // Import Groq

// Initialize Groq (Make sure GROQ_API_KEY is in your .env.local)
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req) {
  try {
    await connectDB();

    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim();
    
    let filter = {};

    if (q) {
      let searchKeyword = q; // Default to user's raw query

      try {
        // --- 🤖 AI MAGIC HAPPENS HERE ---
        // Ask the AI to figure out what the user actually wants
        const aiRes = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: "You are an e-commerce search assistant. The user will give you a messy sentence or query. Extract a short, 1-3 word product keyword to search the database. Reply ONLY with the keyword, nothing else. No punctuation.",
            },
            {
              role: "user",
              content: q,
            },
          ],
          temperature: 0.1, // Low temperature for focused, factual answers
        });

        // Get the AI's cleaned up keyword
        searchKeyword = aiRes.choices[0]?.message?.content?.trim() || q;
        console.log(`Original: "${q}" -> AI Keyword: "${searchKeyword}"`);

      } catch (aiError) {
        console.error("AI extraction failed, falling back to standard search:", aiError);
        // If AI fails, searchKeyword remains the original raw query 'q'
      }

      // --- 🔍 MONGODB SEARCH ---
      // Search using the keyword (either from AI or the fallback raw query)
      const safeQuery = escapeRegExp(searchKeyword);
      filter = {
        $or: [
          { title: { $regex: safeQuery, $options: "i" } },
          { description: { $regex: safeQuery, $options: "i" } },
          { category: { $regex: safeQuery, $options: "i" } },
        ],
      };
    }

    const products = await Product.find(filter).limit(200).lean();
    return NextResponse.json(products, { status: 200 });

  } catch (error) {
    console.error("Search API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load products." },
      { status: 500 }
    );
  }
}