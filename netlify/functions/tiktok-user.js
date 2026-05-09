const https = require('https');

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
      timeout: 8000
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchJSON(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function formatFollowers(count) {
  if (!count || count === 0) return '0';
  if (count >= 1e9) return (count / 1e9).toFixed(1) + 'B';
  if (count >= 1e6) return (count / 1e6).toFixed(1) + 'M';
  if (count >= 1e3) return (count / 1e3).toFixed(1) + 'K';
  return count.toString();
}

exports.handler = async (event) => {
  const username = (event.queryStringParameters.username || '').replace(/[@$\s]/g, '').toLowerCase().trim();

  if (!username || username.length < 2) {
    return { statusCode: 400, body: JSON.stringify({ found: false }) };
  }

  try {
    const json = await fetchJSON(`https://www.tikwm.com/api/user/info?unique_id=${encodeURIComponent(username)}`);

    if (json.code === 0 && json.data && json.data.user) {
      const u = json.data.user;
      const stats = json.data.stats || {};

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
        body: JSON.stringify({
          found: true,
          id: u.uniqueId || username,
          name: u.nickname || username,
          handle: '@' + (u.uniqueId || username),
          avatar: u.avatarMedium || u.avatarThumb || u.avatarLarger || '',
          followers: formatFollowers(stats.followerCount || 0),
          verified: u.verified || false,
          bio: u.signature || '',
          following: formatFollowers(stats.followingCount || 0),
          likes: formatFollowers(stats.heartCount || 0),
          videos: stats.videoCount || 0
        })
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ found: false, username })
    };
  } catch (err) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ found: false, username, error: err.message })
    };
  }
};
