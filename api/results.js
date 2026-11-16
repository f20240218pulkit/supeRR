import { createHash, timingSafeEqual } from "node:crypto";

const digest = (value) => createHash("sha256").update(value).digest();
const error = (res, status, message) => res.status(status).json({ message });

export default function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Vary", "Authorization");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return error(res, 405, "Use the access form.");
  }
  const code = process.env.RR_ACCESS_CODE;
  const payload = process.env.RR_RESULTS_JSON;
  if (!code || code.length < 24 || !payload) {
    return error(res, 503, "Judge data has not been configured.");
  }
  const header = req.headers.authorization;
  if (typeof header !== "string" || header.length > 256 ||
      !timingSafeEqual(digest(header), digest(`Bearer ${code}`))) {
    return error(res, 401, "The access code was not accepted.");
  }
  try {
    const data = JSON.parse(payload);
    if (data.schema !== 1 || data.kind !== "submission" || !data.batting || !data.bowling) {
      return error(res, 503, "Judge data has not been configured.");
    }
    return res.status(200).json(data);
  } catch {
    return error(res, 503, "Judge data has not been configured.");
  }
}
