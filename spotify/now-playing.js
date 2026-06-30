const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
const NOW_PLAYING_ENDPOINT = "https://api.spotify.com/v1/me/player/currently-playing";

function json(res, status, body) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=5, stale-while-revalidate=10");
  return res.status(status).json(body);
}

async function getAccessToken() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data.access_token;
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    return res.status(204).end();
  }

  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return json(res, 200, { linked: false, playing: false });
    }

    const spotifyResponse = await fetch(NOW_PLAYING_ENDPOINT, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (spotifyResponse.status === 204 || spotifyResponse.status === 404) {
      return json(res, 200, { linked: true, playing: false });
    }

    if (!spotifyResponse.ok) {
      return json(res, 200, { linked: true, playing: false });
    }

    const data = await spotifyResponse.json();
    if (!data.item) {
      return json(res, 200, { linked: true, playing: false });
    }

    return json(res, 200, {
      linked: true,
      playing: Boolean(data.is_playing),
      track: {
        title: data.item.name,
        artist: data.item.artists.map((artist) => artist.name).join(", "),
        cover: data.item.album?.images?.[0]?.url ?? "",
        url: data.item.external_urls?.spotify ?? "",
        duration_ms: data.item.duration_ms ?? 0,
        progress_ms: data.progress_ms ?? 0,
      },
    });
  } catch {
    return json(res, 200, { linked: true, playing: false });
  }
}
