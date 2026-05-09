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

function fetchImage(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 8000
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchImage(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error('not found'));
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({
        buffer: Buffer.concat(chunks),
        contentType: res.headers['content-type'] || 'image/webp'
      }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

exports.handler = async (event) => {
  const username = (event.queryStringParameters.username || '').replace(/[@$\s]/g, '').toLowerCase().trim();

  if (!username || username.length < 2) {
    return { statusCode: 404, body: '' };
  }

  try {
    const json = await fetchJSON(`https://www.tikwm.com/api/user/info?unique_id=${encodeURIComponent(username)}`);
    if (json.code === 0 && json.data && json.data.user) {
      const avatarUrl = json.data.user.avatarMedium || json.data.user.avatarThumb || '';
      if (avatarUrl) {
        const img = await fetchImage(avatarUrl);
        return {
          statusCode: 200,
          headers: {
            'Content-Type': img.contentType,
            'Cache-Control': 'public, max-age=86400'
          },
          body: img.buffer.toString('base64'),
          isBase64Encoded: true
        };
      }
    }
    return { statusCode: 404, body: '' };
  } catch(e) {
    return { statusCode: 404, body: '' };
  }
};
