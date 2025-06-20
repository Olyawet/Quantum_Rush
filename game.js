// Quantum Rush: основной игровой скрипт (исправленный и понятный)

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
let width = window.innerWidth;
let height = window.innerHeight;
canvas.width = width;
canvas.height = height;

// UI элементы
const scoreEl = document.getElementById('score');
const energyEl = document.getElementById('energy');
const rankEl = document.getElementById('rank');
const progressBar = document.getElementById('progress-bar');
const revangeBtn = document.getElementById('revange-btn');
const shareBtn = document.getElementById('share-btn');
const dailyChallengeEl = document.getElementById('daily-challenge');

// Игровые переменные
let running = false;
let score = 0;
let energy = 100;
let speed = 4;
let maxSpeed = 16;
let timeSlow = false;
let timeSlowFactor = 0.35;
let timeSlowCost = 0.25;
let lastFrame = 0;
let obstacles = [];
let energyCells = [];
let particle = { x: width/4, y: height/2, r: 18 };
let targetY = height / 2;
let progress = 0;
let rank = 'Новичок';
let nextRankScore = 100;
let ranks = [
    {score:0, name:'Новичок'},
    {score:100, name:'Исследователь'},
    {score:300, name:'Квантовый пилот'},
    {score:600, name:'Гений'},
    {score:1200, name:'Квантовый гений'}
];
let timeSinceSpeedUp = 0;

// --- НОВОЕ УПРАВЛЕНИЕ ---

// Замедление времени через пробел (остается для ПК)
window.addEventListener('keydown', e => { if (e.code === 'Space') timeSlow = true; });
window.addEventListener('keyup', e => { if (e.code === 'Space') timeSlow = false; });

// Управление для ПК: частица следует за курсором при зажатой ЛКМ
let isMouseDown = false;
canvas.addEventListener('mousedown', e => {
    if (e.button === 0) { // Только левая кнопка мыши
        isMouseDown = true;
        timeSlow = true;
        targetY = e.offsetY;
    }
});
canvas.addEventListener('mousemove', e => {
    if (isMouseDown) {
        targetY = e.offsetY;
    }
});
canvas.addEventListener('mouseup', e => {
    if (e.button === 0) {
        isMouseDown = false;
        timeSlow = false;
    }
});
canvas.addEventListener('mouseleave', () => { // Если мышь ушла за пределы canvas
    isMouseDown = false;
    timeSlow = false;
});

// Управление для мобильных: частица следует за пальцем
canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    timeSlow = true;
    targetY = e.touches[0].clientY;
});
canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    targetY = e.touches[0].clientY;
});
canvas.addEventListener('touchend', e => {
    e.preventDefault();
    timeSlow = false;
});

// Кнопка реванша
revangeBtn.onclick = () => startGame();

// Кнопка поделиться скриншотом
shareBtn.onclick = () => {
    canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `QuantumRush_${score}.png`;
        a.click();
        URL.revokeObjectURL(url);
    });
};

// Daily Challenge (заглушка)
function loadDailyChallenge() {
    dailyChallengeEl.textContent = 'Daily: Только зигзагообразные препятствия!';
    dailyChallengeEl.style.display = 'block';
}

// Обработка изменения размера окна
window.addEventListener('resize', () => {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
});

// Основной игровой цикл
function gameLoop(ts) {
    if (!running) return;
    let dt = (ts - lastFrame) / 1000;
    lastFrame = ts;
    if (timeSlow && energy > 0) {
        dt *= timeSlowFactor;
        energy -= timeSlowCost;
        if (energy < 0) energy = 0;
    } else if (!timeSlow && energy < 100) {
        energy += 0.12;
        if (energy > 100) energy = 100;
    }
    update(dt);
    render();
    requestAnimationFrame(gameLoop);
}

function startGame() {
    running = true;
    score = 0;
    energy = 100;
    speed = 4;
    lastFrame = performance.now();
    obstacles = [];
    energyCells = [];
    particle.x = width/4;
    particle.y = height/2;
    targetY = height / 2;
    progress = 0;
    rank = 'Новичок';
    nextRankScore = 100;
    revangeBtn.style.display = 'none';
    timeSinceSpeedUp = 0;
    loadDailyChallenge();
    requestAnimationFrame(gameLoop);
}

function update(dt) {
    // Плавное движение частицы к целевой Y-координате
    // Чем больше множитель (здесь 0.2), тем резче и быстрее движение
    particle.y += (targetY - particle.y) * 0.2;

    // Ускорение каждые 15 секунд
    timeSinceSpeedUp += dt;
    if (timeSinceSpeedUp >= 15 && speed < maxSpeed) {
        speed += 1;
        timeSinceSpeedUp = 0;
    }
    // Обновление ранга
    for (let i = ranks.length-1; i >= 0; i--) {
        if (score >= ranks[i].score) {
            rank = ranks[i].name;
            nextRankScore = ranks[i+1] ? ranks[i+1].score : ranks[i].score;
            break;
        }
    }
    // Прогресс-бар
    progress = Math.min(1, (score % 100) / 100);
    // Генерация препятствий
    if (Math.random() < 0.025 + speed*0.002) {
        // Прямоугольник-препятствие
        let h = 60 + Math.random()*80;
        let y = Math.random()*(height-h);
        obstacles.push({x: width+40, y, w: 32+Math.random()*32, h});
    }
    // Генерация энергетических ячеек
    if (Math.random() < 0.01) {
        let y = Math.random()*(height-30)+15;
        energyCells.push({x: width+40, y, r: 12});
    }
    // Движение препятствий и ячеек
    for (let obs of obstacles) obs.x -= speed;
    for (let cell of energyCells) cell.x -= speed;
    // Удаление вышедших за экран
    obstacles = obstacles.filter(o => o.x + o.w > 0);
    energyCells = energyCells.filter(c => c.x + c.r > 0);
    // Столкновения с препятствиями
    for (let obs of obstacles) {
        if (rectCircleCollide(particle, obs)) {
            endGame();
            return;
        }
    }
    // Сбор энергии
    for (let i = energyCells.length-1; i >= 0; i--) {
        let cell = energyCells[i];
        if (circleCollide(particle, cell)) {
            energy = Math.min(100, energy+25);
            energyCells.splice(i,1);
        }
    }
    // Счёт
    score += dt * speed * 10;
    if (energy <= 0) timeSlow = false;
    // Проверка проигрыша (вылет за экран)
    if (particle.y < 0 || particle.y > height) {
        endGame();
    }
}

function render() {
    // Фон: от синего к красному по скорости
    let t = (speed-4)/(maxSpeed-4);
    let bgColor = lerpColor([10,26,60],[255,0,55], t);
    document.body.style.background = `rgb(${bgColor.join(',')})`;
    // Очистка
    ctx.clearRect(0,0,width,height);
    // Препятствия
    ctx.save();
    ctx.fillStyle = '#ff0055';
    for (let obs of obstacles) {
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
    }
    ctx.restore();
    // Энергетические ячейки
    ctx.save();
    ctx.strokeStyle = '#00ff99';
    ctx.lineWidth = 3;
    for (let cell of energyCells) {
        ctx.beginPath();
        ctx.arc(cell.x, cell.y, cell.r, 0, Math.PI*2);
        ctx.stroke();
    }
    ctx.restore();
    // Частица
    ctx.save();
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 16 + 24*t;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.r, 0, Math.PI*2);
    ctx.fillStyle = '#00f0ff';
    ctx.fill();
    ctx.restore();
    // UI
    scoreEl.textContent = Math.floor(score);
    energyEl.textContent = `⚡ ${Math.floor(energy)}`;
    rankEl.textContent = rank;
    progressBar.style.width = (progress*100) + '%';
}

function endGame() {
    running = false;
    revangeBtn.style.display = 'inline-block';
    // TODO: взрыв, звук, сохранение рекорда, лидерборд
}

function lerpColor(a, b, t) {
    return a.map((v,i) => Math.round(v + (b[i]-v)*t));
}

// Проверка столкновения круга и прямоугольника
function rectCircleCollide(circle, rect) {
    let distX = Math.abs(circle.x - rect.x-rect.w/2);
    let distY = Math.abs(circle.y - rect.y-rect.h/2);
    if (distX > (rect.w/2 + circle.r)) return false;
    if (distY > (rect.h/2 + circle.r)) return false;
    if (distX <= (rect.w/2)) return true;
    if (distY <= (rect.h/2)) return true;
    let dx = distX - rect.w/2;
    let dy = distY - rect.h/2;
    return (dx*dx + dy*dy <= (circle.r*circle.r));
}
// Проверка столкновения двух кругов
function circleCollide(a, b) {
    let dx = a.x-b.x, dy = a.y-b.y;
    return (dx*dx+dy*dy) < (a.r+b.r)*(a.r+b.r);
}

// particles.js эффекты (фон) — исправлено: используем отдельный div
if (!document.getElementById('particles-bg')) {
    let div = document.createElement('div');
    div.id = 'particles-bg';
    div.style.position = 'fixed';
    div.style.top = 0;
    div.style.left = 0;
    div.style.width = '100vw';
    div.style.height = '100vh';
    div.style.zIndex = 0;
    document.body.appendChild(div);
    particlesJS('particles-bg', {
        particles: {
            number: { value: 60 },
            color: { value: '#00f0ff' },
            shape: { type: 'circle' },
            opacity: { value: 0.2 },
            size: { value: 2 },
            move: { enable: true, speed: 1 }
        }
    });
}

// Daily Challenge
loadDailyChallenge();

// Автостарт
startGame();  
