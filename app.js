// ===== APP STATE =====
const state = {
  balance: 20000000,
  selectedUser: null,
  amount: '',
  transactions: [],
  currentStep: 1
};

// ===== DOM REFS =====
const $ = id => document.getElementById(id);
const splash = $('splashScreen');
const app = $('app');
const searchPanel = $('searchPanel');
const searchInput = $('searchInput');
const searchResults = $('searchResults');
const searchClear = $('searchClear');
const sendModal = $('sendModal');
const sendSearchInput = $('sendSearchInput');
const sendUserResults = $('sendUserResults');
const amountValue = $('amountValue');
const payBtn = $('payBtn');
const txList = $('transactionsList');
const liveFeed = $('liveFeed');

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  updateTime();
  setInterval(updateTime, 30000);
  seedTransactions();
  renderTransactions();
  startLiveFeed();

  setTimeout(() => {
    splash.classList.add('fade-out');
    app.classList.remove('hidden');
    setTimeout(() => splash.style.display = 'none', 500);
  }, 1800);

  bindEvents();
});

function updateTime() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  $('statusTime').textContent = `${h}:${m}`;
}

// ===== SEED DATA =====
function seedTransactions() {
  const u = id => TIKTOK_USERS.find(x=>x.id===id) || {id,name:id,handle:'@'+id,followers:'',verified:false,color:'#7c4dff'};
  const txData = [
    {user: u('charlidamelio'), amount: 50000, type:'sent', time:'2m ago', note:'🎁 LIVE Gift'},
    {user: u('selenagomez'), amount: 5000, type:'sent', time:'5m ago', note:'Payment'},
    {user: u('mrbeast'), amount: 805000, type:'received', time:'12m ago', note:'Pool reward 🏆'},
    {user: u('cristiano'), amount: 50000, type:'sent', time:'1h ago', note:'🎁 Rose'},
    {user: u('billieeilish'), amount: 100000, type:'received', time:'2h ago', note:'Challenge prize'},
    {user: u('therock'), amount: 2500, type:'sent', time:'3h ago', note:'🎁 Lion'},
    {user: u('kyliejenner'), amount: 15000, type:'sent', time:'4h ago', note:'Joined from link'},
    {user: u('bellapoarch'), amount: 75000, type:'sent', time:'5h ago', note:'🎁 Universe'},
    {user: u('zachking'), amount: 30000, type:'received', time:'6h ago', note:'Collab payment'},
    {user: u('addisonre'), amount: 45000, type:'sent', time:'8h ago', note:'🎁 Galaxy'},
  ];
  state.transactions = txData;
}

function findUser(id) {
  return TIKTOK_USERS.find(u => u.id === id) || _tiktokCache.get(id) || { id, name: id, handle: '@'+id, followers: '', verified: false, color: '#7c4dff' };
}

// ===== AVATAR HELPER =====
function avatarHTML(user, size, cls) {
  const s = size || 44;
  const initials = getInitials(user.name);
  const cachedUser = _tiktokCache.get(user.id);
  const avatarUrl = user.avatar || (cachedUser && cachedUser.avatar) || '';
  return `<div class="${cls||'tx-avatar'}" data-tiktok-id="${user.id}" style="background:${user.color};width:${s}px;height:${s}px;min-width:${s}px;min-height:${s}px;position:relative;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center">
    <span style="font-weight:800;font-size:${Math.round(s*0.36)}px;color:#fff;z-index:1">${initials}</span>
    <img class="tt-avatar-img" src="${avatarUrl}" alt="" style="position:absolute;inset:0;width:100%;height:100%;border-radius:50%;object-fit:cover;opacity:${avatarUrl?'1':'0'};transition:opacity .3s ease;z-index:2" onload="if(this.src)this.style.opacity='1'" onerror="this.style.opacity='0'">
  </div>`;
}

// ===== RENDER =====
function renderTransactions() {
  txList.innerHTML = state.transactions.map(tx => {
    const u = tx.user;
    return `<div class="tx-item">
      ${avatarHTML(u, 44, 'tx-avatar')}
      <div class="tx-info">
        <div class="tx-name">${u.name}${u.verified ? ' <svg width="14" height="14" viewBox="0 0 24 24" fill="#00f2ea"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>' : ''}</div>
        <div class="tx-desc">${tx.note}</div>
      </div>
      <div>
        <div class="tx-amount ${tx.type}">${tx.type==='sent'?'- ':'+'}$${formatNum(tx.amount)}</div>
        <div class="tx-time">${tx.time}</div>
      </div>
    </div>`;
  }).join('');
  // Background load real TikTok avatars
  setTimeout(loadAvatarsForVisible, 50);
}

function renderUserItem(user, idx) {
  const delay = typeof idx === 'number' ? idx * 30 : 0;
  return `<div class="search-result-item" data-userid="${user.id}" style="animation:resultIn .25s ease ${delay}ms both">
    ${avatarHTML(user, 48, 'sr-avatar')}
    <div class="sr-info">
      <div class="sr-name">${user.name} ${user.verified ? '<svg class="verified" width="16" height="16" viewBox="0 0 24 24" fill="#00f2ea"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>' : ''}</div>
      <div class="sr-handle">${user.handle}</div>
    </div>
    <div class="sr-followers">${user.followers}</div>
  </div>`;
}

// ===== LIVE FEED =====
const feedMessages = [
  {type:'join',templates:['joined the stream','is here! 👋','just arrived']},
  {type:'gift',templates:['sent a 🌹 Rose','sent a 🦁 Lion','sent a 🌍 Universe','sent a 💎 Diamond','sent a 🚀 Rocket']},
  {type:'comment',templates:['🔥🔥🔥','pay me please!','this is amazing','love this stream','goat 🐐','W stream','send me $$$','❤️❤️❤️']},
  {type:'pay',templates:['sent $','tipped $','paid $']}
];
const feedUsers = TIKTOK_USERS.slice(0, 20);
let feedInterval;

function startLiveFeed() {
  addFeedItem();
  feedInterval = setInterval(addFeedItem, 2500 + Math.random() * 2000);
}

function addFeedItem() {
  const user = feedUsers[Math.floor(Math.random()*feedUsers.length)];
  const type = feedMessages[Math.floor(Math.random()*feedMessages.length)];
  const template = type.templates[Math.floor(Math.random()*type.templates.length)];
  const initials = getInitials(user.name);

  let html = '';
  if (type.type === 'pay') {
    const amt = [5,10,25,50,100,500,1000,5000][Math.floor(Math.random()*8)];
    html = `<strong>${user.name}</strong> <span class="highlight">${template}${formatNum(amt)}</span>`;
  } else if (type.type === 'gift') {
    html = `<strong>${user.name}</strong> ${template}`;
  } else if (type.type === 'join') {
    html = `<strong>${user.name}</strong> <span class="pink">${template}</span>`;
  } else {
    html = `<strong>${user.name}</strong>: ${template}`;
  }

  const item = document.createElement('div');
  item.className = 'feed-item';
  item.innerHTML = `<div class="feed-avatar" style="background:${user.color}">${initials}</div><div class="feed-text">${html}</div>`;

  liveFeed.prepend(item);
  if (liveFeed.children.length > 20) liveFeed.lastChild.remove();

  // Update viewer count
  const vc = $('liveViewers');
  const current = parseInt(vc.textContent.replace(/,/g,''));
  const delta = Math.floor(Math.random()*50) - 20;
  vc.textContent = formatNum(Math.max(15000, current + delta));
}

// ===== EVENTS =====
function bindEvents() {
  // Search toggle
  $('searchToggle').addEventListener('click', () => {
    searchPanel.classList.add('open');
    setTimeout(() => searchInput.focus(), 350);
  });
  $('searchClose').addEventListener('click', () => {
    searchPanel.classList.remove('open');
    searchInput.value = '';
    searchResults.innerHTML = '<div class="search-hint"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg><p>Search for TikTok users to send rewards</p></div>';
  });

  // Search input - always fetches from real TikTok
  let searchTimer = null;
  searchInput.addEventListener('input', e => {
    clearTimeout(searchTimer);
    const q = e.target.value.trim();
    searchClear.classList.toggle('hidden', !q);
    if (!q) {
      searchResults.innerHTML = '<div class="search-hint"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg><p>Search any TikTok username</p></div>';
      return;
    }
    // Show local matches instantly
    const local = searchUsersLocal(q);
    if (local.length > 0) {
      searchResults.innerHTML = local.map((u,i) => renderUserItem(u,i)).join('');
      bindSearchResultClicks(searchResults);
      setTimeout(loadAvatarsForVisible, 50);
    } else {
      searchResults.innerHTML = '<div class="search-hint"><div class="search-loading"></div><p>Looking up @' + q + ' on TikTok...</p></div>';
    }
    // Always fetch from TikTok API after short delay
    searchTimer = setTimeout(async () => {
      const user = await fetchTikTokUser(q);
      if (searchInput.value.trim().replace(/[$@]/g,'').toLowerCase() !== q.replace(/[$@]/g,'').toLowerCase()) return;
      if (user) {
        const merged = [user, ...local.filter(l => l.id !== user.id)];
        searchResults.innerHTML = merged.map((u,i) => renderUserItem(u,i)).join('');
        bindSearchResultClicks(searchResults);
        setTimeout(loadAvatarsForVisible, 50);
      } else if (local.length === 0) {
        searchResults.innerHTML = '<div class="search-hint"><p>@' + q + ' not found on TikTok</p></div>';
      }
    }, 300);
  });

  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchInput.focus();
    searchClear.classList.add('hidden');
  });

  // Search result clicks -> open send modal
  function bindSearchResultClicks(container) {
    container.querySelectorAll('.search-result-item').forEach(el => {
      el.addEventListener('click', () => {
        const user = findUser(el.dataset.userid);
        if (user) {
          searchPanel.classList.remove('open');
          openSendModal(user);
        }
      });
    });
  }

  // Send money button
  $('sendMoneyBtn').addEventListener('click', () => openSendModal(null));
  $('fabSend').addEventListener('click', () => openSendModal(null));
  $('requestBtn').addEventListener('click', () => openSendModal(null));
  $('giftBtn').addEventListener('click', () => openSendModal(null));

  // Close send modal
  $('sendModalClose').addEventListener('click', closeSendModal);

  // Send modal search - always fetches from real TikTok
  let sendSearchTimer = null;
  sendSearchInput.addEventListener('input', e => {
    clearTimeout(sendSearchTimer);
    const q = e.target.value.trim();
    if (!q) { renderDefaultSendUsers(); return; }
    const local = searchUsersLocal(q);
    if (local.length > 0) {
      sendUserResults.innerHTML = local.map((u,i) => renderUserItem(u,i)).join('');
      bindSendUserClicks();
      setTimeout(loadAvatarsForVisible, 50);
    } else {
      sendUserResults.innerHTML = '<div class="search-hint"><div class="search-loading"></div><p>Looking up @' + q + ' on TikTok...</p></div>';
    }
    sendSearchTimer = setTimeout(async () => {
      const user = await fetchTikTokUser(q);
      if (sendSearchInput.value.trim().replace(/[$@]/g,'').toLowerCase() !== q.replace(/[$@]/g,'').toLowerCase()) return;
      if (user) {
        const merged = [user, ...local.filter(l => l.id !== user.id)];
        sendUserResults.innerHTML = merged.map((u,i) => renderUserItem(u,i)).join('');
        bindSendUserClicks();
        setTimeout(loadAvatarsForVisible, 50);
      } else if (local.length === 0) {
        sendUserResults.innerHTML = '<div class="search-hint"><p>@' + q + ' not found on TikTok</p></div>';
      }
    }, 300);
  });

  // Numpad
  document.querySelectorAll('.numpad-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const num = btn.dataset.num;
      if (num === 'back') {
        state.amount = state.amount.slice(0, -1);
      } else if (num === '.') {
        if (!state.amount.includes('.')) state.amount += '.';
      } else {
        if (state.amount.length < 10) state.amount += num;
      }
      updateAmountDisplay();
      // Haptic
      btn.style.transform = 'scale(0.92)';
      setTimeout(() => btn.style.transform = '', 100);
    });
  });

  // Pay button
  payBtn.addEventListener('click', () => {
    if (!state.amount || parseFloat(state.amount) <= 0) return;
    goToStep(3);
  });

  // Confirm pay
  $('confirmPayBtn').addEventListener('click', () => {
    processPayment();
  });

  // Done
  $('doneBtn').addEventListener('click', closeSendModal);

  // History button
  $('historyBtn').addEventListener('click', () => {
    document.querySelector('.section-header').scrollIntoView({behavior:'smooth'});
  });

  // Bottom nav
  document.querySelectorAll('.bottom-nav-btn[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.bottom-nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

// ===== SEND MODAL =====
function openSendModal(preselectedUser) {
  state.amount = '';
  state.selectedUser = preselectedUser;
  state.currentStep = preselectedUser ? 2 : 1;

  sendModal.classList.add('open');

  if (preselectedUser) {
    showStep(2);
    renderSelectedUser(preselectedUser);
  } else {
    showStep(1);
    renderDefaultSendUsers();
    setTimeout(() => sendSearchInput.focus(), 350);
  }
}

function closeSendModal() {
  sendModal.classList.remove('open');
  state.amount = '';
  state.selectedUser = null;
  sendSearchInput.value = '';
  amountValue.textContent = '0';
  payBtn.disabled = true;
  payBtn.classList.remove('enabled');
  showStep(1);
}

function showStep(n) {
  document.querySelectorAll('.send-step').forEach(s => s.classList.remove('active'));
  $(`sendStep${n}`).classList.add('active');
  state.currentStep = n;

  if (n === 2) {
    sendModal.classList.add('green-theme');
  } else {
    sendModal.classList.remove('green-theme');
  }

  // Update modal title
  const titles = {1:'Pay',2:'Enter Amount',3:'Confirm',4:''};
  $('sendModalClose').style.visibility = n === 4 ? 'hidden' : 'visible';
  const titleEl = document.querySelector('.modal-title');
  titleEl.textContent = titles[n] || '';
}

function goToStep(n) {
  showStep(n);
  if (n === 3) {
    $('confirmAmount').textContent = `$${formatNum(parseFloat(state.amount))}`;
    const u = state.selectedUser;
    $('confirmUser').innerHTML = `${avatarHTML(u, 36, 'cu-avatar')}${u.name}`;
    $('confirmNote').value = '';
  }
}

function renderDefaultSendUsers() {
  const popular = TIKTOK_USERS.slice(0, 10);
  sendUserResults.innerHTML = '<div style="padding:8px 20px;font-size:13px;color:var(--text3);font-weight:600">POPULAR USERS</div>' +
    popular.map(u => renderUserItem(u)).join('');
  bindSendUserClicks();
  setTimeout(loadAvatarsForVisible, 50);
}

function bindSendUserClicks() {
  sendUserResults.querySelectorAll('.search-result-item').forEach(el => {
    el.addEventListener('click', () => {
      const user = findUser(el.dataset.userid);
      if (user) {
        state.selectedUser = user;
        renderSelectedUser(user);
        showStep(2);
      }
    });
  });
}

function renderSelectedUser(user) {
  $('selectedUserInfo').innerHTML = `
    ${avatarHTML(user, 56, 'sui-avatar')}
    <div class="sui-name">${user.name}</div>
    <div class="sui-handle">${user.handle}</div>`;
  amountValue.textContent = '0';
  state.amount = '';
  payBtn.disabled = true;
  payBtn.classList.remove('enabled');
}

function updateAmountDisplay() {
  const val = state.amount || '0';
  amountValue.textContent = val === '' ? '0' : formatNum(parseFloat(val) || 0);
  const hasValue = state.amount && parseFloat(state.amount) > 0;
  payBtn.disabled = !hasValue;
  payBtn.classList.toggle('enabled', hasValue);
}

// ===== PAYMENT =====
function processPayment() {
  const amount = parseFloat(state.amount);
  const user = state.selectedUser;

  // Update balance
  state.balance -= amount;
  $('balanceAmount').textContent = `$${formatNum(state.balance)}`;

  // Add to transactions
  state.transactions.unshift({
    user, amount, type: 'sent', time: 'Just now', note: '🎁 LIVE Gift'
  });
  renderTransactions();

  // Show success
  showStep(4);
  $('successAmount').textContent = `$${formatNum(amount)}`;
  $('successUser').textContent = user.name;
  $('successTime').textContent = new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});

  // Add to live feed
  const feedItem = document.createElement('div');
  feedItem.className = 'feed-item';
  feedItem.innerHTML = `<div class="feed-avatar" style="background:var(--green)">💸</div>
    <div class="feed-text"><strong>You</strong> <span class="highlight">sent $${formatNum(amount)} to ${user.name}</span> 🎉</div>`;
  liveFeed.prepend(feedItem);
}

// ===== UTILS =====
function formatNum(n) {
  if (typeof n !== 'number' || isNaN(n)) return '0';
  return n.toLocaleString('en-US', {maximumFractionDigits: 2});
}

function debounce(fn, delay) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}
