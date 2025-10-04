import express from "express";
import axios from "axios";
import NodeCache from "node-cache";

const app = express();
const cache = new NodeCache({ stdTTL: 60 }); // 60秒キャッシュ
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "5mb" }));
app.use(express.static("public"));

// ✅ 全CORS許可（ブラウザからも直接OK）
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// ✅ プロキシ機能
app.all("/proxy", async (req, res) => {
  const target = req.query.url || req.body.url;
  if (!target) return res.status(400).json({ error: "Missing 'url' parameter" });

  const cacheKey = `${req.method}-${target}-${JSON.stringify(req.body)}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json({ fromCache: true, data: cached });

  try {
    const response = await axios({
      method: req.method,
      url: target,
      data: req.body,
      headers: { "User-Agent": "RenderBrowserProxy/1.0" },
      timeout: 10000
    });
    cache.set(cacheKey, response.data);
    res.json({ fromCache: false, data: response.data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ 確認ページ
app.get("/", (req, res) => {
  res.sendFile("index.html", { root: "public" });
});

app.listen(PORT, () => console.log(`✅ Proxy server running on ${PORT}`));
