// =======================
// 侧栏按钮 & 页面切换
// =======================
const buttons  = document.querySelectorAll(".nav-btn");
const contents = document.querySelectorAll(".content");

// 先把 Home 设为激活
document.getElementById("MainPage")?.classList.add("active");

buttons.forEach(btn => {
  btn.addEventListener("click", () => {
    const id = btn.dataset.content; // 目标 section 的 id

    // 切换按钮高亮
    buttons.forEach(b => b.classList.toggle("active", b === btn));

    // 切换页面显示
    contents.forEach(page => {
      page.classList.toggle("active", page.id === id);
    });
  });
});

// =======================
// 魔法棒：主题切换（合并成一个）
// =======================
const themes = ['theme-night', 'theme-fantasy', 'theme-dark'];
let currentThemeIndex = -1;
function toggleTheme() {
  themes.forEach(t => document.body.classList.remove(t));
  currentThemeIndex = (currentThemeIndex + 1) % themes.length;
  document.body.classList.add(themes[currentThemeIndex]);
}
window.toggleTheme = toggleTheme;


// =======================
// Math Tutor UI 逻辑（记录对话、不跳回首页）
// =======================
(function initMathTutor() {
  const messages = document.getElementById('mv-messages');
  const form = document.getElementById('mv-form');
  const input = document.getElementById('mv-input');
  if (!messages || !form || !input) return;

  // ★ 把它换成后端地址
  const ENDPOINT = 'https://YOUR_BACKEND_ENDPOINT/chat';

  // —— 关键：保持“AI Assistant”标签页处于激活 —— //
  function keepAssistantActive() {
    const assistant = document.getElementById('AI Assistant');
    if (!assistant) return;
    // 给 AI Assistant 加 active，其他移除
    document.querySelectorAll('.content').forEach(sec => {
      sec.classList.toggle('active', sec === assistant);
    });
    // 侧栏按钮高亮也同步（可选）
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.content === 'AI Assistant');
    });
  }

  // 生成一行消息（含头像 + 气泡）
  function addRow(role, text, typing = false) {
    const row = document.createElement('div');
    row.className = `mv-row ${role === 'user' ? 'mv-row-user' : 'mv-row-assistant'}`;

    const avatar = document.createElement('div');
    avatar.className = 'mv-avatar';
    avatar.innerHTML = role === 'user'
      ? '<i class="fas fa-user"></i>'
      : '<i class="fas fa-robot"></i>';

    const bubble = document.createElement('div');
    bubble.className = 'mv-bubble';
    if (typing) {
      bubble.innerHTML = `
        <span class="mv-typing"><span class="dot"></span><span class="dot"></span><span class="dot"></span></span>`;
    } else {
      bubble.textContent = text;
    }

    row.appendChild(avatar);
    row.appendChild(bubble);
    messages.appendChild(row);
    messages.scrollTop = messages.scrollHeight;
    return bubble;
  }

  async function ask(question) {
    keepAssistantActive();                // 发送前确保仍在此页
    addRow('user', question);             // 用户消息
    const bubble = addRow('assistant', '', true); // “打字中”

    try {
      const resp = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: 'You are a friendly math tutor for teens. Explain step-by-step, show reasoning clearly, and use LaTeX when helpful.' },
            { role: 'user', content: question }
          ]
        })
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      bubble.textContent = data.content || '(No response)';

      // LaTeX 公式渲染
      if (window.MathJax?.typesetPromise) {
        MathJax.typesetPromise([bubble]);
      }
    } catch (e) {
      bubble.textContent = 'Network or server error. Please try again.';
      console.error(e);
    } finally {
      messages.scrollTop = messages.scrollHeight;
      keepAssistantActive();              // 返回后再确认一次
    }
  }

  // 表单提交：阻止默认、阻止冒泡、防止影响侧栏
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    e.stopPropagation();
    keepAssistantActive();

    const q = (input.value || '').trim();
    if (!q) return;

    input.value = '';
    ask(q);
    return false; // 一些浏览器下更保险
  });

  // Shift+Enter 换行，Enter 发送，同时阻止冒泡
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      form.dispatchEvent(new Event('submit', { cancelable: true }));
    }
  });

  // 发送按钮点击也拦截冒泡
  document.querySelector('.mv-send')?.addEventListener('click', (e) => {
    e.stopPropagation();
  });
})();



  // —— Math Stories：星标切换（收藏/取消收藏） —— //
  function syncStoryStars(){
    const items = load().filter(i=>i.type==='story');
    const titles = new Set(items.map(i=>i.title));
    document.querySelectorAll('.book-item').forEach(card=>{
      const title = card.querySelector('.book-title')?.textContent?.trim();
      const btn = card.querySelector('.collect-btn');
      if (!btn) return;
      if (titles.has(title)) btn.classList.add('on'); else btn.classList.remove('on');
    });
  }

  document.querySelectorAll('.book-item').forEach(card=>{
    if (card.querySelector('.collect-btn')) return;
    const btn = document.createElement('button');
    btn.className='collect-btn'; btn.title='Collect';
    btn.innerHTML = '<i class="fas fa-star"></i>';
    card.appendChild(btn);
  });

  // 绑定切换
  document.querySelectorAll('.book-item .collect-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const card  = btn.closest('.book-item');
      const title = card.querySelector('.book-title')?.textContent?.trim() || 'Story';
      const items = load();
      const idx   = items.findIndex(i=>i.type==='story' && i.title===title);
      if (idx>=0){
        items.splice(idx,1);               // 取消收藏
      }else{
        items.push({ id:'s_'+Date.now(), type:'story', title, content:'Saved from Math Stories', createdAt:Date.now() });
      }
      save(items); render(); syncStoryStars();
    });
  });

// =======================
// My Collection：预览 + 弹窗（×关闭） + 笔记在弹窗内可编辑自动保存
// + 右键菜单 + 分享 + Math Stories 星标可取消
// + 图片/文件上传（基于 dataURL；建议<=1.5MB）
// =======================
(function initCollection(){
  const listEl   = document.getElementById('col-list');
  const filterEl = document.getElementById('col-filter');
  const newBtn   = document.getElementById('col-new-note');
  const editorEl = document.getElementById('col-editor');
  const titleEl  = document.getElementById('col-title');
  const bodyEl   = document.getElementById('col-body');
  const saveBtn  = document.getElementById('col-save');
  const cancelBtn= document.getElementById('col-cancel');

  const imgPicker = document.getElementById('col-img');
  const filePicker= document.getElementById('col-file');
  const btnImg    = document.getElementById('insert-image');
  const btnFile   = document.getElementById('insert-file');

  const modalEl   = document.getElementById('col-modal');
  const modalTitle= document.getElementById('modal-title');
  const modalBody = document.getElementById('modal-body');
  const modalDelete= document.getElementById('modal-delete');
  const modalClose = document.getElementById('modal-close');
  const modalShare = document.getElementById('modal-share');
  const modalSaved = document.getElementById('modal-saved');
  const shareSheet = document.getElementById('share-sheet');
  const menuEl    = document.getElementById('col-menu');

  if (!listEl || !newBtn) return;

  const STORE_KEY = 'mv_collection_v1';
  const PLAZA_KEY = 'mv_plaza_posts_v1';
  let editingId = null;   // 编辑器用
  let viewingId = null;   // 弹窗查看/编辑
  let autosaveTimer = null;

  const load = () => JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
  const save = (arr) => localStorage.setItem(STORE_KEY, JSON.stringify(arr));
  const loadPlaza = () => JSON.parse(localStorage.getItem(PLAZA_KEY) || '[]');
  const savePlaza = (arr) => localStorage.setItem(PLAZA_KEY, JSON.stringify(arr));

  function escapeHtml(s){ return (s||'').replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  const preview = (s, n=140) => { const t=(s||'').replace(/\s+/g,' ').trim(); return t.length>n?t.slice(0,n)+'…':t; };
  const plural2singular = { all:'all', notes:'note', stories:'story', posts:'post' };

  // 渲染列表（只展示预览）
  function render(){
    const key = plural2singular[(filterEl?.value||'all')] || 'all';
    const data = load().filter(it => key==='all' ? true : it.type===key)
                       .sort((a,b)=>b.createdAt-a.createdAt);
    listEl.innerHTML = data.map(it => `
      <div class="col-item" data-id="${it.id}">
        <div class="main">
          <div class="title"><strong>${escapeHtml(it.title || '(Untitled)')}</strong> <span class="tag">${it.type}</span></div>
          <div class="snippet">${escapeHtml(preview(it.type==='note' ? it.content : it.content))}</div>
          <div class="meta">${new Date(it.createdAt).toLocaleString()}</div>
        </div>
        <div class="actions">
          ${it.type==='note' ? `<button class="btn edit" title="Edit"><i class="fas fa-pen"></i></button>` : ''}
          <button class="btn share" title="Share"><i class="fas fa-share"></i></button>
          <button class="btn del"   title="Delete"><i class="fas fa-trash"></i></button>
        </div>
      </div>`).join('');
  }

  // —— 新建/编辑 笔记（编辑器卡片） —— //
  function openEditor(note){
    editorEl.classList.remove('hidden');
    // 修复“工具栏/保存按钮偶发消失”
    editorEl.querySelector('.editor-toolbar').style.display = 'flex';
    document.getElementById('col-save').style.display = '';

    editingId = note?.id || null;
    titleEl.value = note?.title || '';
    bodyEl.innerHTML = note?.html || '';
    bodyEl.focus();
  }
  function closeEditor(){ editorEl.classList.add('hidden'); editingId = null; }
  newBtn.addEventListener('click', ()=> openEditor(null));
  cancelBtn.addEventListener('click', closeEditor);
  saveBtn.addEventListener('click', ()=>{
    const items = load();
    const now = Date.now();
    const item = {
      id: editingId || ('n_'+now),
      type:'note',
      title: titleEl.value.trim() || 'Untitled',
      html:  bodyEl.innerHTML,
      content: bodyEl.textContent,
      createdAt: editingId ? (items.find(i=>i.id===editingId)?.createdAt || now) : now,
      updatedAt: now
    };
    const idx = items.findIndex(i=>i.id===item.id);
    if (idx>=0) items[idx]=item; else items.push(item);
    save(items); closeEditor(); render();
  });

  // 工具栏：文本命令 / 高亮 / 清单 / 图片 / 文件
  document.querySelector('.editor-toolbar')?.addEventListener('click', (e)=>{
    const btn = e.target.closest('button'); if(!btn) return;
    if (btn.dataset.cmd){ document.execCommand(btn.dataset.cmd,false,null); bodyEl.focus(); return; }
    if (btn.hasAttribute('data-mark')){
      const sel = window.getSelection();
      if (sel && sel.rangeCount && !sel.getRangeAt(0).collapsed){
        const r = sel.getRangeAt(0); const mark=document.createElement('mark'); r.surroundContents(mark);
      }
      bodyEl.focus(); return;
    }
  });
  document.getElementById('insert-checklist')?.addEventListener('click', ()=>{
    document.execCommand('insertHTML', false, `<ul class="checklist"><li><label><input type="checkbox"> item</label></li></ul>`);
    bodyEl.focus();
  });

  // 图片/文件插入（dataURL；建议<=1.5MB）
  btnImg?.addEventListener('click', ()=> imgPicker?.click());
  btnFile?.addEventListener('click',()=> filePicker?.click());
  imgPicker?.addEventListener('change', async e=>{
    const f = e.target.files[0]; if(!f) return;
    if (f.size > 1.5*1024*1024) return alert('Image too large (>1.5MB).');
    const data = await fileToDataURL(f);
    document.execCommand('insertHTML', false, `<img src="${data}" alt="${escapeHtml(f.name)}" style="max-width:100%;border-radius:8px;">`);
    bodyEl.focus();
    imgPicker.value='';
  });
  filePicker?.addEventListener('change', async e=>{
    const f = e.target.files[0]; if(!f) return;
    if (f.size > 1.5*1024*1024) return alert('File too large (>1.5MB).');
    const data = await fileToDataURL(f);
    const html = `<p><a href="${data}" download="${escapeHtml(f.name)}">📎 ${escapeHtml(f.name)}</a></p>`;
    document.execCommand('insertHTML', false, html);
    bodyEl.focus();
    filePicker.value='';
  });
  function fileToDataURL(file){ return new Promise(r=>{ const fr=new FileReader(); fr.onload=()=>r(fr.result); fr.readAsDataURL(file); }); }

  // 列表交互：单击打开弹窗；按钮；右键菜单
  listEl.addEventListener('click', (e)=>{
    const el = e.target.closest('.col-item'); if(!el) return;
    const id = el.dataset.id;
    if (e.target.closest('.del'))   return delItem(id);
    if (e.target.closest('.share')) return openShare(id);
    if (e.target.closest('.edit'))  return openEditor(load().find(i=>i.id===id));
    openModal(id); // 其余区域点击：打开弹窗
  });

  listEl.addEventListener('contextmenu', (e)=>{
    const el = e.target.closest('.col-item'); if(!el) return;
    e.preventDefault();
    const id = el.dataset.id;
    const item = load().find(i=>i.id===id);
    menuEl.style.left = `${e.pageX}px`; menuEl.style.top = `${e.pageY}px`;
    menuEl.classList.remove('hidden');
    menuEl.dataset.id = id;
    // 笔记才显示 Edit
    menuEl.querySelector('[data-act="edit"]').style.display = (item?.type==='note') ? '' : 'none';
  });
  document.addEventListener('click', ()=> menuEl.classList.add('hidden'));
  menuEl.addEventListener('click', (e)=>{
    const act = e.target.closest('button')?.dataset.act; if(!act) return;
    const id = menuEl.dataset.id;
    if (act==='open')  openModal(id);
    if (act==='edit')  openEditor(load().find(i=>i.id===id));
    if (act==='share') openShare(id);
    if (act==='delete') delItem(id);
    menuEl.classList.add('hidden');
  });

  function delItem(id){
    const arr = load().filter(i=>i.id!==id); save(arr); render(); syncStoryStars();
    if (!modalEl.classList.contains('hidden') && viewingId===id) modalEl.classList.add('hidden');
  }

  // —— 弹窗：笔记可编辑（自动保存）；非笔记只读；右上角 × 关闭 —— //
  function openModal(id){
    const it = load().find(i=>i.id===id); if(!it) return;
    viewingId = id; modalSaved.textContent='';
    modalTitle.value = it.title || '';

    if (it.type==='note'){
      modalBody.innerHTML = it.html || '';
      modalBody.contentEditable = 'true';  // 直接可编辑
    }else{
      modalBody.textContent = it.content || '';
      modalBody.contentEditable = 'false'; // Story/Post 只读
    }
    shareSheet.classList.add('hidden');
    modalEl.classList.remove('hidden');
  }
  function closeModal(){ modalEl.classList.add('hidden'); viewingId=null; }
  modalClose.addEventListener('click', closeModal);
  modalDelete.addEventListener('click', ()=> delItem(viewingId));
  modalShare.addEventListener('click', ()=> openShare(viewingId));
  // 点击遮罩或 Esc 关闭
  modalEl.addEventListener('click', e=>{ if(e.target===modalEl) closeModal(); });
  document.addEventListener('keydown', e=>{ if(!modalEl.classList.contains('hidden') && e.key==='Escape') closeModal(); });

  // 自动保存（仅笔记；标题/正文输入 600ms 后保存，关闭时也保存）
  [modalTitle, modalBody].forEach(el=>{
    el.addEventListener('input', ()=>{
      if (!viewingId) return;
      const arr = load(); const idx = arr.findIndex(i=>i.id===viewingId);
      if (idx<0 || arr[idx].type!=='note') return; // 非笔记不保存
      const doSave = ()=>{
        arr[idx].title   = modalTitle.value.trim() || 'Untitled';
        arr[idx].html    = modalBody.innerHTML;
        arr[idx].content = modalBody.textContent;
        arr[idx].updatedAt = Date.now();
        save(arr); modalSaved.textContent='Saved';
        render();
        clearTimeout(autosaveTimer); autosaveTimer=null;
      };
      modalSaved.textContent='Saving...';
      clearTimeout(autosaveTimer);
      autosaveTimer = setTimeout(doSave, 600);
    });
  });
  // 关闭时兜底保存
  modalEl.addEventListener('transitionend', ()=>{}); // 预留
  window.addEventListener('beforeunload', ()=>{
    if (autosaveTimer){ clearTimeout(autosaveTimer); autosaveTimer=null; }
  });

  // —— 分享：系统分享 / 复制 / 分享到 Plaza —— //
  function openShare(id){
    openModal(id); // 先展示
    shareSheet.classList.remove('hidden');
  }
  shareSheet.addEventListener('click', async (e)=>{
    const btn = e.target.closest('button'); if(!btn) return;
    const mode = btn.dataset.share;
    const it = load().find(i=>i.id===viewingId); if(!it) return;
    const shareText = `${it.title}\n\n${it.content||''}`;
    const shareUrl  = location.href;

    if (mode==='system'){
      if (navigator.share){ try{ await navigator.share({ title: it.title, text: shareText, url: shareUrl }); }catch{} }
      else { await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`); alert('Copied to clipboard.'); }
    } else if (mode==='copy'){
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`); alert('Copied to clipboard.');
    } else if (mode==='plaza'){
      const posts = loadPlaza(); posts.push({ id:'pl_'+Date.now(), title: it.title, content: it.content, createdAt: Date.now() });
      savePlaza(posts); alert('Shared to Community Plaza.');
    }
  });

  // —— Math Stories 星标（收藏/取消）同步 —— //
  function syncStoryStars(){
    const titles = new Set(load().filter(i=>i.type==='story').map(i=>i.title));
    document.querySelectorAll('.book-item').forEach(card=>{
      const title = card.querySelector('.book-title')?.textContent?.trim();
      const btn = card.querySelector('.collect-btn');
      if (!btn) return;
      if (titles.has(title)) btn.classList.add('on'); else btn.classList.remove('on');
    });
  }
  // 初始补星标按钮
  document.querySelectorAll('.book-item').forEach(card=>{
    if (card.querySelector('.collect-btn')) return;
    const btn = document.createElement('button');
    btn.className='collect-btn'; btn.title='Collect';
    btn.innerHTML = '<i class="fas fa-star"></i>';
    card.appendChild(btn);
  });
  // 切换收藏
  document.querySelectorAll('.book-item .collect-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const card = btn.closest('.book-item');
      const title = card.querySelector('.book-title')?.textContent?.trim() || 'Story';
      const items = load();
      const idx   = items.findIndex(i=>i.type==='story' && i.title===title);
      if (idx>=0) items.splice(idx,1); else items.push({ id:'s_'+Date.now(), type:'story', title, content:'Saved from Math Stories', createdAt:Date.now() });
      save(items); render(); syncStoryStars();
    });
  });

  // —— 进入/切换时刷新 —— //
  function onActivate(){
    render(); syncStoryStars();
  }
  const mcBtn = Array.from(document.querySelectorAll('.nav-btn')).find(b=>b.dataset.content==='My Collection');
  mcBtn?.addEventListener('click', onActivate);
  if (document.getElementById('My Collection')?.classList.contains('active')) onActivate();

  // 筛选（修复你说“点 Notes 不生效”）
  filterEl?.addEventListener('change', render);
  filterEl?.addEventListener('input', render);
})();



  // —— Community Plaza：简单 feed 渲染（显示已分享的帖子） —— //
  function renderPlaza(){
    const plaza = document.getElementById('Community Plaza');
    if (!plaza) return;
    let feed = plaza.querySelector('.plaza-feed');
    if (!feed){
      feed = document.createElement('div');
      feed.className = 'plaza-feed';
      plaza.innerHTML = ''; // 如果你原来是图片，可考虑去掉这行，改成 appendChild
      plaza.appendChild(feed);
    }
    const posts = loadPlaza().sort((a,b)=>b.createdAt-a.createdAt);
    feed.innerHTML = posts.map(p=>`
      <div class="plaza-card">
        <div class="title"><strong>${escapeHtml(p.title)}</strong></div>
        <div class="body">${escapeHtml(p.content)}</div>
        <div class="meta">${new Date(p.createdAt).toLocaleString()}</div>
      </div>`).join('');
  }
  // 进入 Plaza 时刷新一下
  const plazaBtn = Array.from(document.querySelectorAll('.nav-btn')).find(b=>b.dataset.content==='Community Plaza');
  plazaBtn?.addEventListener('click', renderPlaza);

  // —— 首次渲染 —— //
  const mcBtn = Array.from(document.querySelectorAll('.nav-btn')).find(b => b.dataset.content === 'My Collection');
  mcBtn?.addEventListener('click', ()=>{ render(); syncStoryStars(); });
  if (document.getElementById('My Collection')?.classList.contains('active')){ render(); syncStoryStars(); }
})();

// ===== Daily Practice - Map pins =====
(function bindPracticePins(){
  const container = document.querySelector('#Daily Practice.dp');
  if (!container) return;

  // 只给有 data-url 的钉子绑定跳转
  container.addEventListener('click', (e)=>{
    const pin = e.target.closest('.dp-pin');
    if (!pin) return;
    const url = pin.dataset.url;
    if (url) window.open(url, '_blank', 'noopener');
  });

  // 键盘可达性：Enter/Space 触发
  container.addEventListener('keydown', (e)=>{
    const pin = e.target.closest('.dp-pin');
    if (!pin) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      pin.click();
    }
  });

  // 让所有钉子能被 Tab 聚焦
  container.querySelectorAll('.dp-pin').forEach(pin => pin.setAttribute('tabindex','0'));
})();

// ========== Community Plaza：英文 UI + 星标收藏到 My Collection + hover 放大 ==========
(function initPlaza(){
  const FEED = document.getElementById('plaza-feed');
  if (!FEED) return;

  const PLAZA_KEY = 'mv_plaza_posts_v1';
  const COLLECTION_KEY = 'mv_collection_v1';

  // 工具函数
  const loadCol = () => JSON.parse(localStorage.getItem(COLLECTION_KEY) || '[]');
  const saveCol = (arr) => localStorage.setItem(COLLECTION_KEY, JSON.stringify(arr));
  const loadPlaza = () => JSON.parse(localStorage.getItem(PLAZA_KEY) || '[]');

  const rand = (a,b)=> Math.floor(Math.random()*(b-a+1))+a;
  const NAMES = ['Mia','Leo','Ava','Noah','Sophia','Liam','Emma','Ethan','Chloe','Mason','Olivia','Lucas','Isla','Henry','Amelia','Jack','Grace','James','Zoe','Daniel'];
  const CHANS = ['r/calculus','r/ExplainTheJoke','r/confidentlyincorrect','r/askmath','r/math','r/learnmath'];
  const randName = ()=> NAMES[rand(0, NAMES.length-1)];
  const randChan  = ()=> CHANS[rand(0, CHANS.length-1)];

  const randDateAug2025 = ()=>{
    const day = rand(1,31);
    const d = new Date(2025,7,day, rand(8,22), rand(0,59));  // 2025-08
    return d.toISOString();
  };

  const fmtEN = iso => new Date(iso).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' }); // e.g. Aug 26, 2025
  const nShort = n => n>=1e6? (n/1e6).toFixed(1)+'M' : n>=1e3? (n/1e3).toFixed(1)+'k' : String(n);

  function avatarHTML(name){
    const initials = name.slice(0,1).toUpperCase();
    const h = rand(0,360);
    const bg = `linear-gradient(135deg, hsl(${h}deg 80% 55%), hsl(${(h+40)%360}deg 80% 45%))`;
    return `<span class="avatar" style="background:${bg}">${initials}</span>`;
  }

  // 静态种子（可以替换标题；缩略图路径已改）
  const SEEDS = [
    { title: 'Do I need to be a math expert to understand this?', thumb: 'images/p2.jpg' },
    { title: '"Thank God I\'m a math major."',                  thumb: 'images/p3.jpg' },
    { title: 'My Wife (Math Teacher) Cannot Figure This Out',   thumb: 'images/p4.jpg' },
    { title: '8 year old is obsessed with math, plz help.',     thumb: 'images/p1.jpg' },
  ].map(t => ({
    id: 'seed_' + Math.random().toString(36).slice(2),
    type: 'seed',
    title: t.title,
    channel: randChan(),
    author: randName(),
    createdAt: randDateAug2025(),
    votes: rand(1200, 48000),
    comments: rand(180, 2500),
    thumb: t.thumb
  }));

  // 来自 “My Collection → Share to Community Plaza” 的用户贴（置顶）
  const userPosts = loadPlaza().map(p => ({
    id: p.id, type: 'user',
    title: p.title || 'Shared post',
    channel: 'MathVillage',
    author: 'Anna',
    createdAt: new Date(p.createdAt || Date.now()).toISOString(),
    votes: rand(20, 120), comments: rand(0, 20),
    content: p.content || '',
    thumb: '' // 目前不带缩略图
  }));

  // 合并 & 时间倒序
  let all = [...userPosts, ...SEEDS].sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt));

  // 判断某条 post 是否已经收藏到 My Collection
  function isFaved(id){
    return loadCol().some(i => i.type==='post' && i.fromId===id);
  }
  function toggleFav(post){
    const arr = loadCol();
    const idx = arr.findIndex(i => i.type==='post' && i.fromId===post.id);
    if (idx>=0){
      arr.splice(idx,1); // 取消收藏
    }else{
      arr.push({
        id: 'p_' + Date.now(),
        type: 'post',
        fromId: post.id,                 // 关联 plaza 里的 id，方便同步
        title: post.title,
        content: `${post.channel} • ${post.author} • ${fmtEN(post.createdAt)}`,
        createdAt: Date.now()
      });
    }
    saveCol(arr);
  }

  // 渲染一条卡片（英文 UI + 右上角星标）
  function cardHTML(p){
    const starred = isFaved(p.id) ? 'on' : '';
    return `
      <article class="post-card" data-id="${p.id}">
        <button class="post-star ${starred}" aria-label="Save or remove">
          <i class="fas fa-star"></i>
        </button>

        <div class="post-main">
          <div class="post-head">
            ${avatarHTML(p.author)}
            <span class="chan">${p.channel}</span>
            <span class="dot"></span>
            <span>${fmtEN(p.createdAt)}</span>
          </div>
          <div class="post-title">${p.title}</div>
          <div class="post-meta">${nShort(p.votes)} votes · ${nShort(p.comments)} comments</div>
        </div>
        ${p.thumb ? `<img class="post-thumb" src="${p.thumb}" alt="" onerror="this.remove()">` : `<span></span>`}
      </article>
    `;
  }

  function render(){ FEED.innerHTML = all.map(cardHTML).join(''); }
  render();

  // 点击星标：收藏/取消收藏 + UI 同步
  FEED.addEventListener('click', (e)=>{
    const star = e.target.closest('.post-star');
    if (!star) return;
    const card = star.closest('.post-card');
    const id = card?.dataset.id;
    const post = all.find(p => p.id === id);
    if (!post) return;
    toggleFav(post);
    star.classList.toggle('on', isFaved(id));
  });

  // 切到 Plaza 页时刷新（为了反映 My Collection 的变动）
  const plazaBtn = Array.from(document.querySelectorAll('.nav-btn')).find(b=>b.dataset.content==='Community Plaza');
  plazaBtn?.addEventListener('click', ()=>{
    // 重新读用户帖
    const refreshedUser = loadPlaza().map(p => ({
      id: p.id, type: 'user',
      title: p.title || 'Shared post',
      channel: 'MathVillage',
      author: 'Anna',
      createdAt: new Date(p.createdAt || Date.now()).toISOString(),
      votes: rand(20, 120), comments: rand(0, 20),
      content: p.content || '', thumb: ''
    }));
    all = [...refreshedUser, ...SEEDS].sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt));
    render();
  });
})();








