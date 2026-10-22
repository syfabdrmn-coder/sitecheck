// Vite replaces import.meta.env.VITE_API_URL with the value from .env when the app starts or is built.
const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (typeof body.detail === "string") message = body.detail;
      else if (Array.isArray(body.detail)) message = body.detail.map((d) => d.msg).join(", ");
    } catch {
      /* no JSON body */
    }
    throw new Error(message);
  }
  return res.status === 204 ? null : res.json();
}

export const api = {
  listSites: () => request("/api/sites"),
  createSite: (site) => request("/api/sites", { method: "POST", body: JSON.stringify(site) }),
  deleteSite: (id) => request(`/api/sites/${id}`, { method: "DELETE" }),
  listInspections: (siteId) => request(`/api/sites/${siteId}/inspections`),
  createInspection: (siteId, inspection) =>
    request(`/api/sites/${siteId}/inspections`, { method: "POST", body: JSON.stringify(inspection) }),
  deleteInspection: (id) => request(`/api/inspections/${id}`, { method: "DELETE" }),
};

export { API_URL };
