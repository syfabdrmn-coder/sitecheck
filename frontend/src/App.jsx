import { useEffect, useState } from "react";
import { api, API_URL } from "./api.js";

const CATEGORIES = ["safety", "structural", "electrical", "plumbing"];
const emptySite = { name: "", location: "", contractor: "" };
const today = () => new Date().toISOString().slice(0, 10);
const emptyInspection = () => ({ inspector: "", category: "safety", result: "pass", notes: "", inspected_on: today() });

function formatDate(value) {
  return new Date(value + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export default function App() {
  const [sites, setSites] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [inspections, setInspections] = useState([]);
  const [siteForm, setSiteForm] = useState(emptySite);
  const [inspectionForm, setInspectionForm] = useState(emptyInspection);
  const [loading, setLoading] = useState(true);
  const [apiOnline, setApiOnline] = useState(null);
  const [error, setError] = useState("");

  const selected = sites.find((s) => s.id === selectedId) || null;

  async function loadSites() {
    const data = await api.listSites();
    setSites(data);
    return data;
  }

  useEffect(() => {
    loadSites()
      .then((data) => {
        setApiOnline(true);
        if (data.length > 0) setSelectedId(data[0].id);
      })
      .catch((e) => {
        setApiOnline(false);
        setError(`Could not reach the API at ${API_URL}: ${e.message}`);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedId == null) {
      setInspections([]);
      return;
    }
    api.listInspections(selectedId).then(setInspections).catch((e) => setError(e.message));
  }, [selectedId]);

  async function addSite(e) {
    e.preventDefault();
    if (!siteForm.name.trim() || !siteForm.location.trim()) {
      setError("A site needs a name and a location.");
      return;
    }
    try {
      const created = await api.createSite(siteForm);
      await loadSites();
      setSelectedId(created.id);
      setSiteForm(emptySite);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }

  async function removeSite(site) {
    if (!window.confirm(`Delete "${site.name}" and all its inspections?`)) return;
    try {
      await api.deleteSite(site.id);
      const data = await loadSites();
      setSelectedId(data.length > 0 ? data[0].id : null);
    } catch (e) {
      setError(e.message);
    }
  }

  async function addInspection(e) {
    e.preventDefault();
    if (!inspectionForm.inspector.trim()) {
      setError("Enter the inspector's name.");
      return;
    }
    try {
      await api.createInspection(selectedId, inspectionForm);
      setInspections(await api.listInspections(selectedId));
      await loadSites();
      setInspectionForm(emptyInspection());
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }

  async function removeInspection(inspection) {
    if (!window.confirm("Delete this inspection?")) return;
    try {
      await api.deleteInspection(inspection.id);
      setInspections((prev) => prev.filter((i) => i.id !== inspection.id));
      await loadSites();
    } catch (e) {
      setError(e.message);
    }
  }

  const totals = sites.reduce(
    (acc, s) => ({ inspections: acc.inspections + s.inspection_count, failed: acc.failed + s.failed_count }),
    { inspections: 0, failed: 0 }
  );

  return (
    <div className="page">
      <header className="header">
        <div>
          <p className="eyebrow">Construction QA</p>
          <h1>SiteCheck</h1>
          <p className="muted">Log inspections for every construction site, and spot failures early.</p>
        </div>
        <div className="stats">
          <Stat label="Sites" value={sites.length} />
          <Stat label="Inspections" value={totals.inspections} />
          <Stat label="Failed" value={totals.failed} tone="fail" />
        </div>
      </header>

      {error && (
        <div className="error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setError("")} aria-label="Dismiss">×</button>
        </div>
      )}

      <main className="layout">
        <aside className="sidebar">
          <form className="card stack" onSubmit={addSite}>
            <h2>Add a site</h2>
            <input placeholder="Site name" value={siteForm.name} onChange={(e) => setSiteForm({ ...siteForm, name: e.target.value })} />
            <input placeholder="Location (e.g. Kuching)" value={siteForm.location} onChange={(e) => setSiteForm({ ...siteForm, location: e.target.value })} />
            <input placeholder="Contractor (optional)" value={siteForm.contractor} onChange={(e) => setSiteForm({ ...siteForm, contractor: e.target.value })} />
            <button className="primary">Add site</button>
          </form>

          <div className="site-list">
            {loading && <p className="muted">Loading sites…</p>}
            {!loading && sites.length === 0 && apiOnline && (
              <p className="muted">No sites yet. Add one above, or run database/seed.sql in pgAdmin.</p>
            )}
            {sites.map((site) => (
              <button
                type="button"
                key={site.id}
                className={`site ${site.id === selectedId ? "active" : ""}`}
                onClick={() => setSelectedId(site.id)}
              >
                <span className="site-name">{site.name}</span>
                <span className="site-meta">
                  {site.location} · {site.inspection_count} inspection{site.inspection_count === 1 ? "" : "s"}
                  {site.failed_count > 0 && <span className="fail-dot"> · {site.failed_count} failed</span>}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="detail">
          {!selected ? (
            <div className="card empty">Select or add a site to see its inspections.</div>
          ) : (
            <>
              <div className="card site-header">
                <div>
                  <h2>{selected.name}</h2>
                  <p className="muted">
                    {selected.location}
                    {selected.contractor && ` · ${selected.contractor}`}
                  </p>
                </div>
                <button type="button" className="danger" onClick={() => removeSite(selected)}>Delete site</button>
              </div>

              <form className="card inspection-form" onSubmit={addInspection}>
                <h3>New inspection</h3>
                <div className="grid">
                  <label>
                    Inspector
                    <input value={inspectionForm.inspector} onChange={(e) => setInspectionForm({ ...inspectionForm, inspector: e.target.value })} placeholder="Full name" />
                  </label>
                  <label>
                    Date
                    <input type="date" value={inspectionForm.inspected_on} onChange={(e) => setInspectionForm({ ...inspectionForm, inspected_on: e.target.value })} />
                  </label>
                  <label>
                    Category
                    <select value={inspectionForm.category} onChange={(e) => setInspectionForm({ ...inspectionForm, category: e.target.value })}>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Result
                    <div className="toggle">
                      {["pass", "fail"].map((r) => (
                        <button
                          type="button"
                          key={r}
                          className={inspectionForm.result === r ? `active ${r}` : ""}
                          onClick={() => setInspectionForm({ ...inspectionForm, result: r })}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </label>
                </div>
                <label>
                  Notes
                  <textarea rows={2} value={inspectionForm.notes} onChange={(e) => setInspectionForm({ ...inspectionForm, notes: e.target.value })} placeholder="What was checked, what was found" />
                </label>
                <button className="primary">Save inspection</button>
              </form>

              <div className="card">
                <h3>Inspection history</h3>
                {inspections.length === 0 ? (
                  <p className="muted">No inspections for this site yet.</p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Category</th>
                        <th>Inspector</th>
                        <th>Result</th>
                        <th>Notes</th>
                        <th aria-label="Actions" />
                      </tr>
                    </thead>
                    <tbody>
                      {inspections.map((i) => (
                        <tr key={i.id}>
                          <td className="nowrap">{formatDate(i.inspected_on)}</td>
                          <td className="cap">{i.category}</td>
                          <td>{i.inspector}</td>
                          <td><span className={`badge ${i.result}`}>{i.result}</span></td>
                          <td className="notes">{i.notes}</td>
                          <td>
                            <button type="button" className="link-danger" onClick={() => removeInspection(i)} aria-label="Delete inspection">Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </section>
      </main>

      <footer className="footer">
        <span className={`dot ${apiOnline ? "on" : apiOnline === false ? "off" : ""}`} />
        API: <code>{API_URL}</code>
      </footer>
    </div>
  );
}

function Stat({ label, value, tone = "" }) {
  return (
    <div className={`stat ${tone}`}>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}
