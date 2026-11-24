export default function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const accessCode = process.env.ACCESS_CODE;
  if (!accessCode || req.headers["x-access-code"] !== accessCode) {
    res.status(401).json({ error: "Invalid access code." });
    return;
  }

  res.status(200).json({ ok: true });
}
