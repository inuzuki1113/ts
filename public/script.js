document.getElementById("send").onclick = async () => {
  const url = document.getElementById("url").value.trim();
  const body = document.getElementById("body").value.trim();
  const out = document.getElementById("out");

  if (!url) return (out.textContent = "⚠️ URLを入力してください");

  const isPost = body.length > 0;
  out.textContent = "⏳ 送信中...";

  try {
    const res = await fetch("/proxy" + (isPost ? "" : `?url=${encodeURIComponent(url)}`), {
      method: isPost ? "POST" : "GET",
      headers: { "Content-Type": "application/json" },
      body: isPost ? JSON.stringify({ url, ...JSON.parse(body || "{}") }) : undefined
    });
    const data = await res.json();
    out.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    out.textContent = "❌ エラー: " + err.message;
  }
};
