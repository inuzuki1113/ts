const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
const rateLimit = require('express-rate-limit');


const app = express();
const PORT = process.env.PORT || 3000;


// セキュリティ・ログ関連
app.use(helmet());
app.use(express.json());
app.use(cors());
app.use(morgan('tiny'));


// レート制限（過剰アクセス防止）
app.use(rateLimit({
windowMs: 60 * 1000,
max: 100,
standardHeaders: true,
legacyHeaders: false,
}));


// ヘルスチェック
app.get('/healthz', (req, res) => res.json({ ok: true, ts: Date.now() }));


// プロキシ機能（どのホストでもOK）
app.use('/proxy', (req, res, next) => {
const target = req.query.target || req.body?.target;
if (!target) return res.status(400).json({ error: 'missing target' });


try {
const proxy = createProxyMiddleware({
target,
changeOrigin: true,
timeout: 10000,
proxyTimeout: 10000,
onError(err, req, res) {
console.error('Proxy error:', err.message);
if (!res.headersSent)
res.status(502).json({ error: 'proxy error', message: err.message });
},
});


proxy(req, res, next);
} catch (err) {
console.error('Invalid target:', err.message);
res.status(400).json({ error: 'invalid target url' });
}
});


// 404 対応
app.use((req, res) => res.status(404).json({ error: 'not found' }));


// 起動
app.listen(PORT, () => {
console.log(`✅ Proxy server running on port ${PORT}`);
});
