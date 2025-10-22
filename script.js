// =======================================================
// CONFIGURAÇÃO INICIAL
// =======================================================
console.log("Script iniciado.");
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const messageElement = document.getElementById('message');

const playerSpriteSheet = new Image();
const backgroundImage = new Image();
const handObstacleImage = new Image();
const batDogImage = new Image();
const floorImage = new Image();
const menuImage = new Image();
const gameOverImage = new Image();

let GAME_WIDTH, GAME_HEIGHT, PLAYER_Y_INITIAL;

const FLOOR_IMAGE_HEIGHT = 64;

const PLAYER_DISPLAY_HEIGHT = 192;
const PLAYER_DISPLAY_WIDTH = 150;

let player = {
    x: 50,
    y: 0,
    width: PLAYER_DISPLAY_WIDTH,
    height: PLAYER_DISPLAY_HEIGHT,
    velocityY: 0,
    isJumping: false,
};

let dangers = [];
const HAND_IMAGE_WIDTH = 64;
const HAND_IMAGE_HEIGHT = 96;
const HAND_OBSTACLE_SCALE = 2.0;
const BATDOG_IMAGE_WIDTH = 200;
const BATDOG_IMAGE_HEIGHT = 200;
const BATDOG_OBSTACLE_SCALE = 0.5;

let score = 0;
let highScore = 0;
const INITIAL_GAME_SPEED = 18;
let gameSpeed = INITIAL_GAME_SPEED;
const GAME_SPEED_INCREMENT = 0.001;
let dangerSpawnTimer = 0;
let isGameOver = true;
let gameFrame = 0;
let isGameReady = false;
let showMenuScreen = true;
let showGameOverScreen = false;
let animationFrameId = null;

let backgroundX = 0;
const backgroundSpeedModifier = 0.5;
let floorX = 0;

// --- CORREÇÃO: PARÂMETROS DO BALANÇO AUMENTADO ---
const SWAY_AMPLITUDE = 10; // Quão alto/baixo ela balança (Estava 4)
const SWAY_SPEED = 0.1;   // Quão rápido ela balança
// ---------------------------------------------

function saveHighScore() {
    localStorage.setItem('coralineGameHighScore', highScore);
    console.log("Novo recorde salvo:", highScore);
}

function loadHighScore() {
    const savedScore = localStorage.getItem('coralineGameHighScore');
    if (savedScore) {
        highScore = parseInt(savedScore, 10);
    }
    console.log("Recorde carregado:", highScore);
}

function resizeGame() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    GAME_WIDTH = canvas.width;
    GAME_HEIGHT = canvas.height;

    PLAYER_Y_INITIAL = (GAME_HEIGHT - FLOOR_IMAGE_HEIGHT) - PLAYER_DISPLAY_HEIGHT + 10;

    if (!player.isJumping) {
        let initialSwayOffset = Math.sin(gameFrame * SWAY_SPEED) * SWAY_AMPLITUDE;
        player.y = PLAYER_Y_INITIAL + initialSwayOffset;
    }

    console.log(`Jogo redimensionado para: ${GAME_WIDTH}x${GAME_HEIGHT}`);
    if (showMenuScreen || showGameOverScreen) {
        drawCurrentScreen();
    }
}
window.addEventListener('resize', resizeGame);
resizeGame();


// =======================================================
// FUNÇÕES DE DESENHO
// =======================================================
function drawBackground() {
    ctx.drawImage(backgroundImage, backgroundX, 0, GAME_WIDTH, GAME_HEIGHT);
    ctx.drawImage(backgroundImage, backgroundX + GAME_WIDTH, 0, GAME_WIDTH, GAME_HEIGHT);
}

function drawFloor() {
    if (!floorImage.complete || floorImage.naturalWidth === 0) return;
    ctx.imageSmoothingEnabled = false;
    const floorY = GAME_HEIGHT - FLOOR_IMAGE_HEIGHT;
    ctx.drawImage(floorImage, floorX, floorY, GAME_WIDTH, FLOOR_IMAGE_HEIGHT);
    ctx.drawImage(floorImage, floorX + GAME_WIDTH, floorY, GAME_WIDTH, FLOOR_IMAGE_HEIGHT);
}

function drawPlayer() {
    if (playerSpriteSheet.complete && playerSpriteSheet.naturalWidth > 0) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(playerSpriteSheet, player.x, player.y, player.width, player.height);
    } else {
        ctx.fillStyle = 'gray'; ctx.fillRect(player.x, player.y, player.width, player.height);
    }
}

function drawDangers() {
    dangers.forEach(danger => {
         if (danger.type === 'bat') {
            if (batDogImage.complete && batDogImage.naturalWidth > 0) {
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(batDogImage, danger.x, danger.y, danger.width, danger.height);
            } else {
                ctx.fillStyle = '#8b0000'; ctx.fillRect(danger.x, danger.y, danger.width, danger.height);
            }
        } else if (danger.type === 'hand' && handObstacleImage.complete && handObstacleImage.naturalWidth > 0) {
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(handObstacleImage, danger.x, danger.y, danger.width, danger.height);
        } else {
            ctx.fillStyle = 'purple'; ctx.fillRect(danger.x, danger.y, danger.width, danger.height);
        }
    });
}


function drawUI() {
    ctx.font = "28px 'Nosifer', cursive, sans-serif";
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    const scoreText = `Pontos: ${Math.floor(score / 10)}`;
    const highScoreText = `Recorde: ${highScore}`;
    const padding = 15;
    ctx.fillText(scoreText, GAME_WIDTH - padding, padding);
    ctx.fillText(highScoreText, GAME_WIDTH - padding, padding + 40);
}

function drawMenuScreen() {
    if (menuImage.complete && menuImage.naturalWidth > 0) {
        ctx.drawImage(menuImage, 0, 0, GAME_WIDTH, GAME_HEIGHT);
        ctx.font = "32px 'Nosifer', cursive, sans-serif";
        ctx.fillStyle = "#FFFFFF"; ctx.textAlign = "right"; ctx.textBaseline = "top";
        const highScoreText = `RECORDE: ${highScore}`;
        ctx.fillText(highScoreText, GAME_WIDTH - 20, 20);
    } else {
        ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        ctx.fillStyle = 'black'; ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        ctx.font = "30px Arial"; ctx.fillStyle = "white"; ctx.textAlign = "center";
        ctx.fillText("Carregando Menu...", GAME_WIDTH / 2, GAME_HEIGHT / 2);
    }
}

function drawGameOverScreen() {
    if (gameOverImage.complete && gameOverImage.naturalWidth > 0) {
        ctx.drawImage(gameOverImage, 0, 0, GAME_WIDTH, GAME_HEIGHT);
        const padding = 20; const fontSize = "40px"; const otherTextFontSize = "32px";
        ctx.font = `${fontSize} 'Nosifer', cursive, sans-serif`; ctx.fillStyle = "#FF0000"; ctx.textBaseline = "top";
        const finalScore = Math.floor(score / 10); const scoreDisplay = `Pontos: ${finalScore}`; const highScoreDisplay = `Recorde: ${highScore}`;
        ctx.textAlign = "left"; ctx.fillText(scoreDisplay, padding, padding);
        ctx.textAlign = "right"; ctx.fillText(highScoreDisplay, GAME_WIDTH - padding, padding);
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        if (messageElement.textContent.startsWith("NOVO RECORDE")) {
            ctx.font = `44px 'Nosifer', cursive, sans-serif`; ctx.fillStyle = "gold";
            ctx.fillText(messageElement.textContent, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 60);
        } else {
             ctx.font = `${otherTextFontSize} 'Nosifer', cursive, sans-serif`; ctx.fillStyle = "#FF0000";
             ctx.fillText("Pressione Espaço para Reiniciar", GAME_WIDTH / 2, GAME_HEIGHT / 2 + 100);
        }
    } else {
        ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT); ctx.fillStyle = 'black'; ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        ctx.font = "30px Arial"; ctx.fillStyle = "white"; ctx.textAlign = "center";
        ctx.fillText("Game Over - Carregando...", GAME_WIDTH / 2, GAME_HEIGHT / 2);
    }
}

function drawCurrentScreen() {
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    if (showMenuScreen) { drawMenuScreen(); }
    else if (showGameOverScreen) { drawGameOverScreen(); }
    else if (isGameReady) {
        drawBackground(); drawFloor(); drawPlayer(); drawDangers(); drawUI();
    } else {
        ctx.fillStyle = 'black'; ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        ctx.font = "30px Arial"; ctx.fillStyle = "white"; ctx.textAlign = "center";
        ctx.fillText(messageElement.textContent || "Carregando...", GAME_WIDTH / 2, GAME_HEIGHT / 2);
    }
}


// =======================================================
// FUNÇÕES DE ATUALIZAÇÃO (LÓGICA)
// =======================================================
function updateBackground() {
    const currentBackgroundSpeed = gameSpeed * backgroundSpeedModifier;
    backgroundX -= currentBackgroundSpeed;
    if (backgroundX < -GAME_WIDTH) { backgroundX = 0; }
}

function updateFloor() {
    floorX -= gameSpeed;
    if (floorX < -GAME_WIDTH) {
        floorX = 0;
    }
}

function updatePlayer() {
    if (player.isJumping) {
        player.velocityY += 1.0;
        player.y += player.velocityY;
        if (player.y > PLAYER_Y_INITIAL) {
            player.y = PLAYER_Y_INITIAL;
            player.velocityY = 0;
            player.isJumping = false;
             let swayOffset = Math.sin(gameFrame * SWAY_SPEED) * SWAY_AMPLITUDE;
             player.y += swayOffset;
        }
    } else {
        // Balanço quando está no chão (agora com amplitude maior)
        let swayOffset = Math.sin(gameFrame * SWAY_SPEED) * SWAY_AMPLITUDE;
        player.y = PLAYER_Y_INITIAL + swayOffset;
    }
}

function updateDangers() {
    dangerSpawnTimer++;
    const baseSpawnTime = Math.max(30, 70 - Math.floor(score / 200));
    const spawnThreshold = baseSpawnTime - gameSpeed * 1.5 + Math.random() * 35;
    if (dangerSpawnTimer > spawnThreshold) {
        const canSpawnBat = Math.random() < 0.25 && score > 50;
        if (canSpawnBat) {
            const width = BATDOG_IMAGE_WIDTH * BATDOG_OBSTACLE_SCALE;
            const height = BATDOG_IMAGE_HEIGHT * BATDOG_OBSTACLE_SCALE;
            dangers.push({ x: GAME_WIDTH, y: PLAYER_Y_INITIAL - 120, width, height, type: 'bat' });
            dangerSpawnTimer = 0;
        } else {
            const width = HAND_IMAGE_WIDTH * HAND_OBSTACLE_SCALE;
            const height = HAND_IMAGE_HEIGHT * HAND_OBSTACLE_SCALE;
            dangers.push({ x: GAME_WIDTH, y: (GAME_HEIGHT - FLOOR_IMAGE_HEIGHT) - height + 15, width, height, type: 'hand' });
            dangerSpawnTimer = -40;
        }
    }
    dangers.forEach(danger => { danger.x -= gameSpeed; });
    dangers = dangers.filter(danger => danger.x + danger.width > 0);
}

function checkCollision() {
    dangers.forEach(danger => {
        // Hitbox ajustada para a nova amplitude maior
        const playerHitbox = {
            x: player.x + 30,
            y: player.y + SWAY_AMPLITUDE, // Ignora topo do balanço
            width: player.width - 60,
            height: player.height - SWAY_AMPLITUDE * 2 // Hitbox vertical menor
        };

        let dangerHitbox = { x: danger.x, y: danger.y, width: danger.width, height: danger.height };
        if (danger.type === 'hand') {
            const pad = 30; dangerHitbox.x += pad; dangerHitbox.width -= (pad * 2);
        } else if (danger.type === 'bat') {
            const padX = 35; const padY = 35;
            dangerHitbox.x += padX; dangerHitbox.width -= (padX * 2);
            dangerHitbox.y += padY; dangerHitbox.height -= (padY * 1.5);
        }
        if (playerHitbox.x < dangerHitbox.x + dangerHitbox.width && playerHitbox.x + playerHitbox.width > dangerHitbox.x &&
            playerHitbox.y < dangerHitbox.y + dangerHitbox.height && playerHitbox.y + playerHitbox.height > dangerHitbox.y) {
            gameOver();
        }
    });
}

function updateScore() {
    score++;
}

// =======================================================
// CONTROLE DO JOGO
// =======================================================
function startGameLoop() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    gameSpeed = INITIAL_GAME_SPEED;
    console.log("Iniciando gameLoop com gameSpeed:", gameSpeed);
    function loop() {
        if (isGameOver || showMenuScreen || showGameOverScreen) {
             drawCurrentScreen();
             animationFrameId = null;
             console.log("Parando gameLoop.");
             return;
        }
        drawCurrentScreen();
        updateBackground(); updateFloor(); updatePlayer();
        updateDangers(); checkCollision(); updateScore();
        gameSpeed += GAME_SPEED_INCREMENT;
        gameFrame++;
        animationFrameId = requestAnimationFrame(loop);
    }
    animationFrameId = requestAnimationFrame(loop);
}

function stopGameLoop() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
        console.log("gameLoop parado explicitamente.");
    }
}

function resetGame() {
    console.log("Função resetGame() FOI CHAMADA.");
    player.velocityY = 0;
    player.isJumping = false;
    dangers = [];
    score = 0;
    gameSpeed = INITIAL_GAME_SPEED;
    console.log("Velocidade resetada para:", gameSpeed);
    isGameOver = false;
    messageElement.style.display = 'none';
    showMenuScreen = false;
    showGameOverScreen = false;
    gameFrame = 0;

    let initialSwayOffset = Math.sin(gameFrame * SWAY_SPEED) * SWAY_AMPLITUDE;
    player.y = PLAYER_Y_INITIAL + initialSwayOffset;

    startGameLoop();
}

function gameOver() {
    isGameOver = true;
    showGameOverScreen = true;
    stopGameLoop();
    const finalScore = Math.floor(score / 10);

    if (finalScore > highScore) {
        highScore = finalScore;
        saveHighScore();
        messageElement.textContent = `NOVO RECORDE: ${highScore}!`;
    } else {
        messageElement.textContent = `Pontos: ${finalScore}. Pressione Espaço.`;
    }
    console.log("Game Over. Pontuação:", finalScore);
    drawCurrentScreen();
}

// =======================================================
// CONTROLES DO USUÁRIO E INÍCIO
// =======================================================
window.addEventListener('keydown', (e) => {
    console.log("Tecla pressionada:", e.code);
    if (e.code === 'Space' || e.keyCode === 32) {
        console.log("Barra de espaço detectada!");
        e.preventDefault();
        if (showMenuScreen && isGameReady) {
            console.log("Iniciando jogo a partir do menu...");
            showMenuScreen = false;
            resetGame();
        } else if (showGameOverScreen && isGameReady) {
            console.log("Reiniciando jogo após Game Over...");
            resetGame();
        } else if (!isGameOver && !showMenuScreen && !showGameOverScreen && !player.isJumping) {
            console.log("Jogador pulou!");
            player.isJumping = true; player.velocityY = -27;
            player.y = PLAYER_Y_INITIAL; // Tira o offset de balanço ao pular
        }
    }
});

// --- Gerenciador de carregamento ---
messageElement.textContent = "Carregando...";
console.log("Iniciando carregamento de imagens...");
loadHighScore();
const totalImages = 7;
let imagesLoaded = 0;

function onImageLoad(e) {
    let rawFilename = e.target.src.split('/').pop();
    let filename = decodeURIComponent(rawFilename);
    imagesLoaded++;
    console.log(`Imagem carregada: ${filename} (${imagesLoaded}/${totalImages})`);

    // Verifica pelo nome DECODIFICADO
    if (filename.startsWith('coraline_sprite')) { console.log(`INFO: '${filename}' carregada.`);}
    else if (filename.startsWith('MAO2')) { console.log(`INFO: '${filename}' carregada.`);}
    else if (filename.startsWith('cachorro')) { console.log(`INFO: '${filename}' carregada.`);}
    else if (filename.startsWith('chaopan')) { console.log(`INFO: '${filename}' carregada.`);}
    else if (filename.startsWith('menu pronto')) { console.log(`INFO: '${filename}' carregada.`);}
    else if (filename.startsWith('16 Sem Título')) { console.log(`INFO: '${filename}' carregada.`);}

    if (imagesLoaded === totalImages) {
        console.log("Todas as imagens carregadas. Pronto para iniciar!");
        isGameReady = true;
        messageElement.style.display = 'none';
        drawCurrentScreen();
    }
}

function onImageError(e) {
    let filename = e.target.src.split('/').pop();
    console.error(`ERRO: A imagem '${filename}' não foi encontrada.`);
    messageElement.textContent = `ERRO: '${filename}' não encontrada. Verifique o nome!`;
}

// Configura handlers...
playerSpriteSheet.onload = onImageLoad; backgroundImage.onload = onImageLoad;
handObstacleImage.onload = onImageLoad; batDogImage.onload = onImageLoad;
floorImage.onload = onImageLoad; menuImage.onload = onImageLoad;
gameOverImage.onload = onImageLoad;

playerSpriteSheet.onerror = onImageError; backgroundImage.onerror = onImageError;
handObstacleImage.onerror = onImageError; batDogImage.onerror = onImageError;
floorImage.onerror = onImageError; menuImage.onerror = onImageError;
gameOverImage.onerror = onImageError;

// Define .src...
playerSpriteSheet.src = 'https://uploads.onecompiler.io/43s2gp4fr/43znayj4u/coraline_sprite.png';
backgroundImage.src = 'https://uploads.onecompiler.io/43s2gp4fr/43znayj4u/ceu.png';
handObstacleImage.src = 'https://uploads.onecompiler.io/43s2gp4fr/43znayj4u/MAO2.png';
batDogImage.src = 'https://uploads.onecompiler.io/43s2gp4fr/43znayj4u/cachorro.png';
floorImage.src = 'https://uploads.onecompiler.io/43s2gp4fr/43znayj4u/chaopan.png';
menuImage.src = 'https://uploads.onecompiler.io/43s2gp4fr/43znayj4u/menu%20pronto.png';
gameOverImage.src = 'https://uploads.onecompiler.io/43s2gp4fr/43znayj4u/16%20Sem%20T%C3%ADtulo_20251022144045.png';
