import {useState,useEffect,useCallback} from 'react';
import {BrowserRouter,Routes,Route,Link,useNavigate,useParams,useSearchParams,Navigate} from 'react-router-dom';
import {api,role,setToken} from './api';
const money=n=>'$'+Number(n).toFixed(2);
const loggedIn=()=>!!localStorage.getItem('t');

function useLoad(fn,deps){
  const [s,set]=useState({data:null,error:null,loading:true});
  const reload=useCallback(()=>{fn().then(data=>set({data,error:null,loading:false}),e=>set({data:null,error:e.message,loading:false}));},deps);
  useEffect(reload,[reload]); return {...s,reload};
}
const Status=({loading,error,children})=>loading?<p className="muted">Loading…</p>:error?<p className="err" role="alert">{error}</p>:children;
const Guard=({children,admin})=>!loggedIn()?<Navigate to="/login"/>:admin&&role()!=='ADMIN'?<Navigate to="/"/>:children;

function Nav(){
  const nav=useNavigate();
  return <header className="nav"><Link to="/" className="logo">shop</Link><nav>
    <Link to="/cart">Cart</Link>
    {loggedIn()?<>
      <Link to="/orders">Orders</Link>
      {role()==='ADMIN'&&<Link to="/admin">Admin</Link>}
      <button className="link" onClick={()=>{setToken(null);nav('/login');}}>Sign out</button>
    </>:<Link to="/login">Sign in</Link>}
  </nav></header>;
}

function Home() {
  const [sp, setSp] = useSearchParams();
  const q = sp.get("q") || "";
  const cat = sp.get("category") || "0";

  const cats = useLoad(() => api("/categories"), []);
  const prods = useLoad(
    () => api(`/products?q=${encodeURIComponent(q)}&category=${cat}&size=24`),
    [q, cat]
  );

  return (
    <main>
      <h1>Everything in stock</h1>

      <div className="filters">
        <input
          type="search"
          placeholder="Search products"
          defaultValue={q}
          aria-label="Search products"
          onKeyDown={(e) =>
            e.key === "Enter" &&
            setSp({ q: e.target.value, category: cat })
          }
        />

        <select
          value={cat}
          aria-label="Category"
          onChange={(e) => setSp({ q, category: e.target.value })}
        >
          <option value="0">All categories</option>

          {(cats.data || []).map((c) => (
            <option key={`${c.id}-${c.name}`} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <Status {...prods}>
        {prods.data?.content?.length === 0 && (
          <p className="muted">
            No products match. Try another search or category.
          </p>
        )}

        <div className="grid">
          {(prods.data?.content || []).map((p) => (
            <Link
              to={`/products/${p.id}`}
              className="card"
              key={p.id}
            >
              <div className="ph" aria-hidden>
                {p.name?.[0]?.toUpperCase() || "?"}
              </div>

              <strong>{p.name || "Unnamed Product"}</strong>

              <span>{money(p.price || 0)}</span>

              {p.stock <= 0 && (
                <em className="muted">Sold out</em>
              )}
            </Link>
          ))}
        </div>
      </Status>
    </main>
  );
}

function Product() {
  const { id } = useParams();
  const nav = useNavigate();
  const [msg, setMsg] = useState("");

  const p = useLoad(() => api("/products/" + id), [id]);
  const rv = useLoad(() => api(`/products/${id}/reviews`), [id]);

  const [qty, setQty] = useState(1);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");

  const add = async () => {
    if (!loggedIn()) return nav("/login");

    try {
      await api("/cart", {
        method: "POST",
        body: {
          productId: +id,
          qty,
        },
      });

      setMsg("Added to cart.");
    } catch (e) {
      setMsg(e.message);
    }
  };

  const review = async (e) => {
    e.preventDefault();

    if (!loggedIn()) return nav("/login");

    try {
      await api(`/products/${id}/reviews`, {
        method: "POST",
        body: {
          rating: +rating,
          body,
        },
      });

      setBody("");
      rv.reload();
    } catch (e) {
      setMsg(e.message);
    }
  };

  return (
    <main>
      <Status {...p}>
        {p.data && (
          <>
            <div className="detail">
              <div className="ph big" aria-hidden>
                {p.data.name?.[0]?.toUpperCase() || "?"}
              </div>

              <div>
                <h1>{p.data.name || "Unnamed Product"}</h1>

                <p className="price">
                  {money(p.data.price || 0)}
                </p>

                <p>{p.data.description || "No description available."}</p>

                <p className="muted">
                  {p.data.stock > 0
                    ? `${p.data.stock} in stock`
                    : "Sold out"}
                </p>

                <div className="row">
                  <input
                    type="number"
                    min="1"
                    max={p.data.stock || 1}
                    value={qty}
                    onChange={(e) => setQty(+e.target.value)}
                    aria-label="Quantity"
                  />

                  <button
                    disabled={p.data.stock <= 0}
                    onClick={add}
                  >
                    Add to cart
                  </button>
                </div>

                {msg && <p role="status">{msg}</p>}
              </div>
            </div>

            <h2>Reviews</h2>

            {rv.data?.length === 0 && (
              <p className="muted">
                No reviews yet. Be the first to write one.
              </p>
            )}

            {rv.data?.map((r) => (
              <p key={r.id}>
                <b>{"★".repeat(r.rating)}</b> {r.body}
              </p>
            ))}

            <form onSubmit={review} className="row">
              <select
                value={rating}
                onChange={(e) => setRating(e.target.value)}
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>

              <input
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write a review"
              />

              <button>Post review</button>
            </form>
          </>
        )}
      </Status>
    </main>
  );
}

function Cart(){
  const cart=useLoad(async()=>{
    if(!loggedIn()) return [];
    const items=await api('/cart');
    return Promise.all(items.map(async i=>({...i,product:await api('/products/'+i.productId)})));
  },[]);
  if(!loggedIn()) return <main><h1>Cart</h1><p>Sign in to see your cart. <Link to="/login">Sign in</Link></p></main>;
  const total=(cart.data||[]).reduce((s,i)=>s+i.qty*i.product.price,0);
  return <main><h1>Cart</h1><Status {...cart}>
    {cart.data?.length===0?<p className="muted">Your cart is empty. <Link to="/">Browse products</Link></p>:<>
      {cart.data?.map(i=><div className="line" key={i.id}>
        <Link to={`/products/${i.productId}`}>{i.product.name}</Link><span>{i.qty} × {money(i.product.price)}</span>
        <button className="link" onClick={async()=>{await api('/cart/'+i.id,{method:'DELETE'});cart.reload();}}>Remove</button></div>)}
      <p className="total">Total {money(total)}</p><Link className="btn" to="/checkout">Go to checkout</Link></>}
  </Status></main>;
}

function Checkout(){
  const nav=useNavigate(); const [token,setTok]=useState('tok_visa'); const [err,setErr]=useState(''); const [busy,setBusy]=useState(false);
  const pay=async e=>{ e.preventDefault(); setBusy(true); setErr('');
    try{const o=await api('/checkout',{method:'POST',body:{paymentToken:token}});nav('/orders?placed='+o.id);}
    catch(e){setErr(e.message);setBusy(false);} };
  return <main><h1>Checkout</h1><form onSubmit={pay} className="stack">
    <label>Payment token<input value={token} onChange={e=>setTok(e.target.value)} required/></label>
    <p className="muted">Demo gateway: any token works, and tok_fail simulates a declined card. Replace this field with Stripe Elements or Razorpay Checkout to take real cards.</p>
    {err&&<p className="err" role="alert">{err}</p>}<button disabled={busy}>{busy?'Placing order…':'Place order'}</button></form></main>;
}

function Login(){
  const nav=useNavigate(); const [mode,setMode]=useState('login'); const [f,setF]=useState({email:'',password:''}); const [err,setErr]=useState('');
  const go=async e=>{ e.preventDefault();
    try{const r=await api('/auth/'+mode,{method:'POST',body:f});setToken(r.token);nav('/');}catch(e){setErr(e.message);} };
  return <main className="narrow"><h1>{mode==='login'?'Sign in':'Create account'}</h1><form onSubmit={go} className="stack">
    <label>Email<input type="email" required value={f.email} onChange={e=>setF({...f,email:e.target.value})}/></label>
    <label>Password<input type="password" minLength="8" required value={f.password} onChange={e=>setF({...f,password:e.target.value})}/></label>
    {err&&<p className="err" role="alert">{err}</p>}<button>{mode==='login'?'Sign in':'Create account'}</button></form>
    <button className="link" onClick={()=>{setMode(mode==='login'?'register':'login');setErr('');}}>
      {mode==='login'?'New here? Create an account':'Have an account? Sign in'}</button></main>;
}

function Orders(){
  const [sp]=useSearchParams(); const o=useLoad(()=>api('/orders'),[]);
  return <main><h1>Your orders</h1>{sp.get('placed')&&<p role="status" className="ok">Order #{sp.get('placed')} placed. Payment confirmed.</p>}
    <Status {...o}>{o.data?.length===0&&<p className="muted">No orders yet.</p>}
      {o.data?.map(x=><div className="line" key={x.id}><span>Order #{x.id}</span><span>{money(x.total)}</span><span className={'pill '+x.status}>{x.status}</span></div>)}
    </Status></main>;
}

function Admin(){
  const orders=useLoad(()=>api('/admin/orders'),[]);
  const [p,setP]=useState({name:'',description:'',price:'',stock:'',categoryId:''}); const [msg,setMsg]=useState('');
  const save=async e=>{ e.preventDefault();
    try{await api('/products',{method:'POST',body:{...p,price:+p.price,stock:+p.stock,categoryId:p.categoryId?+p.categoryId:null}});
      setMsg('Product saved.');setP({name:'',description:'',price:'',stock:'',categoryId:''});}catch(e){setMsg(e.message);} };
  const set=(k)=>e=>setP({...p,[k]:e.target.value});
  return <main><h1>Admin</h1><h2>Add product</h2>
    <form onSubmit={save} className="stack">
      <label>Name<input required value={p.name} onChange={set('name')}/></label>
      <label>Description<input value={p.description} onChange={set('description')}/></label>
      <div className="row"><label>Price<input type="number" step="0.01" min="0" required value={p.price} onChange={set('price')}/></label>
        <label>Stock<input type="number" min="0" required value={p.stock} onChange={set('stock')}/></label>
        <label>Category ID<input type="number" value={p.categoryId} onChange={set('categoryId')}/></label></div>
      {msg&&<p role="status">{msg}</p>}<button>Save product</button></form>
    <h2>Orders</h2><Status {...orders}>{orders.data?.map(x=><div className="line" key={x.id}>
      <span>#{x.id} · user {x.userId}</span><span>{money(x.total)}</span><span className={'pill '+x.status}>{x.status}</span>
      <span>{['SHIPPED','DELIVERED','CANCELLED'].map(s=><button key={s} className="link" disabled={x.status===s}
        onClick={async()=>{await api(`/admin/orders/${x.id}/status`,{method:'PATCH',body:{status:s}});orders.reload();}}>Mark {s.toLowerCase()}</button>)}</span>
    </div>)}</Status></main>;
}

export default function App(){
  return <BrowserRouter><Nav/><Routes>
    <Route path="/" element={<Home/>}/><Route path="/products/:id" element={<Product/>}/>
    <Route path="/cart" element={<Cart/>}/><Route path="/login" element={<Login/>}/>
    <Route path="/checkout" element={<Guard><Checkout/></Guard>}/>
    <Route path="/orders" element={<Guard><Orders/></Guard>}/>
    <Route path="/admin" element={<Guard admin><Admin/></Guard>}/>
    <Route path="*" element={<Navigate to="/"/>}/>
  </Routes></BrowserRouter>;
}
