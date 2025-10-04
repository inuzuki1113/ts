import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import NodeCache from "node-cache";

const app = express();
const cache = new NodeCache({ stdTTL: 30 }); // キャッシュ30秒
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// キャッシュ付きプロキシ
app.use("/proxy", async (req, res) => {
  const target = req.query.target;
  if (!target) return res.status(400).send("Missing target URL");

  const cacheKey = `${req.method}:${target}:${JSON.stringify(req.body || {})}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    console.log(`Cache hit for ${target}`);
    return res.send(cached);
  }

  try {
    const options = {
      method: req.method,
      headers: { "Content-Type": "application/json" },
      body: req.method === "POST" ? JSON.stringify(req.body) : undefined,
    };

    const response = await fetch(target, options);
    const text = await response.text();
    cache.set(cacheKey, text);
    res.send(text);
  } catch (err) {
    res.status(500).send(`Error: ${err.message}`);
  }
});

app.get("/", (req, res) => {
  res.send("✅ Proxy server is running on Render!");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
