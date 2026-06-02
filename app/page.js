"use client"
import Image from "next/image"
import { useEffect, useMemo, useState, useRef } from "react"

export default function Home() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("All")
  const [selected, setSelected] = useState(null)
  const [cart, setCart] = useState([])
  const [open, setOpen] = useState(false)
  const [sort, setSort] = useState("default")

  // States for Cursor and AI features
  const [cursorActive, setCursorActive] = useState(false)
  const [aiActive, setAiActive] = useState(false)

  // Safety Lock: Prevents accidental multiple fetch loops
  const isFetching = useRef(false)

  useEffect(() => {
    if (isFetching.current) return
    isFetching.current = true

    fetch("/api/product")
      .then((res) => {
        if (!res.ok) throw new Error("Network error")
        return res.json()
      })
      .then((resData) => {
        // Support both direct array response or standard JSON envelope { success: true, data: [...] }
        const dataArray = Array.isArray(resData) ? resData : resData?.data;
        
        if (Array.isArray(dataArray)) {
          setProducts(dataArray.slice(0, 50))
        } else {
          setProducts([])
        }
      })
      .catch((err) => {
        console.error("Fetch intercepted cleanly:", err)
        setProducts([])
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  // Safely extract categories without mutating or running deep loops
  const categories = useMemo(() => {
    if (!Array.isArray(products) || products.length === 0) return ["All"]
    const items = products.map((p) => p?.category).filter(Boolean)
    return ["All", ...Array.from(new Set(items))]
  }, [products])

  // Process data efficiently with built-in fallbacks to avoid heavy overhead
  const filtered = useMemo(() => {
    if (!Array.isArray(products)) return []
    
    const term = search.trim().toLowerCase()
    
    return products
      .filter((p) => {
        if (!p) return false
        const matchesSearch = !term || 
          (p.title?.toLowerCase().includes(term) || p.description?.toLowerCase().includes(term))
        const matchesCategory = category === "All" || p.category === category
        return matchesSearch && matchesCategory
      })
      .sort((a, b) => {
        if (!a || !b) return 0
        if (sort === "price-asc") return (a.price || 0) - (b.price || 0)
        if (sort === "price-desc") return (b.price || 0) - (a.price || 0)
        if (sort === "name") return (a.title || "").localeCompare(b.title || "")
        return 0
      })
  }, [products, search, category, sort])

  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + (item.qty || 0), 0), [cart])
  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + (item.price || 0) * (item.qty || 0), 0), [cart])

  const addToCart = (product) => {
    if (!product || !product._id) return
    setCart((prev) => {
      const found = prev.find((item) => item._id === product._id)
      return found
        ? prev.map((item) => (item._id === product._id ? { ...item, qty: item.qty + 1 } : item))
        : [...prev, { ...product, qty: 1 }]
    })
  }

  const updateQty = (id, delta) => {
    if (!id) return
    setCart((prev) =>
      prev
        .map((item) => (item._id === id ? { ...item, qty: Math.max(0, item.qty + delta) } : item))
        .filter((item) => item.qty > 0),
    )
  }

  const removeFromCart = (id) => {
    if (!id) return
    setCart((prev) => prev.filter((item) => item._id !== id))
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white selection:bg-amber-400 selection:text-zinc-900">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-zinc-950/95 border-b border-zinc-800 px-6 py-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-400 rounded-lg flex items-center justify-center">
            <span className="text-zinc-900 font-black text-sm">S</span>
          </div>
          <span className="font-bold text-lg">ShopX</span>
        </div>

        {/* Dynamic Controls Bar */}
        <div className="flex flex-1 items-center gap-2 max-w-2xl w-full md:ml-4">
          <div className="flex flex-1 min-w-0 items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-2">
            <svg className="w-4 h-4 text-zinc-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              className="bg-transparent outline-none w-full text-sm text-white placeholder-zinc-500"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Cursor Button */}
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

          {/* AI Button */}
          <button
            onClick={() => setAiActive(!aiActive)}
            title="Ask AI Assistant"
            className={`p-2 rounded-full border transition-all shrink-0 cursor-pointer ${
              aiActive
                ? "bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/20"
                : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700"
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </button>

          {/* Cart Trigger */}
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

      {/* Main Grid */}
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
                setSearch("")
                setCategory("All")
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
                      <Image src={p.image} alt={p.title || "Product"} fill className="object-cover" unoptimized />
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
                          e.stopPropagation()
                          addToCart(p)
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

      {/* Product Detail Modal */}
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
                    addToCart(selected)
                    setSelected(null)
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

      {/* Side Cart Drawer */}
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
                  <p className="text-4xl mb-3">🛒</p>
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
    </div>
  )
}