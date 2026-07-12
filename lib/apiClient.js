async function handle(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erreur réseau (${res.status})`);
  }
  return res.json();
}

export function apiGet(path) {
  return fetch(path).then(handle);
}

export function apiPost(path, body) {
  return fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(handle);
}

export function apiPut(path, body) {
  return fetch(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(handle);
}

export function apiDelete(path) {
  return fetch(path, { method: "DELETE" }).then(handle);
}
