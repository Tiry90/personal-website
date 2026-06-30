const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";

function getBaseUrl(req) {
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || "https";
  return `${proto}://${host}`;
}

export default async function handler(req, res) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const code = req.query.code;

  if (!clientId || !clientSecret) {
    return res.status(500).send("Missing Spotify environment variables.");
  }

  if (!code) {
    return res.status(400).send("Missing Spotify authorization code.");
  }

  const redirectUri = `${getBaseUrl(req)}/api/spotify/callback`;

  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    return res.status(500).send(`Spotify token exchange failed: ${text}`);
  }

  const data = await response.json();
  const refreshToken = data.refresh_token;

  if (!refreshToken) {
    return res.status(500).send("Spotify did not return a refresh token.");
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.status(200).send(`
    <main style="font-family: system-ui; max-width: 760px; margin: 48px auto; line-height: 1.5;">
      <h1>Spotify connected</h1>
      <p>Copy this value into your Vercel environment variables as <strong>SPOTIFY_REFRESH_TOKEN</strong>.</p>
      <pre style="white-space: pre-wrap; word-break: break-all; padding: 16px; border-radius: 12px; background: #111; color: #8ef;">${refreshToken}</pre>
      <p>After saving the variable, redeploy the site and open <code>/api/spotify/now-playing</code> to test it.</p>
    </main>
  `);
}
