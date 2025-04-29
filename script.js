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
