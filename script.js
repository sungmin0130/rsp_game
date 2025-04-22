const rewards = ['X8', 'X4', 'X15', 'X2', 'X10', 'X20', 'X1', 'X100'];
const weights = [6, 11, 3, 16, 3, 2, 51, 0.1];
const colors = ['#ff3333', '#ff9933', '#ffff33', '#66ff66', '#33ffff', '#3399ff', '#cc66ff', '#ff66cc'];
const center = 150;
const radius = 140;
const wheel = document.getElementById('wheel');
let gameStarted = false;
let intervalId;
let computerChoice = '';
let coinCount = 0;
const imageMap = { rock: 'rock.png', scissors: 'scissors.png', paper: 'paper.png' };

function updateCoinDisplay() {
  document.getElementById('coinCount').textContent = coinCount;
}

function addCoins() {
  const input = document.getElementById('coinInput');
  const added = parseInt(input.value);
  if (!isNaN(added) && added > 0) {
    coinCount += added;
    updateCoinDisplay();
    input.value = '';
  }
}

function createWheel() {
  wheel.innerHTML = '';
  const anglePerSegment = 360 / rewards.length;

  for (let i = 0; i < rewards.length; i++) {
    const startAngle = anglePerSegment * i;
    const endAngle = anglePerSegment * (i + 1);
    const largeArc = anglePerSegment > 180 ? 1 : 0;

    const startX = center + radius * Math.cos((startAngle - 90) * Math.PI / 180);
    const startY = center + radius * Math.sin((startAngle - 90) * Math.PI / 180);
    const endX = center + radius * Math.cos((endAngle - 90) * Math.PI / 180);
    const endY = center + radius * Math.sin((endAngle - 90) * Math.PI / 180);

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const d = `
      M ${center} ${center}
      L ${startX} ${startY}
      A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY}
      Z
    `;
    path.setAttribute('d', d);
    path.setAttribute('fill', colors[i]);
    path.setAttribute('stroke', 'gold');
    path.setAttribute('stroke-width', '2');
    wheel.appendChild(path);

    const textAngle = (startAngle + endAngle) / 2 - 90;
    const textRadius = radius * 0.75;
    const textX = center + textRadius * Math.cos(textAngle * Math.PI / 180);
    const textY = center + textRadius * Math.sin(textAngle * Math.PI / 180);
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", textX);
    text.setAttribute("y", textY);
    text.setAttribute("fill", "#ffffff");
    text.setAttribute("font-size", "18");
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "middle");
    text.setAttribute("transform", `rotate(${textAngle + 90}, ${textX}, ${textY})`);
    text.textContent = rewards[i];
    wheel.appendChild(text);
  }

  const borderCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  borderCircle.setAttribute("cx", center);
  borderCircle.setAttribute("cy", center);
  borderCircle.setAttribute("r", radius);
  borderCircle.setAttribute("stroke", "gold");
  borderCircle.setAttribute("stroke-width", "15");
  borderCircle.setAttribute("fill", "none");
  wheel.appendChild(borderCircle);
}

function getRandomReward() {
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const rand = Math.random() * totalWeight;

  let cumulative = 0;
  for (let i = 0; i < rewards.length; i++) {
    cumulative += weights[i];
    if (rand < cumulative) {
      return rewards[i];
    }
  }
}

document.getElementById('startBtn').addEventListener('click', () => {
  if (gameStarted) return;
  if (coinCount <= 0) {
    alert("게임을 시작하려면 코인이 필요합니다.");
    return;
  }

  coinCount -= 1;
  updateCoinDisplay();

  gameStarted = true;
  intervalId = setInterval(changeComputerImage, 30);
  document.getElementById('startBtn').disabled = true;
  document.getElementById('result').textContent = '';
  document.getElementById('finalReward').textContent = '';
  document.getElementById('rouletteContainer').style.display = 'none';
});

function changeComputerImage() {
  const choices = ['rock', 'scissors', 'paper'];
  const randomChoice = choices[Math.floor(Math.random() * 3)];
  computerChoice = randomChoice;
  document.getElementById('computer').src = imageMap[randomChoice];
}

function userPlay(userChoice) {
  if (!gameStarted) return;
  clearInterval(intervalId);

  const resultBox = document.getElementById('result');
  resultBox.style.display = 'block';

  if (userChoice === computerChoice) {
    resultBox.textContent = "무승부!";
  } else if (
    (userChoice === 'rock' && computerChoice === 'scissors') ||
    (userChoice === 'scissors' && computerChoice === 'paper') ||
    (userChoice === 'paper' && computerChoice === 'rock')
  ) {
    resultBox.textContent = "이겼습니다!";
    document.getElementById('winSound')?.play();
    setTimeout(startWheelSpin, 1000);
  } else {
    resultBox.textContent = "졌습니다!";
  }

  gameStarted = false;
  document.getElementById('startBtn').disabled = false;
}

function startWheelSpin() {
  const rewardDisplay = document.getElementById('finalReward');
  const selected = getRandomReward();                    // 예: 'X4'
  const index = rewards.indexOf(selected);               // 예: 2
  const degPer = 360 / rewards.length;                   // 한 구역의 각도 (예: 45도)

  // 🟡 보상 구역 시작각도
  const startDeg = index * degPer;

  // ✅ 구역 내에서 랜덤한 위치 (0 ~ degPer 사이)
  const randomOffsetInSegment = Math.random() * degPer;

  // 📌 포인터가 가리켜야 할 각도 (시계방향 회전)
  const stopDeg = startDeg + randomOffsetInSegment;

  // 회전 각도 = 여러 바퀴 + (360 - stopDeg)
  const extraSpins = 5;
  const targetAngle = 360 * extraSpins + (360 - stopDeg);

  // 돌림판 초기화
  document.getElementById('rouletteContainer').style.display = 'block';
  wheel.style.transition = 'none';
  wheel.style.transform = 'rotate(0deg)';

  const spinAudio = document.getElementById('spinSound');
  spinAudio.currentTime = 0;
  spinAudio.play();

  // 실제 회전
  setTimeout(() => {
    wheel.style.transition = 'transform 4s cubic-bezier(0.33, 1, 0.68, 1)';
    wheel.style.transform = `rotate(${targetAngle}deg)`;
  }, 50);

  // 결과 출력 및 코인 지급
  setTimeout(() => {
    rewardDisplay.textContent = `보상: ${selected} coins`;
    document.getElementById('RewardSound')?.play();

    const numericReward = parseInt(selected.replace('X', ''), 10);
    if (!isNaN(numericReward)) {
      coinCount += numericReward;
      updateCoinDisplay();
    }
  }, 4100);
}


function resetCoins() {
  const current = coinCount;
  const totalValue = current * 100;

  const confirmReset = confirm(`현재 코인은 ${current}개입니다.\n총 ${totalValue.toLocaleString()}원입니다.\n정말로 출금하시겠습니까?`);

  if (confirmReset) {
    coinCount = 0;
    updateCoinDisplay();
    alert(`출금이 완료 되었습니다. (기존 ${current}개 = ${totalValue.toLocaleString()}원)`);
  }
}




createWheel();