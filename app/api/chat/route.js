import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import connectDB from "@/lib/db";
import Product from "@/models/Product";

async function getProducts() {
  await connectDB();
  return Product.find().limit(10).lean();
}

export async function POST(req) {
  if (!process.env.GROQ_API_KEY) {
    console.error("❌ GROQ_API_KEY is not set");
    return NextResponse.json(
      { reply: "Server config error: GROQ_API_KEY missing." },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const userMessage =
      body.message ||
      (Array.isArray(body.messages)
        ? body.messages[body.messages.length - 1]?.content
        : null);

    if (!userMessage) {
      return NextResponse.json(
        { reply: "No message received. Please try again." },
        { status: 400 }
      );
    }

    const products = await getProducts();
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const systemPrompt = `You are a helpful e-commerce shop assistant for ShopX.
Use the following product list to answer the user's questions accurately:
${JSON.stringify(products, null, 2)}
Keep answers short, friendly, and to the point.`;

    const history = Array.isArray(body.messages)
      ? body.messages
      : [{ role: "user", content: userMessage }];

    const aiResponse = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "system", content: systemPrompt }, ...history],
      max_tokens: 512,
      temperature: 0.7,
    });

    const reply =
      aiResponse.choices[0]?.message?.content?.trim() ||
      "Sorry, I couldn't generate a response.";

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { reply: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
