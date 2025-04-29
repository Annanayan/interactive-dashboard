// 侧栏按钮 & 页面切换
const buttons  = document.querySelectorAll(".nav-btn");
const contents = document.querySelectorAll(".content");

// 先把 Home 设为激活
document.getElementById("MainPage").classList.add("active");

buttons.forEach(btn=>{
  btn.addEventListener("click",()=>{
    // 当前按钮
    const id = btn.dataset.content;

    // 切换按钮高亮
    buttons.forEach(b=>b.classList.toggle("active",b===btn));

    // 切换页面显示
    contents.forEach(page=>{
      page.classList.toggle("active",page.id===id);
    });
  });
});
// --- 魔法棒切换夜间模式 ---
function toggleTheme() {
  document.body.classList.toggle("night-mode");
}
const themes = ['', 'theme-night', 'theme-fantasy', 'theme-dark']; // '' 表示默认
let currentThemeIndex = 0;

function toggleTheme() {
  // 移除所有主题类
  themes.forEach(t => {
    if (t) document.body.classList.remove(t);
  });

  // 增加索引
  currentThemeIndex = (currentThemeIndex + 1) % themes.length;

  // 应用新的主题类（注意默认主题是空字符串）
  const newTheme = themes[currentThemeIndex];
  if (newTheme) {
    document.body.classList.add(newTheme);
  }
}
