const ICONS = ['fa-heart', 'fa-star', 'fa-gem', 'fa-bolt', 'fa-fire', 'fa-moon', 'fa-sun', 'fa-crown', 'fa-leaf', 'fa-diamond'];

const state = {
  deck: [],
  firstCard: null,
  secondCard: null,
  lockBoard: false,
  score: 0,
  moves: 0,
  startTime: null,
  timerInterval: null,
  gameStarted: false,
};

const els = {
  board: document.getElementById('memory-board'),
  score: document.getElementById('score'),
  moves: document.getElementById('moves'),
  timer: document.getElementById('timer'),
  best: document.getElementById('best'),
  restartBtn: document.getElementById('restart-btn'),
  playAgainBtn: document.getElementById('play-again-btn'),
  overlay: document.getElementById('win-overlay'),
  winMoves: document.getElementById('win-moves'),
  winTime: document.getElementById('win-time'),
};

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return m + ':' + s;
}

function startTimer() {
  if (state.timerInterval) return;
  state.startTime = Date.now();
  state.timerInterval = setInterval(function() {
    const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
    els.timer.textContent = formatTime(elapsed);
  }, 1000);
}

function stopTimer() {
  clearInterval(state.timerInterval);
  state.timerInterval = null;
}

function getElapsed() {
  if (!state.startTime) return 0;
  return Math.floor((Date.now() - state.startTime) / 1000);
}

function createCard(icon, index) {
  const card = document.createElement('div');
  card.className = 'memory-card';
  card.dataset.icon = icon;
  card.dataset.index = index;

  const front = document.createElement('div');
  front.className = 'memory-card-face memory-card-front';
  front.innerHTML = '?';

  const back = document.createElement('div');
  back.className = 'memory-card-face memory-card-back';
  back.innerHTML = '<i class="fas ' + icon + '"></i>';

  card.appendChild(front);
  card.appendChild(back);
  card.addEventListener('click', function() { flipCard(card); });
  return card;
}

function flipCard(card) {
  if (state.lockBoard) return;
  if (card.classList.contains('flipped')) return;
  if (card.classList.contains('matched')) return;

  if (!state.gameStarted) {
    state.gameStarted = true;
    startTimer();
  }

  card.classList.add('flipped');

  if (!state.firstCard) {
    state.firstCard = card;
    return;
  }

  state.secondCard = card;
  state.moves++;
  els.moves.textContent = state.moves;
  checkMatch();
}

function checkMatch() {
  const a = state.firstCard;
  const b = state.secondCard;

  if (a.dataset.icon === b.dataset.icon) {
    a.classList.add('matched');
    b.classList.add('matched');
    state.score++;
    els.score.textContent = state.score + ' / 10';
    resetTurn();

    if (state.score === 10) {
      setTimeout(win, 600);
    }
  } else {
    state.lockBoard = true;
    setTimeout(function() {
      a.classList.remove('flipped');
      b.classList.remove('flipped');
      resetTurn();
    }, 900);
  }
}

function resetTurn() {
  state.firstCard = null;
  state.secondCard = null;
  state.lockBoard = false;
}

function startGame() {
  stopTimer();
  els.overlay.classList.remove('show');

  state.deck = [];
  state.firstCard = null;
  state.secondCard = null;
  state.lockBoard = false;
  state.score = 0;
  state.moves = 0;
  state.startTime = null;
  state.gameStarted = false;

  els.score.textContent = '0 / 10';
  els.moves.textContent = '0';
  els.timer.textContent = '00:00';
  els.board.innerHTML = '';

  const cardsData = [...ICONS, ...ICONS];
  state.deck = shuffle(cardsData);

  state.deck.forEach(function(icon, i) {
    const card = createCard(icon, i);
    els.board.appendChild(card);
  });
}

function win() {
  stopTimer();
  const elapsed = getElapsed();
  const timeStr = formatTime(elapsed);

  els.winMoves.textContent = state.moves;
  els.winTime.textContent = timeStr;

  const bestRaw = localStorage.getItem('aura_memory_best');
  if (!bestRaw || state.moves < parseInt(bestRaw, 10)) {
    localStorage.setItem('aura_memory_best', state.moves);
    els.best.textContent = state.moves + ' حركة';
  }

  els.overlay.classList.add('show');
}

function loadBest() {
  const bestRaw = localStorage.getItem('aura_memory_best');
  if (bestRaw) {
    els.best.textContent = bestRaw + ' حركة';
  }
}

els.restartBtn.addEventListener('click', startGame);
els.playAgainBtn.addEventListener('click', startGame);

loadBest();
startGame();
