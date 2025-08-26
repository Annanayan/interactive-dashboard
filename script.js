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
// Math Tutor UI 逻辑（漂亮版）
// =======================
(function initMathTutor() {
  const messages = document.getElementById('mv-messages');
  const form = document.getElementById('mv-form');
  const input = document.getElementById('mv-input');
  const sugg = document.getElementById('mv-suggestions');
  if (!messages || !form || !input) return;

  // ★ 改成后端地址
  const ENDPOINT = 'https://YOUR_BACKEND_ENDPOINT/chat';

  // 示例问题 chips
  const presets = [
    '求半径 5 的圆面积，并写出步骤',
    '化简：(x^2 - 9) / (x - 3)',
    '证明直角三角形斜边中点到三顶点距离相等',
    '计算：$$\\int_0^1 (3x^2+2x)\\,dx$$'
  ];
  sugg.innerHTML = presets.map(t => `<button type="button" class="mv-chip">${t}</button>`).join('');
  sugg.addEventListener('click', e => {
    if (e.target.classList.contains('mv-chip')) {
      input.value = e.target.textContent;
      input.focus();
    }
  });

  // 生成一行消息（含头像 + 气泡）
  function addRow(role, htmlOrText, typing = false) {
    const row = document.createElement('div');
    row.className = `mv-row ${role === 'user' ? 'mv-row-user' : 'mv-row-assistant'}`;

    const avatar = document.createElement('div');
    avatar.className = 'mv-avatar';
    avatar.innerHTML = role === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';

    const bubble = document.createElement('div');
    bubble.className = 'mv-bubble';

    if (typing) {
      bubble.innerHTML = `
        <span class="mv-typing">
          <span class="dot"></span><span class="dot"></span><span class="dot"></span>
        </span>`;
    } else {
      // 默认用 textContent 防 XSS；需要渲染公式交给 MathJax；简单 **bold**/换行可后续拓展
      bubble.textContent = htmlOrText;
    }

    row.appendChild(avatar);
    row.appendChild(bubble);
    messages.appendChild(row);
    messages.scrollTop = messages.scrollHeight;
    return bubble; // 返回气泡，方便后续替换内容
  }

  async function ask(question) {
    // 用户消息
    addRow('user', question);
    // 助手“打字中”
    const bubble = addRow('assistant', '', true);

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
      const text = data.content || '(No response)';
      bubble.textContent = text;

      // 触发公式渲染
      if (window.MathJax && MathJax.typesetPromise) {
        MathJax.typesetPromise([bubble]);
      }
    } catch (e) {
      bubble.textContent = 'Network or server error. Please try again.';
      console.error(e);
    }
    messages.scrollTop = messages.scrollHeight;
  }

  // 发送表单
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = (input.value || '').trim();
    if (!q) return;
    input.value = '';
    ask(q);
  });

  // Shift+Enter 换行，Enter 发送
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.dispatchEvent(new Event('submit', { cancelable: true }));
    }
  });
})();

