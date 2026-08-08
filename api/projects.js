// 案件の保存・読み込みを GAS Web アプリへ中継する。
//
// 共有トークンをブラウザに渡さないための層。ブラウザに配る JS に書けば公開されるので、
// トークンは必ずこちら側の環境変数に置く。ブラウザの通信相手が同一オリジンになるため、
// CORS のプリフライトも発生しない。

const ALLOWED_ACTIONS = ["list", "get", "create", "update", "startGeneration", "uploadFile"];

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const webappUrl = process.env.GAS_WEBAPP_URL;
  const sharedToken = process.env.GAS_SHARED_TOKEN;
  if (!webappUrl || !sharedToken) {
    return res.status(500).json({
      error: "案件保存の設定が未完了です（GAS_WEBAPP_URL / GAS_SHARED_TOKEN が未設定）",
    });
  }

  const { action, ...payload } = req.body || {};
  if (!ALLOWED_ACTIONS.includes(action)) {
    return res.status(400).json({ error: "action が不正です: " + action });
  }

  try {
    // GAS 側は postData.contents を自前で JSON.parse するため、
    // Content-Type は text/plain で問題ない（プリフライト回避の定石でもある）
    const response = await fetch(webappUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ ...payload, action, token: sharedToken }),
      redirect: "follow",
    });

    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      // GAS が HTML のエラーページやログイン画面を返した場合
      return res.status(502).json({
        error: "GASの応答がJSONではありません。デプロイ設定（アクセスできるユーザー）を確認してください。",
        raw: text.slice(0, 300),
      });
    }

    if (data.error) {
      const status = data.error === "unauthorized" ? 403 : 400;
      return res.status(status).json(data);
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message || "サーバーエラー" });
  }
}
