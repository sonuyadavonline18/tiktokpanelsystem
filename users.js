// ===== TIKTOK USER DATABASE (popular users for instant default list) =====
const TIKTOK_USERS = [
  {id:"charlidamelio",name:"Charli D'Amelio",handle:"@charlidamelio",followers:"155.2M",verified:true,color:"#fe2c55"},
  {id:"khaby.lame",name:"Khabane Lame",handle:"@khaby.lame",followers:"162.5M",verified:true,color:"#00f2ea"},
  {id:"bellapoarch",name:"Bella Poarch",handle:"@bellapoarch",followers:"93.6M",verified:true,color:"#9b59b6"},
  {id:"addisonre",name:"Addison Rae",handle:"@addisonre",followers:"88.9M",verified:true,color:"#e91e63"},
  {id:"zachking",name:"Zach King",handle:"@zachking",followers:"81.2M",verified:true,color:"#ff9800"},
  {id:"mrbeast",name:"MrBeast",handle:"@mrbeast",followers:"45.3M",verified:true,color:"#4caf50"},
  {id:"therock",name:"Dwayne Johnson",handle:"@therock",followers:"74.1M",verified:true,color:"#795548"},
  {id:"selenagomez",name:"Selena Gomez",handle:"@selenagomez",followers:"58.7M",verified:true,color:"#e91e63"},
  {id:"cristiano",name:"Cristiano Ronaldo",handle:"@cristiano",followers:"62.3M",verified:true,color:"#4caf50"},
  {id:"billieeilish",name:"Billie Eilish",handle:"@billieeilish",followers:"41.7M",verified:true,color:"#4caf50"},
];

// ===== TIKTOK USER CACHE =====
const _tiktokCache = new Map();

// Auto-detect environment for API URLs
const _isNetlify = location.hostname.includes('netlify.app');
const _apiUserUrl = _isNetlify
  ? '/.netlify/functions/tiktok-user?username='
  : '/api/tiktok/user/';
const _apiAvatarUrl = _isNetlify
  ? '/.netlify/functions/tiktok-avatar?username='
  : '/api/tiktok/avatar/';

// Fetch ANY TikTok user via serverless API
async function fetchTikTokUser(username) {
  const clean = username.replace(/[$@\s]/g, '').toLowerCase();
  if (!clean || clean.length < 2) return null;
  if (_tiktokCache.has(clean)) return _tiktokCache.get(clean);

  try {
    const resp = await fetch(_apiUserUrl + encodeURIComponent(clean));
    const data = await resp.json();
    if (data.found) {
      const user = {
        id: data.id,
        name: data.name,
        handle: data.handle,
        followers: data.followers,
        verified: data.verified,
        avatar: _apiAvatarUrl + data.id,
        color: _hashColor(data.id),
        real: true
      };
      _tiktokCache.set(clean, user);
      return user;
    }
    return null;
  } catch (e) {
    return null;
  }
}

const _colors = ["#fe2c55","#00f2ea","#9b59b6","#e91e63","#ff9800","#2196f3","#4caf50","#00bcd4","#e040fb","#ff5722","#7c4dff","#f44336","#795548","#ffc107","#00e676","#ff4081"];
function _hashColor(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return _colors[Math.abs(h) % _colors.length];
}

// Background avatar loader
function loadAvatarsForVisible() {
  document.querySelectorAll('[data-tiktok-id]').forEach(el => {
    const uid = el.dataset.tiktokId;
    if (!uid || el.dataset.loaded === 'true') return;
    const cached = _tiktokCache.get(uid);
    if (cached && cached.avatar) {
      const img = el.querySelector('.tt-avatar-img');
      if (img) { img.src = cached.avatar; el.dataset.loaded = 'true'; }
    }
  });
}

// ===== SEARCH =====
function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// Instant local search (for popular users list)
function searchUsersLocal(query) {
  const q = query.toLowerCase().replace(/[$@]/g, '').trim();
  if (!q) return [];
  return TIKTOK_USERS.filter(u =>
    u.id.includes(q) || u.name.toLowerCase().includes(q) || u.handle.toLowerCase().includes(q)
  ).slice(0, 10);
}

function findUser(id) {
  return TIKTOK_USERS.find(u => u.id === id) || _tiktokCache.get(id) || { id, name: id, handle: '@' + id, followers: '', verified: false, color: '#7c4dff' };
}
