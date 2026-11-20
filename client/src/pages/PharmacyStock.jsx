import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashShell from "../components/DashShell";
import api from "../api";
import "./stock.css";

const FORMS = ["Tablet", "Capsule", "Syrup", "Injection", "Cream", "Drops", "Inhaler", "Other"];
const EMPTY = { name: "", strength: "", form: "Tablet", genericName: "", price: "", quantity: "" };
const LOW = 5; // this many or fewer counts as "Low stock"

function ago(date) {
  const s = Math.max(0, (Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} days ago`;
}

function status(qty) {
  if (qty === 0) return { label: "Out of stock", cls: "no" };
  if (qty <= LOW) return { label: "Low stock", cls: "wait" };
  return { label: "In stock", cls: "ok" };
}

export default function PharmacyStock() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false); // pharmacy not verified yet
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [form, setForm] = useState(EMPTY);
  const [adding, setAdding] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [edit, setEdit] = useState({ price: "", quantity: "" });
  const [busyId, setBusyId] = useState(null);

  const handleError = useCallback((err, fallback) => {
    const code = err.response?.status;
    if (code === 401) {
      localStorage.clear();
      navigate("/login");
    } else if (code === 403) {
      setBlocked(true);
    } else if (!err.response) {
      setError("Cannot reach the server. Check that the backend is running (npm start in the server folder).");
    } else if (code === 404 && typeof err.response.data !== "object") {
      setError("The server does not have the stock feature yet. It is running old code: stop it with Ctrl+C, update the server files, then start it again with npm start.");
    } else {
      setError(err.response?.data?.error || `${fallback} (error ${code})`);
    }
  }, [navigate]);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/stock");
      setItems(data);
    } catch (err) {
      handleError(err, "Could not load your stock. Is the server running?");
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  useEffect(() => { load(); }, [load]);

  // Medicine name suggestions while typing
  useEffect(() => {
    const q = form.name.trim();
    if (q.length < 2) return undefined;
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get("/stock/suggest", { params: { q } });
        setSuggestions(data);
      } catch { setSuggestions([]); }
    }, 250);
    return () => clearTimeout(t);
  }, [form.name]);

  const hints = form.name.trim().length >= 2 ? suggestions : [];

  const onField = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // If the typed name matches a known medicine, fill in its details
  const onName = (e) => {
    const name = e.target.value;
    const match = hints.find((s) => s.name.toLowerCase() === name.trim().toLowerCase());
    if (match && !form.strength && !form.genericName) {
      setForm({ ...form, name, strength: match.strength || "", form: match.form, genericName: match.generic_name || "" });
    } else {
      setForm({ ...form, name });
    }
  };

  const flash = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(""), 3500);
  };

  const onAdd = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) return setError("Enter the medicine name.");
    if (form.price === "" || Number(form.price) < 0) return setError("Enter the price.");
    if (form.quantity === "" || !Number.isInteger(Number(form.quantity)) || Number(form.quantity) < 0) {
      return setError("Quantity must be a whole number, 0 or more.");
    }
    try {
      setAdding(true);
      await api.post("/stock", form);
      flash(`Added ${form.name.trim()}${form.strength ? " " + form.strength : ""} to your stock.`);
      setForm(EMPTY);
      await load();
    } catch (err) {
      handleError(err, "Could not add this medicine.");
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (it) => {
    setEditingId(it.id);
    setEdit({ price: String(it.price), quantity: String(it.quantity) });
    setError("");
  };

  const save = async (it, values = edit) => {
    setError("");
    const price = Number(values.price);
    const quantity = Number(values.quantity);
    if (values.price === "" || !Number.isFinite(price) || price < 0) return setError("Enter a valid price.");
    if (values.quantity === "" || !Number.isInteger(quantity) || quantity < 0) return setError("Quantity must be a whole number, 0 or more.");
    try {
      setBusyId(it.id);
      await api.put(`/stock/${it.id}`, { price, quantity });
      setEditingId(null);
      flash(`Updated ${it.name}.`);
      await load();
    } catch (err) {
      handleError(err, "Could not save the change.");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (it) => {
    if (!window.confirm(`Remove ${it.name} ${it.strength} from your stock?`)) return;
    try {
      setBusyId(it.id);
      await api.delete(`/stock/${it.id}`);
      flash(`Removed ${it.name}.`);
      await load();
    } catch (err) {
      handleError(err, "Could not remove this item.");
    } finally {
      setBusyId(null);
    }
  };

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.name.toLowerCase().includes(q) || (i.generic_name || "").toLowerCase().includes(q));
  }, [items, search]);

  const inStock = items.filter((i) => i.quantity > 0).length;

  if (blocked) {
    return (
      <DashShell tag="Pharmacy">
        <h1>Stock management</h1>
        <div className="dash-card">
          <span className="dash-badge wait">Not available yet</span>
          <p className="dash-sub" style={{ marginTop: 12 }}>You can manage stock after the admin approves your pharmacy.</p>
          <Link className="dash-btn ghost" to="/pharmacy">Check verification status</Link>
        </div>
      </DashShell>
    );
  }

  return (
    <DashShell tag="Pharmacy">
      <Link className="stk-back" to="/pharmacy">← Back to dashboard</Link>
      <h1>Stock management</h1>
      <p className="dash-sub">Keep your medicines, prices and quantities up to date. Customers will see this when they search.</p>

      <div className="dash-grid">
        <div className="dash-tile"><b>{items.length}</b><span>Medicines listed</span></div>
        <div className="dash-tile"><b>{inStock}</b><span>In stock</span></div>
        <div className="dash-tile"><b>{items.length - inStock}</b><span>Out of stock</span></div>
      </div>

      {notice && <div className="stk-notice" role="status">{notice}</div>}
      {error && <div className="stk-error" role="alert">{error}</div>}

      <form className="dash-card stk-form" onSubmit={onAdd} noValidate>
        <h2>Add a medicine</h2>
        <div className="stk-grid">
          <label>Medicine name *
            <input name="name" list="stk-suggest" value={form.name} onChange={onName} placeholder="e.g. Panadol" autoComplete="off" />
            <datalist id="stk-suggest">
              {[...new Set(hints.map((s) => s.name))].map((n) => <option key={n} value={n} />)}
            </datalist>
          </label>
          <label>Strength
            <input name="strength" value={form.strength} onChange={onField} placeholder="e.g. 500 mg" />
          </label>
          <label>Form *
            <select name="form" value={form.form} onChange={onField}>
              {FORMS.map((f) => <option key={f}>{f}</option>)}
            </select>
          </label>
          <label>Generic name
            <input name="genericName" value={form.genericName} onChange={onField} placeholder="e.g. Paracetamol" />
          </label>
          <label>Price (Rs) *
            <input name="price" type="number" min="0" step="0.01" value={form.price} onChange={onField} placeholder="0.00" />
          </label>
          <label>Quantity *
            <input name="quantity" type="number" min="0" step="1" value={form.quantity} onChange={onField} placeholder="0" />
          </label>
        </div>
        <button className="dash-btn" type="submit" disabled={adding}>{adding ? "Adding…" : "Add to my stock"}</button>
      </form>

      <div className="dash-card">
        <div className="stk-head">
          <h2>My stock</h2>
          <label className="stk-search">
            <span className="stk-sr">Search my stock</span>
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search my stock" />
          </label>
        </div>

        {loading && <p className="dash-sub">Loading…</p>}
        {!loading && !items.length && <p className="dash-sub">You have no medicines yet. Add your first one above.</p>}
        {!loading && !!items.length && !shown.length && <p className="dash-sub">No medicine matches “{search}”.</p>}

        {!!shown.length && (
          <div className="stk-scroll">
            <table className="stk-table">
              <thead>
                <tr><th>Medicine</th><th>Price (Rs)</th><th>Quantity</th><th>Status</th><th>Updated</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {shown.map((it) => {
                  const st = status(it.quantity);
                  const editing = editingId === it.id;
                  return (
                    <tr key={it.id}>
                      <td>
                        <b>{it.name}</b> {it.strength} <span className="stk-form-tag">{it.form}</span>
                        {it.generic_name && <div className="stk-generic">{it.generic_name}</div>}
                      </td>
                      <td>
                        {editing
                          ? <input className="stk-num" type="number" min="0" step="0.01" aria-label={`Price for ${it.name}`} value={edit.price} onChange={(e) => setEdit({ ...edit, price: e.target.value })} />
                          : it.price.toFixed(2)}
                      </td>
                      <td>
                        {editing
                          ? <input className="stk-num" type="number" min="0" step="1" aria-label={`Quantity for ${it.name}`} value={edit.quantity} onChange={(e) => setEdit({ ...edit, quantity: e.target.value })} />
                          : it.quantity}
                      </td>
                      <td><span className={`dash-badge ${st.cls}`}>{st.label}</span></td>
                      <td className="stk-time">{ago(it.updated_at)}</td>
                      <td>
                        <div className="stk-actions">
                          {editing ? (
                            <>
                              <button className="stk-btn primary" disabled={busyId === it.id} onClick={() => save(it)}>Save</button>
                              <button className="stk-btn" onClick={() => setEditingId(null)}>Cancel</button>
                            </>
                          ) : (
                            <>
                              <button className="stk-btn" onClick={() => startEdit(it)}>Edit</button>
                              {it.quantity > 0 && (
                                <button className="stk-btn" disabled={busyId === it.id} onClick={() => save(it, { price: it.price, quantity: 0 })}>Out of stock</button>
                              )}
                              <button className="stk-btn danger" disabled={busyId === it.id} onClick={() => remove(it)}>Remove</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashShell>
  );
}
