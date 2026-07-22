import { IncomingForm } from "formidable";

export function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({ multiples: true, keepExtensions: true });
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

export function fieldVal(fields, key, fallback = "") {
  const v = fields[key];
  if (v === undefined || v === null) return fallback;
  return Array.isArray(v) ? v[0] : v;
}

export function fileVal(files, key) {
  const f = files[key];
  if (!f) return null;
  return Array.isArray(f) ? f[0] : f;
}