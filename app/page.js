"use client";
import Image from "next/image";
import { useEffect, useMemo, useState, useRef } from "react";

export default function Home() {
  // -- Existing States --
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [selected, setSelected] = useState(null);
  const [cart, setCart] = useState([]);
  const [open, setOpen] = useState(false);
  const [sort, setSort] = useState("default");
  
  // -- AI & UI States --
  const [cursorActive, setCursorActive] = useState(false);
  const [aiActive, setAiActive] = useState(false);
  const [messages, setMessages] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);

  // -- Refs --
  const isFetching = useRef(false);
  const chatBottomRef = useRef(null);
  const chatInputRef = useRef(null);

  // -- Auto-scroll Effect for Chat --
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, aiLoading]);

  // -- AI Chat Logic --
  const quickPrompts = ["What's trending?", "Best under $50", "Top rated"];

  const handleAiSubmit = async (e) => {
    e.preventDefault();
    const input = chatInputRef.current;
    const msg = input?.value.trim();
    if (!msg || aiLoading) return;

    const userMessage = { role: "user", content: msg };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    input.value = "";
    setAiLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ messages: updatedMessages }),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I'm having trouble connecting." },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  // -- Product Logic --
  async function fetchProducts(query = "", searchMode = false) {
    if (isFetching.current) return;
    isFetching.current = true;
    if (searchMode) setSearching(true);
    setLoading(true);

    try {
      const url = query ? `/api/ai-search?q=${encodeURIComponent(query)}` : "/api/ai-search";
      const res = await fetch(url);
      const data = await res.json();
      const dataArray = Array.isArray(data) ? data : data?.data;
      setProducts(Array.isArray(dataArray) ? dataArray.slice(0, 50) : []);
    } catch (err) {
      console.error("Fetch failed:", err);
      setProducts([]);
    } finally {
      isFetching.current = false;
      setSearching(false);
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSearchSubmit = async (event) => {
    event.preventDefault();
    await fetchProducts(search.trim(), true);
  };

  const categories = useMemo(() => {
    if (!Array.isArray(products) || products.length === 0) return ["All"];
    const items = products.map((p) => p?.category).filter(Boolean);
    return ["All", ...Array.from(new Set(items))];
  }, [products]);

  const filtered = useMemo(() => {
    if (!Array.isArray(products)) return [];
    return products
      .filter((p) => {
        if (!p) return false;
        return category === "All" || p.category === category;
      })
      .sort((a, b) => {
        if (!a || !b) return 0;
        if (sort === "price-asc") return (a.price || 0) - (b.price || 0);
        if (sort === "price-desc") return (b.price || 0) - (a.price || 0);
        if (sort === "name") return (a.title || "").localeCompare(b.title || "");
        return 0;
      });
  }, [products, category, sort]);

  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + (item.qty || 0), 0), [cart]);
  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + (item.price || 0) * (item.qty || 0), 0), [cart]);

  const addToCart = (product) => {
    if (!product || !product._id) return;
    setCart((prev) => {
      const found = prev.find((item) => item._id === product._id);
      return found
        ? prev.map((item) => (item._id === product._id ? { ...item, qty: item.qty + 1 } : item))
        : [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQty = (id, delta) => {
    if (!id) return;
    setCart((prev) =>
      prev
        .map((item) => (item._id === id ? { ...item, qty: Math.max(0, item.qty + delta) } : item))
        .filter((item) => item.qty > 0)
    );
  };

  const removeFromCart = (id) => {
    if (!id) return;
    setCart((prev) => prev.filter((item) => item._id !== id));
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white selection:bg-amber-400 selection:text-zinc-900">
      {/* -- Navbar -- */}
      <nav className="sticky top-0 z-50 bg-zinc-950/95 border-b border-zinc-800 px-6 py-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-400 rounded-lg flex items-center justify-center">
            <span className="text-zinc-900 font-black text-sm">S</span>
          </div>
          <span className="font-bold text-lg">ShopX</span>
        </div>

        <div className="flex flex-1 items-center gap-2 max-w-2xl w-full md:ml-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-1 min-w-0 items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-2">
            <svg className="w-4 h-4 text-zinc-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              className="bg-transparent outline-none w-full text-sm text-white placeholder-zinc-500"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              type="submit"
              disabled={searching}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${searching ? "bg-amber-700 text-zinc-200 cursor-not-allowed" : "bg-amber-400 text-zinc-950 hover:bg-amber-300"}`}
            >
              {searching ? (
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-zinc-950 animate-pulse" />
                  Searching...
                </span>
              ) : (
                "Search"
              )}
            </button>
          </form>

          <button
            onClick={() => setCursorActive(!cursorActive)}
            title="Toggle Cursor Action"
            className={`p-2 rounded-full border transition-all shrink-0 cursor-pointer ${
              cursorActive
                ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20"
                : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700"
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" />
            </svg>
          </button>

          <button
            onClick={() => setOpen(true)}
            className="ml-2 bg-amber-400 text-zinc-900 font-semibold text-sm rounded-full px-4 py-2 flex items-center gap-2 shrink-0 cursor-pointer hover:bg-amber-300 transition-colors"
          >
            Cart
            {cartCount > 0 && (
              <span className="bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* -- Main Grid -- */}
      <section className="px-6 py-10 max-w-7xl mx-auto">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-semibold border cursor-pointer transition-all ${
                  category === cat
                    ? "bg-amber-400 text-zinc-900 border-amber-400"
                    : "border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs rounded-lg px-3 py-2 cursor-pointer outline-none"
          >
            <option value="default">Sort: Default</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="name">Name: A to Z</option>
          </select>
        </div>

        {loading ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={`skeleton-${i}`} className="animate-pulse bg-zinc-900 rounded-2xl overflow-hidden">
                <div className="h-56 bg-zinc-800" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-zinc-800 rounded w-3/4" />
                  <div className="h-3 bg-zinc-800 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-32 text-zinc-400">
            <p className="text-xl font-semibold mb-4">No products found</p>
            <button
              onClick={() => {
                setSearch("");
                setCategory("All");
              }}
              className="mt-4 bg-amber-400 text-zinc-900 px-6 py-2 rounded-full cursor-pointer"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {filtered.map((p, index) => {
              const uniqueKey = p._id?.toString() || `prod-${index}-${p.title}`;
              return (
                <article
                  key={uniqueKey}
                  className="group bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 hover:border-amber-400/50 transition cursor-pointer"
                  onClick={() => setSelected(p)}
                >
                  <div className="relative h-56 bg-zinc-800 overflow-hidden">
                    {p.image ? (
                      <Image src={p.image} alt={p.title || "Product"} fill className="object-cover" unoptimized loading="eager" />
                    ) : (
                      <div className="flex items-center justify-center h-full text-zinc-600 text-sm">No image</div>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-amber-400 mb-2">{p.category || "General"}</p>
                    <h2 className="font-semibold text-white group-hover:text-amber-400 transition-colors">{p.title || "Untitled"}</h2>
                    <p className="text-zinc-500 text-sm mt-2 line-clamp-2">{p.description || ""}</p>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="font-black text-amber-400">${(p.price || 0).toFixed(2)}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(p);
                        }}
                        className="bg-amber-400 hover:bg-amber-300 text-zinc-900 px-3 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer"
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* -- Product Detail Modal -- */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="relative h-64 bg-zinc-800">
              {selected.image && <Image src={selected.image} alt={selected.title || "Product"} fill className="object-cover" unoptimized />}
              <button onClick={() => setSelected(null)} className="absolute top-4 right-4 bg-zinc-950/80 text-white w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:bg-zinc-800">X</button>
            </div>
            <div className="p-6">
              <h2 className="text-xl font-bold text-white">{selected.title}</h2>
              <p className="text-zinc-400 mt-3 text-sm leading-relaxed">{selected.description}</p>
              <div className="mt-6 flex items-center justify-between">
                <span className="text-amber-400 font-black text-2xl">${(selected.price || 0).toFixed(2)}</span>
                <button
                  onClick={() => {
                    addToCart(selected);
                    setSelected(null);
                  }}
                  className="bg-amber-400 hover:bg-amber-300 text-zinc-900 px-6 py-2.5 rounded-full font-bold transition-colors cursor-pointer"
                >
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -- Side Cart Drawer -- */}
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-zinc-900 border-l border-zinc-800 w-full max-w-sm h-full flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800">
              <h2 className="font-bold text-lg">Cart ({cartCount})</h2>
              <button onClick={() => setOpen(false)} className="text-zinc-400 hover:text-white cursor-pointer w-8 h-8 rounded-full flex items-center justify-center hover:bg-zinc-800">X</button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-20 text-zinc-500">
                  <p className="text-4xl mb-3">??</p>
                  <p>Your cart is empty</p>
                </div>
              ) : (
                cart.map((item, index) => {
                  const itemKey = item._id?.toString() || `cart-${index}-${item.title}`;
                  return (
                    <div key={itemKey} className="flex gap-3 bg-zinc-800 rounded-xl p-3">
                      {item.image && (
                        <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0">
                          <Image src={item.image} alt={item.title || "Item"} fill className="object-cover" unoptimized />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{item.title}</p>
                        <p className="text-amber-400 text-sm font-bold mt-0.5">${(item.price || 0).toFixed(2)}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => updateQty(item._id, -1)}
                            className="w-6 h-6 flex items-center justify-center bg-zinc-700 hover:bg-zinc-600 rounded text-white cursor-pointer"
                          >-</button>
                          <span className="text-zinc-300 text-xs w-4 text-center">{item.qty}</span>
                          <button
                            onClick={() => updateQty(item._id, 1)}
                            className="w-6 h-6 flex items-center justify-center bg-zinc-700 hover:bg-zinc-600 rounded text-white cursor-pointer"
                          >+</button>
                        </div>
                      </div>
                      <button onClick={() => removeFromCart(item._id)} className="text-zinc-500 hover:text-red-400 text-sm cursor-pointer">X</button>
                    </div>
                  );
                })
              )}
            </div>
            {cart.length > 0 && (
              <div className="px-6 py-5 border-t border-zinc-800">
                <div className="flex justify-between text-sm mb-4">
                  <span className="text-zinc-400">Total</span>
                  <span className="text-white font-black text-lg">${cartTotal.toFixed(2)}</span>
                </div>
                <button className="w-full bg-amber-400 hover:bg-amber-300 text-zinc-900 font-bold py-3 rounded-full cursor-pointer transition-colors">Checkout</button>
                <button onClick={() => setCart([])} className="w-full text-zinc-500 hover:text-red-400 text-sm mt-3 cursor-pointer transition-colors">Clear Cart</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* -- AI Floating Action Button -- */}
      {!aiActive && (
        <button
          onClick={() => setAiActive(true)}
          title="Open AI Assistant"
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-amber-400 hover:bg-amber-300 active:scale-95 text-zinc-900 rounded-full flex items-center justify-center shadow-2xl transition-all duration-200 cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.477 2 2 6.477 2 12c0 1.821.487 3.53 1.338 5L2.5 21.5l4.5-.838A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm1 14H7v-2h6v2zm2-4H7V10h8v2z"/>
          </svg>
        </button>
      )}

      {/* -- AI Chat Panel -- */}
      {aiActive && (
        <div
          className="fixed bottom-6 right-6 z-50 flex flex-col rounded-2xl overflow-hidden"
          style={{
            width: "360px",
            height: "520px",
            background: "#18181b",
            border: "1px solid #27272a",
            boxShadow: "0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(251,191,36,0.06)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 shrink-0"
            style={{ background: "#09090b", borderBottom: "1px solid #27272a" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-400 flex items-center justify-center text-zinc-900 font-bold text-xs shrink-0">
                AI
              </div>
              <div>
                <p className="text-sm font-semibold text-white leading-tight">ShopX Assistant</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs text-zinc-400">Powered by Groq</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMessages([])}
                title="Clear chat"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17 6H22V8H20V21a1 1 0 01-1 1H5a1 1 0 01-1-1V8H2V6h5V3a1 1 0 011-1h8a1 1 0 011 1v3zm1 2H6v12h12V8zM9 11h2v6H9v-6zm4 0h2v6h-2v-6zM9 4v2h6V4H9z"/>
                </svg>
              </button>
              <button
                onClick={() => setAiActive(false)}
                title="Close"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 10.586l4.95-4.95 1.414 1.414L13.414 12l4.95 4.95-1.414 1.414L12 13.414l-4.95 4.95-1.414-1.414L10.586 12 5.636 7.05l1.414-1.414L12 10.586z"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0"
            style={{ scrollbarWidth: "thin", scrollbarColor: "#3f3f46 transparent" }}
          >
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 pb-6">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)" }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="#fbbf24" viewBox="0 0 24 24">
                    <path d="M12 2C6.477 2 2 6.477 2 12c0 1.821.487 3.53 1.338 5L2.5 21.5l4.5-.838A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/>
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-white text-sm font-semibold">Hi, I'm ShopX AI!</p>
                  <p className="text-zinc-400 text-xs mt-1.5 leading-relaxed">
                    Ask about products, get recommendations,<br />or find the best deals.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {quickPrompts.map((q) => (
                    <button
                      key={q}
                      onClick={() => {
                        if (chatInputRef.current) {
                          chatInputRef.current.value = q;
                          chatInputRef.current.focus();
                        }
                      }}
                      className="text-xs text-zinc-300 px-3 py-1.5 rounded-full cursor-pointer transition-colors hover:bg-zinc-700"
                      style={{ background: "#27272a", border: "1px solid #3f3f46" }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((m, i) => (
                  <div key={i} className={`flex items-end gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    {m.role === "assistant" && (
                      <div
                        className="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center text-zinc-900 font-bold shrink-0"
                        style={{ fontSize: "9px" }}
                      >
                        AI
                      </div>
                    )}
                    <div
                      className={`text-sm leading-relaxed max-w-[78%] ${
                        m.role === "user"
                          ? "bg-amber-400 text-zinc-900 rounded-2xl rounded-br-sm"
                          : "text-zinc-100 rounded-2xl rounded-bl-sm"
                      }`}
                      style={{
                        padding: "8px 12px",
                        background: m.role === "user" ? undefined : "#27272a",
                      }}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}

                {/* Typing indicator */}
                {aiLoading && (
                  <div className="flex items-end gap-2 justify-start">
                    <div
                      className="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center text-zinc-900 font-bold shrink-0"
                      style={{ fontSize: "9px" }}
                    >
                      AI
                    </div>
                    <div className="px-4 py-3 rounded-2xl rounded-bl-sm" style={{ background: "#27272a" }}>
                      <div className="flex gap-1 items-center">
                        <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Input */}
          <div
            className="p-3 shrink-0"
            style={{ background: "#09090b", borderTop: "1px solid #27272a" }}
          >
            <form
              onSubmit={handleAiSubmit}
              className="flex items-center gap-2 rounded-xl px-3 py-2"
              style={{ background: "#18181b", border: "1px solid #3f3f46" }}
            >
              <input
                ref={chatInputRef}
                name="msg"
                disabled={aiLoading}
                className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 outline-none disabled:opacity-50 min-w-0"
                placeholder="Ask about products..."
                autoComplete="off"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    e.target.form.requestSubmit();
                  }
                }}
              />
              <button
                type="submit"
                disabled={aiLoading}
                className="w-7 h-7 rounded-lg bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-zinc-900 flex items-center justify-center transition-all shrink-0 active:scale-95 cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </form>
            <p className="text-center mt-2" style={{ fontSize: "11px", color: "#52525b" }}>
              llama-3.3-70b - ShopX AI
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
