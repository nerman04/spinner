let angle = 0; // 현재 회전 각도
let targetAngle = 0; // 목표 각도
let spinning = false;
let spinStart = 0;
let spinDuration = 3000; // 회전 시간(ms)
let selectedItem = null;

function drawWheel() {
  let total = items.reduce((sum, i) => sum + i.weight, 0);
  let startAngle = 0;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();

  ctx.translate(150, 150);
  ctx.rotate(angle);
  ctx.translate(-150, -150);

  items.forEach((item) => {
    let sliceAngle = (item.weight / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(150, 150);
    ctx.arc(150, 150, 150, startAngle, startAngle + sliceAngle);
    ctx.fillStyle = randomColor(item.name);
    ctx.fill();
    ctx.fillStyle = "black";
    ctx.font = "14px sans-serif";
    ctx.save();
    ctx.translate(150, 150);
    ctx.rotate(startAngle + sliceAngle / 2);
    ctx.fillText(item.name, 60, 5);
    ctx.restore();
    startAngle += sliceAngle;
  });

  ctx.restore();

  // 중앙 화살표
  ctx.beginPath();
  ctx.moveTo(150, 0);
  ctx.lineTo(145, 20);
  ctx.lineTo(155, 20);
  ctx.closePath();
  ctx.fillStyle = "red";
  ctx.fill();
}

function startSpin() {
  if (spinning) return;
  const total = items.reduce((sum, i) => sum + i.weight, 0);
  const rand = Math.random() * total;
  let accum = 0;
  let selectedIndex = 0;
  for (let i = 0; i < items.length; i++) {
    accum += items[i].weight;
    if (rand < accum) {
      selectedIndex = i;
      break;
    }
  }

  selectedItem = items[selectedIndex];

  // 회전 각도 설정
  const sliceAngle = (items[selectedIndex].weight / total) * 360;
  const baseAngle = items
    .slice(0, selectedIndex)
    .reduce((sum, i) => sum + (i.weight / total) * 360, 0);
  const offset = Math.random() * sliceAngle;

  // 5바퀴 + 랜덤 offset을 목표로 설정
  targetAngle = ((360 * 5 + (360 - baseAngle - offset)) * Math.PI) / 180;
  spinStart = null;
  spinning = true;
  requestAnimationFrame(animate);
}

function animate(timestamp) {
  if (!spinStart) spinStart = timestamp;
  const progress = timestamp - spinStart;
  const t = Math.min(progress / spinDuration, 1);
  angle = easeOutCubic(t) * targetAngle;

  drawWheel();

  if (t < 1) {
    requestAnimationFrame(animate);
  } else {
    spinning = false;
    angle %= 2 * Math.PI;
    setTimeout(() => {
      alert(`🎉 당첨: ${selectedItem.name}`);
    }, 300);
  }
}

function easeOutCubic(t) {
  return --t * t * t + 1;
}
