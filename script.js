// 获取所有按钮和内容区域
const buttons = document.querySelectorAll('.nav-btn');
const contents = document.querySelectorAll('.content');

// 页面加载时，默认显示 MainPage
document.addEventListener('DOMContentLoaded', () => {
    contents.forEach(content => content.classList.add('hidden'));
    document.getElementById('MainPage').classList.remove('hidden');
});


// 为每个按钮添加点击事件
buttons.forEach(button => {
    button.addEventListener('click', () => {
        const targetContent = button.getAttribute('data-content');

        // 隐藏所有内容
        contents.forEach(content => {
            content.classList.add('hidden');
        });

        // 显示目标内容
        document.getElementById(targetContent).classList.remove('hidden');

        // 移除所有按钮的 active 状态
        buttons.forEach(btn => {
            btn.classList.remove('active');
        });

        // 为当前被点击的按钮添加 active 状态
        button.classList.add('active');
    });
});
