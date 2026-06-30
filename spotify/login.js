const SCOPES = "user-read-currently-playing user-read-playback-state";

function getBaseUrl(req) {
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || "https";
  return `${proto}://${host}`;
}

export default function handler(req, res) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;

  if (!clientId) {
    return res.status(500).send("Missing SPOTIFY_CLIENT_ID");
  }

  const redirectUri = `${getBaseUrl(req)}/api/spotify/callback`;
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: SCOPES,
    redirect_uri: redirectUri,
  });

  return res.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
}
