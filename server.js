import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import NodeCache from "node-cache";

const app = express();
const cache = new NodeCache({ stdTTL: 30 });
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req,res) => res.send("✅ Proxy server running"));

app.all("/proxy", async (req,res) => {
  const target = req.query.target;
  if (!target) return res.status(400).send("Missing target");

  const cacheKey = target + JSON.stringify(req.body || {});
  const cached = cache.get(cacheKey);
  if (cached) return res.send(cached);

  try {
    const response = await fetch(target, {
      method: req.method,
      headers: { "Content-Type": "application/json" },
      body: req.method === "POST" ? JSON.stringify(req.body) : undefined
    });
    const text = await response.text();
    cache.set(cacheKey,text);
    res.send(text);
  } catch(e) {
    res.status(500).send(e.message);
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
