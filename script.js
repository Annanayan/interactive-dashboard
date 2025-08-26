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



