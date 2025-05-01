const firebaseConfig = {
  apiKey: "",
  authDomain: "rsp-game-76111.firebaseapp.com",
  projectId: "rsp-game-76111",
  storageBucket: "rsp-game-76111.firebasestorage.app",
  messagingSenderId: "23001569795",
  appId: "1:23001569795:web:07a5b92d63d9e376b20c36",
  measurementId: "G-PT6NJMN905"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const rewards = ['X8', 'X4', 'X15', 'X2', 'X10', 'X20', 'X1', 'X100'];
const weights = [6, 11, 3, 18, 3, 2, 49, 0.1];
const colors = ['#ff3333', '#ff9933', '#ffff33', '#66ff66', '#33ffff', '#3399ff', '#cc66ff', '#ff66cc'];
const center = 150;
const radius = 140;
const wheel = document.getElementById('wheel');
const pointer = document.querySelector('.roulette-wrapper .pointer');
const imageMap = { rock: 'rock.png', scissors: 'scissors.png', paper: 'paper.png' };

let gameStarted = false;
let intervalId;
let computerChoice = '';
let coinCount = 0;
let currentStudentId = null;

function updateCoinDisplay() {
  document.getElementById('coinCount').textContent = coinCount;
}

function login() {
  const input = document.getElementById('studentIdInput');
  const id = input.value.trim();
  if (!id) return alert("(학번 이름)을 입력해주세요.");
  currentStudentId = id;
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('user-info').style.display = 'block';
  document.getElementById('studentIdDisplay').textContent = id;
  updateCoinDisplay();
  input.value = '';
}

function logout() {
  currentStudentId = null;
  document.getElementById('login-section').style.display = 'block';
  document.getElementById('user-info').style.display = 'none';
}

async function updateCoinStats(type, amount) {
  if (!currentStudentId) return;
  const ref = db.collection('userStats').doc(currentStudentId);
  const snap = await ref.get();
  const data = snap.exists ? snap.data() : {
    studentId: currentStudentId,
    totalGames: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    totalCharge: 0,
    totalWithdraw: 0
  };
  if (type === "충전") data.totalCharge += amount;
  if (type === "출금") data.totalWithdraw += amount;
  await ref.set(data);

  await db.collection("coinLogs").add({
    studentId: currentStudentId,
    type,
    amount,
    time: new Date().toISOString()
  });
}

function addCoins() {
  const input = document.getElementById('coinInput');
  const added = parseInt(input.value);
  if (!currentStudentId) return alert("코인 충전을 하려면 먼저 로그인해야 합니다.");
  if (!isNaN(added) && added > 0) {
    coinCount += added;
    updateCoinDisplay();
    updateCoinStats("충전", added);
    input.value = '';
  }
}

function resetCoins() {
  if (!currentStudentId) return alert("출금을 하려면 먼저 로그인해야 합니다.");
  const current = coinCount;
  const confirmReset = confirm(`현재 코인은 ${current}개입니다. 출금하시겠습니까?`);
  if (confirmReset) {
    coinCount = 0;
    updateCoinDisplay();
    alert(`출금이 완료되었습니다. (기존 ${current}개)`);
    updateCoinStats("출금", current);
  }
}

function changeComputerImage() {
  const choices = ['rock', 'scissors', 'paper'];
  const randomChoice = choices[Math.floor(Math.random() * 3)];
  computerChoice = randomChoice;
  document.getElementById('computer').src = imageMap[randomChoice];
}

document.getElementById('startBtn').addEventListener('click', () => {
  if (!currentStudentId) return alert("학번 로그인이 필요합니다.");
  if (gameStarted) return;
  if (coinCount <= 0) return alert("게임을 시작하려면 코인이 필요합니다.");
  coinCount--;
  updateCoinDisplay();
  gameStarted = true;
  intervalId = setInterval(changeComputerImage, 30);
  document.getElementById('startBtn').disabled = true;
  document.getElementById('result').textContent = '';
  document.getElementById('finalReward').textContent = '';
  document.getElementById('rouletteContainer').style.display = 'none';
  pointer.style.display = 'none';

  db.collection("gameLogs").add({
    studentId: currentStudentId,
    type: "게임시작",
    time: new Date().toISOString()
  });
});

async function updateGameResult(resultText) {
  if (!currentStudentId) return;
  const ref = db.collection('userStats').doc(currentStudentId);
  const snap = await ref.get();
  const data = snap.exists ? snap.data() : {
    studentId: currentStudentId,
    totalGames: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    totalCharge: 0,
    totalWithdraw: 0
  };
  data.totalGames++;
  if (resultText.includes("이겼")) data.wins++;
  else if (resultText.includes("무승부")) data.draws++;
  else data.losses++;
  await ref.set(data);

  await db.collection("gameLogs").add({
    studentId: currentStudentId,
    type: "게임결과",
    result: resultText,
    time: new Date().toISOString()
  });
}

function userPlay(userChoice) {
  if (!gameStarted) return;
  clearInterval(intervalId);
  const resultBox = document.getElementById('result');
  resultBox.style.display = 'block';
  let resultText = '';
  if (userChoice === computerChoice) {
    resultText = "무승부!";
    coinCount++;
    updateCoinDisplay();
  } else if (
    (userChoice === 'rock' && computerChoice === 'scissors') ||
    (userChoice === 'scissors' && computerChoice === 'paper') ||
    (userChoice === 'paper' && computerChoice === 'rock')
  ) {
    resultText = "이겼습니다!";
    document.getElementById('winSound')?.play();
    document.getElementById('rouletteContainer').style.display = 'block';
    pointer.style.display = 'block';
    setTimeout(startWheelSpin, 1000);
  } else {
    resultText = "졌습니다!";
  }
  resultBox.textContent = resultText;
  updateGameResult(resultText);
  gameStarted = false;
  document.getElementById('startBtn').disabled = false;
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
    const d = `M ${center} ${center} L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY} Z`;
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
    text.setAttribute("fill", "#fff");
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
    if (rand < cumulative) return rewards[i];
  }
}

function startWheelSpin() {
  const rewardDisplay = document.getElementById('finalReward');
  const selected = getRandomReward();
  const index = rewards.indexOf(selected);
  const degPer = 360 / rewards.length;
  const stopDeg = index * degPer + Math.random() * degPer;
  const extraSpins = 5;
  const targetAngle = 360 * extraSpins + (360 - stopDeg);
  wheel.style.transition = 'none';
  wheel.style.transform = 'rotate(0deg)';
  document.getElementById('spinSound').currentTime = 0;
  document.getElementById('spinSound').play();
  setTimeout(() => {
    wheel.style.transition = 'transform 4s cubic-bezier(0.33, 1, 0.68, 1)';
    wheel.style.transform = `rotate(${targetAngle}deg)`;
  }, 50);
  setTimeout(() => {
    rewardDisplay.textContent = `보상: ${selected} coins`;
    document.getElementById('RewardSound')?.play();
    const numeric = parseInt(selected.replace('X', ''));
    if (!isNaN(numeric)) {
      coinCount += numeric;
      updateCoinDisplay();
    }
    db.collection("gameLogs").add({
      studentId: currentStudentId,
      type: "보상",
      reward: selected,
      time: new Date().toISOString()
    });
  }, 4100);
}

createWheel();
