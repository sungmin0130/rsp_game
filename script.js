const rewards = ['X1', 'X2', 'X4', 'X8', 'X10', 'X15', 'X20', 'X100'];
const weights = [69, 15, 10, 4, 1.49, 0.5, 0.01, 0];
const colors = ['#ff3333', '#ff9933', '#ffff33', '#66ff66', '#33ffff', '#3399ff', '#cc66ff', '#ff66cc'];
const center = 150;
const radius = 140;
const wheel = document.getElementById('wheel');
let gameStarted = false;
let intervalId;
let computerChoice = '';
const imageMap = { rock: 'rock.png', scissors: 'scissors.png', paper: 'paper.png' };

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

    // 텍스트 위치 및 회전
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
wheel.appendChild(borderCircle); // 가장 위에 노란 원이 오도록 마지막에 추가

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

function changeComputerImage() {
  const choices = ['rock', 'scissors', 'paper'];
  const randomChoice = choices[Math.floor(Math.random() * 3)];
  computerChoice = randomChoice;
  document.getElementById('computer').src = imageMap[randomChoice];
}

document.getElementById('startBtn').addEventListener('click', () => {
  if (gameStarted) return;
  gameStarted = true;
  intervalId = setInterval(changeComputerImage, 30);
  document.getElementById('startBtn').disabled = true;
  document.getElementById('result').textContent = '';
  document.getElementById('finalReward').textContent = '';
  document.getElementById('rouletteContainer').style.display = 'none';
});


function resetGameAfterDelay() {
  setTimeout(() => {
    const resultBox = document.getElementById('result');
    resultBox.style.display = 'none';  // 결과 박스 숨기기
  }, 3000);
}

function userPlay(userChoice) {
  if (!gameStarted) return;
  clearInterval(intervalId);
  document.getElementById('finalReward').textContent = '';
  document.getElementById('rouletteContainer').style.display = 'none';

  const resultBox = document.getElementById('result');
  resultBox.style.display = 'block';

  if (userChoice === computerChoice) {
    resultBox.textContent = "무승부!";
    resetGameAfterDelay();
  } else if (
    (userChoice === 'rock' && computerChoice === 'scissors') ||
    (userChoice === 'scissors' && computerChoice === 'paper') ||
    (userChoice === 'paper' && computerChoice === 'rock')
  ) {
    resultBox.textContent = "이겼습니다!";
    document.getElementById('winSound').play();
    setTimeout(startWheelSpin, 1000);  // 1초 뒤에 startWheelSpin 함수 실행
  } else {
    resultBox.textContent = "졌습니다!";
    resetGameAfterDelay();
  }

  gameStarted = false;
  document.getElementById('startBtn').disabled = false;
}

function startWheelSpin() {
  const rewardDisplay = document.getElementById('finalReward');
  const selected = getRandomReward();
  const index = rewards.indexOf(selected);
  const angle = 360 * 5 + (360 / rewards.length) * (rewards.length - index) - 22.5;

  // 1초 후에 돌림판 보이게 하기
  document.getElementById('rouletteContainer').style.display = 'block';

  wheel.style.transition = 'none';  // 회전 애니메이션 초기화
  wheel.style.transform = 'rotate(0deg)';  // 회전 초기화

  const spinAudio = document.getElementById('spinSound');
spinAudio.currentTime = 0; // 매번 처음부터 재생
spinAudio.play();

  setTimeout(() => {
    wheel.style.transition = 'transform 4s cubic-bezier(0.33, 1, 0.68, 1)';
    wheel.style.transform = `rotate(${angle}deg)`;  // 돌림판 회전
  }, 50);

  setTimeout(() => {
    rewardDisplay.textContent = `보상: ${selected} coins`;
    RewardSound.play();  // 보상 글씨가 나올 때 효과음 재생
  }, 4100);  // 보상 글씨가 4초 후에 나올 때 효과음 실행
}

function playRewardSound() {
  // 오디오가 로드되었는지 확인하고 재생
  if (rewardAudio.readyState >= 3) {
    rewardAudio.currentTime = 0;  // 처음부터 시작
    rewardAudio.volume = 1;  // 볼륨을 50%로 설정 (0 ~ 1 사이)
    rewardAudio.play();
  } else {
    rewardAudio.addEventListener('canplaythrough', () => {
      rewardAudio.currentTime = 0;
      rewardAudio.volume = 0.5;
      rewardAudio.play();
    });
  }
}

function resetGameAfterDelay() {
  setTimeout(() => {
    const resultBox = document.getElementById('result');
    resultBox.style.display = 'none';  // 결과 박스 숨기기
  }, 3000);
}

createWheel();
