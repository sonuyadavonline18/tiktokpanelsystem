const express = require('express');
const https = require('https');
const http = require('http');
const path = require('path');

const app = express();
const PORT = 3000;

// Serve static files
app.use(express.static(path.join(__dirname)));

// Cache
const userCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Fetch URL helper
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
      timeout: 8000
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchJSON(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch(e) { reject(e); }
      });
      res.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

// Pipe an image URL to response
function proxyImage(imageUrl, res) {
  const client = imageUrl.startsWith('https') ? https : http;
  const req = client.get(imageUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    timeout: 8000
  }, (imgRes) => {
    if (imgRes.statusCode >= 300 && imgRes.statusCode < 400 && imgRes.headers.location) {
      return proxyImage(imgRes.headers.location, res);
    }
    if (imgRes.statusCode !== 200) {
      return res.status(404).send('');
    }
    res.set('Content-Type', imgRes.headers['content-type'] || 'image/webp');
    res.set('Cache-Control', 'public, max-age=86400');
    res.set('Access-Control-Allow-Origin', '*');
    imgRes.pipe(res);
  });
  req.on('error', () => res.status(404).send(''));
  req.on('timeout', () => { req.destroy(); res.status(404).send(''); });
}

function formatFollowers(count) {
  if (!count || count === 0) return '0';
  if (count >= 1e9) return (count / 1e9).toFixed(1) + 'B';
  if (count >= 1e6) return (count / 1e6).toFixed(1) + 'M';
  if (count >= 1e3) return (count / 1e3).toFixed(1) + 'K';
  return count.toString();
}

// ===== API: Lookup any TikTok user =====
app.get('/api/tiktok/user/:username', async (req, res) => {
  const username = req.params.username.replace(/[@$\s]/g, '').toLowerCase().trim();
  if (!username || username.length < 2) return res.json({ found: false });

  // Check cache
  const cached = userCache.get(username);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return res.json(cached.data);
  }

  try {
    // Use tikwm.com API - fast, reliable, returns real TikTok data
    const json = await fetchJSON(`https://www.tikwm.com/api/user/info?unique_id=${encodeURIComponent(username)}`);

    if (json.code === 0 && json.data && json.data.user) {
      const u = json.data.user;
      const stats = json.data.stats || {};

      const userData = {
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
      };

      userCache.set(username, { data: userData, time: Date.now() });
      console.log(`  ✓ Found @${username}: ${userData.name} (${userData.followers} followers)`);
      return res.json(userData);
    }

    console.log(`  ✗ User @${username} not found`);
    res.json({ found: false, username });

  } catch (err) {
    console.error(`  ✗ Error fetching @${username}:`, err.message);
    res.json({ found: false, username, error: err.message });
  }
});

// ===== API: Proxy TikTok avatar image =====
app.get('/api/tiktok/avatar/:username', async (req, res) => {
  const username = req.params.username.replace(/[@$\s]/g, '').toLowerCase().trim();

  // Check cache for avatar URL
  const cached = userCache.get(username);
  if (cached && cached.data && cached.data.avatar) {
    return proxyImage(cached.data.avatar, res);
  }

  // Fetch user data first, then proxy avatar
  try {
    const json = await fetchJSON(`https://www.tikwm.com/api/user/info?unique_id=${encodeURIComponent(username)}`);
    if (json.code === 0 && json.data?.user) {
      const avatarUrl = json.data.user.avatarMedium || json.data.user.avatarThumb || '';
      if (avatarUrl) {
        // Cache it
        const u = json.data.user;
        const stats = json.data.stats || {};
        userCache.set(username, {
          data: {
            found: true, id: u.uniqueId, name: u.nickname,
            handle: '@' + u.uniqueId, avatar: avatarUrl,
            followers: formatFollowers(stats.followerCount || 0),
            verified: u.verified || false
          },
          time: Date.now()
        });
        return proxyImage(avatarUrl, res);
      }
    }
    res.status(404).send('');
  } catch(e) {
    res.status(404).send('');
  }
});

app.listen(PORT, () => {
  console.log(`\n  🎵 TikTok LIVE Rewards running at http://localhost:${PORT}`);
  console.log(`  ✅ Real TikTok profile lookup via tikwm API`);
  console.log(`  🔍 Search ANY TikTok user - real profile pics + data\n`);
});
