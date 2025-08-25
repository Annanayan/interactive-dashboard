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
// 魔法棒：主题切换（合并为一个函数）
// =======================
const themes = ['theme-night', 'theme-fantasy', 'theme-dark'];
let currentThemeIndex = -1; // 从 -1 开始，第一次点击切到 0

function toggleTheme() {
  // 移除所有主题
  themes.forEach(t => document.body.classList.remove(t));
  // 应用下一个主题
  currentThemeIndex = (currentThemeIndex + 1) % themes.length;
  document.body.classList.add(themes[currentThemeIndex]);
}
// 页面里 .magic-switch 会调用 window.toggleTheme
window.toggleTheme = toggleTheme;

// =======================
// Math Tutor 前端逻辑
// （把消息显示在 “AI Assistant” 板块中）
// =======================
(function initMathTutor() {
  const messagesEl = document.getElementById('mv-messages');
  const form = document.getElementById('mv-form');
  const input = document.getElementById('mv-input');

  // 如果用户暂时没加载到该板块（或你还没粘贴 HTML），静默退出
  if (!messagesEl || !form || !input) return;

  // ⭐ 把这个地址改成你的后端（Cloudflare Worker / Vercel Function）
  const ENDPOINT = 'https://YOUR_BACKEND_ENDPOINT/chat';

  // 渲染一条消息
  function addMessage(role, text) {
    const div = document.createElement('div');
    div.className = `mv-msg ${role === 'user' ? 'mv-user' : 'mv-assistant'}`;
    // 先用纯文本，防 XSS；MathJax 会在后面负责把 $$...$$ 渲染为公式
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  async function ask(question) {
    // 用户消息
    addMessage('user', question);

    // 占位“Thinking…”
    const thinking = addMessage('assistant', 'Thinking…');

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
      thinking.textContent = data.content || '(No response)';

      // 触发公式二次排版（如果你在 HTML 里引入了 MathJax）
      if (window.MathJax && MathJax.typesetPromise) {
        MathJax.typesetPromise([messagesEl]);
      }
    } catch (err) {
      thinking.textContent = 'Oops, network or server error. Please try again.';
      console.error(err);
    }
  }

  // 表单提交
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = (input.value || '').trim();
    if (!q) return;
    input.value = '';
    ask(q);
  });
})();
