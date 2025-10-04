import express from "express";
import axios from "axios";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import NodeCache from "node-cache";

const app = express();
const PORT = process.env.PORT || 3000;

// ====== キャッシュ設定（メモリ内） ======
// TTL: 60秒（同じURLへのアクセスを高速化）
const cache = new NodeCache({ stdTTL: 60, checkperiod: 120 });

// ====== 基本設定 ======
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(morgan("dev"));
app.use(rateLimit({ windowMs: 60 * 1000, max: 100 }));

// ====== CORS（固定許可） ======
app.use(
  cors({
    origin: ["*"], // 全ドメインから許可（太鼓Webなどで使用可）
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ====== ヘルスチェック ======
app.get("/", (req, res) => {
  res.send("✅ Proxy server (with cache + POST/JSON + CORS) is running on Render!");
});

// ====== キャッシュ確認関数 ======
const checkCache = (key, res) => {
  const cached = cache.get(key);
  if (cached) {
    console.log(`⚡ Cache hit: ${key}`);
    res.set("X-Cache", "HIT");
    res.set("Content-Type", cached.contentType);
    res.send(cached.data);
    return true;
  }
  return false;
};

// ====== GET プロキシ ======
app.get("/proxy", async (req, res) => {
  const target = req.query.target;
  if (!target) return res.status(400).json({ error: "Missing target parameter" });

  const cacheKey = `GET:${target}`;
  if (checkCache(cacheKey, res)) return;

  try {
    const response = await axios.get(target, { responseType: "text", headers: req.headers });
    const contentType = response.headers["content-type"] || "text/plain";

    // キャッシュ保存
    cache.set(cacheKey, { data: response.data, contentType });

    res.set("X-Cache", "MISS");
    res.set("Content-Type", contentType);
    res.send(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ====== POST プロキシ ======
app.post("/proxy", async (req, res) => {
  const target = req.query.target;
  if (!target) return res.status(400).json({ error: "Missing target parameter" });

  const cacheKey = `POST:${target}:${JSON.stringify(req.body)}`;
  if (checkCache(cacheKey, res)) return;

  try {
    const response = await axios.post(target, req.body, {
      headers: {
        "Content-Type": req.headers["content-type"] || "application/json",
      },
    });
    const contentType = response.headers["content-type"] || "application/json";

    // キャッシュ保存
    cache.set(cacheKey, { data: response.data, contentType });

    res.set("X-Cache", "MISS");
    res.set("Content-Type", contentType);
    res.send(response.data);
  } catch (error) {
    res.status(500).json({
      error: error.message,
      details: error.response?.data || null,
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Proxy running on port ${PORT}`);
});
