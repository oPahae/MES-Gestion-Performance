import { query } from "../../../lib/db";

export default async function handler(req, res) {
  try {
    await query("SELECT * FROM users LIMIT 1");
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}