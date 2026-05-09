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

function proxyImage(imageUrl, res) {
  return new Promise((resolve, reject) => {
    const req = https.get(imageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 8000
    }, (imgRes) => {
      if (imgRes.statusCode >= 300 && imgRes.statusCode < 400 && imgRes.headers.location) {
        return proxyImage(imgRes.headers.location, res).then(resolve).catch(reject);
      }
      if (imgRes.statusCode !== 200) {
        res.status(404).send('');
        return resolve();
      }
      res.setHeader('Content-Type', imgRes.headers['content-type'] || 'image/webp');
      res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate');
      res.setHeader('Access-Control-Allow-Origin', '*');
      imgRes.pipe(res);
      imgRes.on('end', resolve);
    });
    req.on('error', () => { res.status(404).send(''); resolve(); });
    req.on('timeout', () => { req.destroy(); res.status(404).send(''); resolve(); });
  });
}

module.exports = async (req, res) => {
  const parts = req.url.split('/');
  const username = (parts[parts.length - 1] || '').replace(/[@$\s]/g, '').toLowerCase().trim().split('?')[0];

  if (!username || username.length < 2) {
    return res.status(404).send('');
  }

  try {
    const json = await fetchJSON(`https://www.tikwm.com/api/user/info?unique_id=${encodeURIComponent(username)}`);
    if (json.code === 0 && json.data?.user) {
      const avatarUrl = json.data.user.avatarMedium || json.data.user.avatarThumb || '';
      if (avatarUrl) {
        return await proxyImage(avatarUrl, res);
      }
    }
    res.status(404).send('');
  } catch(e) {
    res.status(404).send('');
  }
};
