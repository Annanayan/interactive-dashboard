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
// My Collection：本地收藏/笔记
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
  if (!listEl || !newBtn) return;

  const STORE_KEY = 'mv_collection_v1';
  let editingId = null;

  const load = () => JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
  const save = (arr) => localStorage.setItem(STORE_KEY, JSON.stringify(arr));

  function render(){
    const type = filterEl?.value || 'all';
    const data = load().filter(it => type==='all' ? true : it.type===type)
                       .sort((a,b)=> b.createdAt - a.createdAt);
    listEl.innerHTML = data.map(it => `
      <div class="col-item" data-id="${it.id}">
        <div>
          <div class="title"><strong>${escapeHtml(it.title || '(Untitled)')}</strong> <span class="tag">${it.type}</span></div>
          <div class="snippet">${it.type==='note' ? it.html : escapeHtml(it.content || '')}</div>
          <div class="meta">${new Date(it.createdAt).toLocaleString()}</div>
        </div>
        <div class="actions">
          ${it.type==='note' ? `<button class="btn edit"><i class="fas fa-pen"></i></button>` : ''}
          <button class="btn del"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    `).join('');
  }

  function escapeHtml(s){ return (s||'').replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

  // —— 新建/编辑 笔记 —— //
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

  // 工具栏：execCommand + 高亮 + 清单
  document.querySelector('.editor-toolbar')?.addEventListener('click', (e)=>{
    const btn = e.target.closest('button'); if(!btn) return;
    if (btn.dataset.cmd){
      document.execCommand(btn.dataset.cmd, false, null);
      bodyEl.focus(); return;
    }
    if (btn.hasAttribute('data-mark')){ // 高亮
      const sel = window.getSelection();
      if (sel && sel.rangeCount){
        const r = sel.getRangeAt(0);
        if (!r.collapsed){
          const mark = document.createElement('mark');
          r.surroundContents(mark);
        }
      }
      bodyEl.focus(); return;
    }
    if (btn.id==='insert-checklist'){
      const html = `<ul class="checklist"><li><label><input type="checkbox"> item</label></li></ul>`;
      insertHtmlAtCaret(html, bodyEl); bodyEl.focus(); return;
    }
  });

  function insertHtmlAtCaret(html, container){
    container.focus();
    document.execCommand('insertHTML', false, html);
  }

  // 列表按钮（编辑/删除）
  listEl.addEventListener('click', (e)=>{
    const wrap = e.target.closest('.col-item'); if(!wrap) return;
    const id = wrap.dataset.id;
    if (e.target.closest('.del')){
      const items = load().filter(i=>i.id!==id); save(items); render();
    } else if (e.target.closest('.edit')){
      const note = load().find(i=>i.id===id);
      openEditor(note);
    }
  });

  filterEl?.addEventListener('change', render);

  // —— 从 Math Stories 一键收藏 —— //
  // 在每个 .book-item 的右上角加“星标”按钮
  document.querySelectorAll('.book-item').forEach(card=>{
    if (card.querySelector('.collect-btn')) return;
    const btn = document.createElement('button');
    btn.className='collect-btn'; btn.title='Collect';
    btn.innerHTML = '<i class="fas fa-star"></i>';
    btn.addEventListener('click', ()=>{
      const title = card.querySelector('.book-title')?.textContent?.trim() || 'Story';
      const items = load();
      items.push({
        id: 's_'+Date.now(),
        type:'story',
        title, content: 'Saved from Math Stories', createdAt: Date.now()
      });
      save(items); // 提示可选
      // 切到 My Collection 并刷新列表
      document.querySelector('[data-content="My Collection"]')?.click();
      render();
    });
    card.appendChild(btn);
  });

  // —— 预留：从 Community Plaza 收藏 —— //
  // 未来你把帖子渲染为 .collectable 元素时，我们自动加收藏按钮
  document.querySelectorAll('#Community\\ Plaza .collectable').forEach(el=>{
    if (el.querySelector('.collect-btn')) return;
    const btn = document.createElement('button');
    btn.className='collect-btn'; btn.title='Collect';
    btn.innerHTML = '<i class="fas fa-star"></i>';
    btn.addEventListener('click', ()=>{
      const title = el.getAttribute('data-title') || 'Post';
      const content= el.textContent.trim().slice(0,160);
      const items = load();
      items.push({ id:'p_'+Date.now(), type:'post', title, content, createdAt:Date.now() });
      save(items);
      document.querySelector('[data-content="My Collection"]')?.click();
      render();
    });
    el.appendChild(btn);
  });

  // 首次进入“我的收藏”时渲染
  const mcBtn = Array.from(document.querySelectorAll('.nav-btn'))
    .find(b => b.dataset.content === 'My Collection');
  mcBtn?.addEventListener('click', render);

  // 如果直接刷新时正好在该页
  if (document.getElementById('My Collection')?.classList.contains('active')) render();
})();



