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

// =======================
// My Collection：预览 + 弹窗查看/编辑 + 右键菜单 + 分享 + 取消收藏
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

  const modalEl  = document.getElementById('col-modal');
  const modalTitle= document.getElementById('modal-title');
  const modalBody = document.getElementById('modal-body');
  const modalEdit = document.getElementById('modal-edit');
  const modalSave = document.getElementById('modal-save');
  const modalDelete= document.getElementById('modal-delete');
  const modalClose = document.getElementById('modal-close');

  const shareSheet= document.getElementById('share-sheet');

  const menuEl   = document.getElementById('col-menu');

  if (!listEl || !newBtn) return;

  const STORE_KEY = 'mv_collection_v1';
  const PLAZA_KEY = 'mv_plaza_posts_v1';
  let editingId = null;      // 新建/编辑用
  let viewingId = null;      // 弹窗中查看的条目

  const load = () => JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
  const save = (arr) => localStorage.setItem(STORE_KEY, JSON.stringify(arr));

  const loadPlaza = () => JSON.parse(localStorage.getItem(PLAZA_KEY) || '[]');
  const savePlaza = (arr) => localStorage.setItem(PLAZA_KEY, JSON.stringify(arr));

  function escapeHtml(s){ return (s||'').replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  const preview = (s, n=140) => {
    const t = (s||'').replace(/\s+/g,' ').trim();
    return t.length>n ? t.slice(0,n)+'…' : t;
  };

  // —— 渲染列表（只显示预览） —— //
  function render(){
    const type = filterEl?.value || 'all';
    const data = load().filter(it => type==='all' ? true : it.type===type)
                       .sort((a,b)=> b.createdAt - a.createdAt);

    listEl.innerHTML = data.map(it => {
      const text = it.type==='note' ? (it.content || '') : (it.content || '');
      return `
      <div class="col-item" data-id="${it.id}">
        <div class="main">
          <div class="title"><strong>${escapeHtml(it.title || '(Untitled)')}</strong> <span class="tag">${it.type}</span></div>
          <div class="snippet">${escapeHtml(preview(text))}</div>
          <div class="meta">${new Date(it.createdAt).toLocaleString()}</div>
        </div>
        <div class="actions">
          ${it.type==='note' ? `<button class="btn edit" title="Edit"><i class="fas fa-pen"></i></button>` : ''}
          <button class="btn share" title="Share"><i class="fas fa-share"></i></button>
          <button class="btn del"   title="Delete"><i class="fas fa-trash"></i></button>
        </div>
      </div>`;
    }).join('');
  }

  // —— 新建/编辑 笔记（编辑器卡片） —— //
  function openEditor(note){
    editorEl.classList.remove('hidden');
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
    save(items);
    closeEditor();
    render();
  });

  // 工具栏
  document.querySelector('.editor-toolbar')?.addEventListener('click', (e)=>{
    const btn = e.target.closest('button'); if(!btn) return;
    if (btn.dataset.cmd){ document.execCommand(btn.dataset.cmd,false,null); bodyEl.focus(); return; }
    if (btn.hasAttribute('data-mark')){
      const sel = window.getSelection();
      if (sel && sel.rangeCount && !sel.getRangeAt(0).collapsed){
        const r = sel.getRangeAt(0); const mark = document.createElement('mark'); r.surroundContents(mark);
      }
      bodyEl.focus(); return;
    }
    if (btn.id==='insert-checklist'){
      document.execCommand('insertHTML', false, `<ul class="checklist"><li><label><input type="checkbox"> item</label></li></ul>`);
      bodyEl.focus(); return;
    }
  });

  // —— 列表交互：单击打开弹窗；右键菜单；按钮操作 —— //
  listEl.addEventListener('click', (e)=>{
    const itemEl = e.target.closest('.col-item'); if(!itemEl) return;
    const id = itemEl.dataset.id;
    if (e.target.closest('.del'))   return delItem(id);
    if (e.target.closest('.share')) return openShare(id);
    if (e.target.closest('.edit'))  return openEditor(load().find(i=>i.id===id));
    // 点击空白/正文：打开弹窗
    openModal(id);
  });

  listEl.addEventListener('contextmenu', (e)=>{
    const itemEl = e.target.closest('.col-item'); if(!itemEl) return;
    e.preventDefault();
    const id = itemEl.dataset.id;
    const itm = load().find(i=>i.id===id);
    // 放到鼠标位置
    menuEl.style.left = `${e.pageX}px`;
    menuEl.style.top  = `${e.pageY}px`;
    menuEl.classList.remove('hidden');
    // 笔记才显示 Edit
    menuEl.querySelector('[data-act="edit"]').style.display = (itm?.type==='note') ? '' : 'none';
    menuEl.dataset.id = id;
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
    const items = load().filter(i=>i.id!==id); save(items); render(); // 取消收藏/删除
    // 同步 Math Stories 的星标
    syncStoryStars();
    if (modalEl && !modalEl.classList.contains('hidden') && viewingId===id) modalEl.classList.add('hidden');
  }

  // —— 弹窗逻辑 —— //
  function openModal(id){
    const it = load().find(i=>i.id===id); if(!it) return;
    viewingId = id;
    modalTitle.value = it.title || '';
    if (it.type==='note'){
      modalBody.innerHTML = it.html || '';
      modalBody.contentEditable = 'false';
      modalEdit.style.display = '';
    }else{
      modalBody.textContent = it.content || '';
      modalBody.contentEditable = 'false';
      modalEdit.style.display = 'none';
    }
    modalSave.classList.add('hidden');
    shareSheet.classList.add('hidden');
    modalEl.classList.remove('hidden');
  }
  modalClose.addEventListener('click', ()=> modalEl.classList.add('hidden'));
  modalDelete.addEventListener('click', ()=> delItem(viewingId));
  modalEdit.addEventListener('click', ()=>{
    modalBody.contentEditable = 'true';
    modalBody.focus();
    modalSave.classList.remove('hidden');
  });
  modalSave.addEventListener('click', ()=>{
    const arr = load(); const idx = arr.findIndex(i=>i.id===viewingId);
    if (idx>=0 && arr[idx].type==='note'){
      arr[idx].title   = modalTitle.value.trim() || 'Untitled';
      arr[idx].html    = modalBody.innerHTML;
      arr[idx].content = modalBody.textContent;
      arr[idx].updatedAt = Date.now();
      save(arr); render();
    }
    modalBody.contentEditable='false';
    modalSave.classList.add('hidden');
  });

  // —— 分享：系统分享 / 复制 / 分享到 Plaza —— //
  function openShare(id){
    openModal(id);               // 先打开详情
    shareSheet.classList.remove('hidden');
  }
  shareSheet.addEventListener('click', async (e)=>{
    const btn = e.target.closest('button'); if(!btn) return;
    const mode = btn.dataset.share;
    const it = load().find(i=>i.id===viewingId); if(!it) return;

    const shareText = `${it.title}\n\n${it.type==='note' ? (it.content||'') : (it.content||'')}`;
    const shareUrl  = location.href; // 也可以定制

    if (mode==='system'){
      if (navigator.share){
        try{ await navigator.share({ title: it.title, text: shareText, url: shareUrl }); }catch{}
      }else{
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        alert('Copied to clipboard.');
      }
    } else if (mode==='copy'){
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      alert('Copied to clipboard.');
    } else if (mode==='plaza'){
      const posts = loadPlaza();
      posts.push({ id:'pl_'+Date.now(), title: it.title, content: it.content, createdAt: Date.now() });
      savePlaza(posts);
      alert('Shared to Community Plaza.');
    }
  });

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




