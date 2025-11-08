// 贪吃蛇游戏 - 增强版

// 游戏常量定义
const FOOD_TYPES = {
    BASIC: { type: 'basic', points: 10, color: '#f39c12', duration: null },
    ENERGY: { type: 'energy', points: 25, color: '#f1c40f', duration: 5000, effect: 'speedup' },
    SLOW: { type: 'slow', points: 15, color: '#3498db', duration: 5000, effect: 'slowdown' },
    DOUBLE: { type: 'double', points: 50, color: '#9b59b6', duration: 15000, effect: 'doublepoints' },
    SHRINK: { type: 'shrink', points: 5, color: '#2ecc71', duration: null, effect: 'shrink' }
};

const GAME_MODES = {
    CLASSIC: 'classic',
    CHALLENGE: 'challenge',
    TIMED: 'timed'
};

const SNAKE_SKINS = {
    DEFAULT: 'default',
    RAINBOW: 'rainbow',
    PIXEL: 'pixel',
    METAL: 'metal'
};

class SnakeGame {
    constructor() {
        // 获取DOM元素
        this.canvas = document.getElementById('snake-game');
        this.ctx = this.canvas.getContext('2d');
        
        // 游戏信息元素
        this.scoreElement = document.getElementById('score');
        this.highScoreElement = document.getElementById('high-score');
        this.gameModeElement = document.getElementById('game-mode');
        this.timeLeftElement = document.getElementById('time-left');
        this.timeLeftSpan = this.timeLeftElement.querySelector('span');
        this.powerUpElement = document.getElementById('power-up');
        this.powerUpSpan = this.powerUpElement.querySelector('span');
        this.powerUpCountdown = this.powerUpElement.querySelector('.countdown');
        
        // 按钮元素
        this.startButton = document.getElementById('start-btn');
        this.pauseButton = document.getElementById('pause-btn');
        this.restartButton = document.getElementById('restart-btn');
        this.backToMenuButton = document.getElementById('back-to-menu');
        this.historyButton = document.getElementById('history-btn');
        
        // 菜单元素
        this.mainMenu = document.getElementById('main-menu');
        this.gameContainer = document.getElementById('game-container');
        this.settingsMenu = document.getElementById('settings-menu');
        this.historyMenu = document.getElementById('history-menu');
        this.historyTable = document.getElementById('history-table').querySelector('tbody');
        this.historyBackButton = document.getElementById('history-back-btn');
        this.historyFilterSelect = document.getElementById('history-filter');
        this.historyClearButton = document.getElementById('history-clear-btn');
        
        // 设置元素
        this.snakeSkinSelect = document.getElementById('snake-skin');
        this.soundEffectsCheckbox = document.getElementById('sound-effects');
        
        // 游戏配置
        this.gridSize = 20;
        this.speed = 150; // 初始速度，毫秒
        this.gameSpeed = this.speed;
        this.maxSpeed = 80; // 最大速度
        this.speedIncrease = 2; // 每次加速的毫秒数
        
        // 游戏状态
        this.snake = [];
        this.food = {};
        this.specialFoods = [];
        this.obstacles = [];
        this.direction = '';
        this.nextDirection = '';
        this.score = 0;
        this.gameMode = GAME_MODES.CLASSIC;
        this.snakeSkin = SNAKE_SKINS.DEFAULT;
        this.soundEnabled = true;
        this.gameStartTime = null;
        
        // 游戏数据
        this.highScores = {
            [GAME_MODES.CLASSIC]: localStorage.getItem('snakeClassicHighScore') || 0,
            [GAME_MODES.CHALLENGE]: localStorage.getItem('snakeChallengeHighScore') || 0,
            [GAME_MODES.TIMED]: localStorage.getItem('snakeTimedHighScore') || 0
        };
        
        // 游戏计时器和状态
        this.gameInterval = null;
        this.timedModeInterval = null;
        this.powerUpInterval = null;
        this.specialFoodTimer = 0;
        this.isRunning = false;
        this.isPaused = false;
        this.gameOver = false;
        
        // 特殊效果
        this.activeEffects = {};
        this.timeRemaining = 60; // 限时模式时间（秒）
        
        // 初始化游戏
        this.init();
        // 初始化历史记录
        this.historyRecords = [];
        this.loadHistoryRecords();
    }
    
    // 初始化游戏
    init() {
        // 设置最高分
        this.updateHighScoreDisplay();
        
        // 加载设置和历史记录
        this.loadSettings();
        this.loadHistoryRecords();
        
        // 渲染初始画面
        this.render();
        
        // 添加事件监听器
        this.addEventListeners();
        
        // 禁用暂停按钮
        this.pauseButton.disabled = true;
    }
    
    // 加载设置
    loadSettings() {
        const savedSkin = localStorage.getItem('snakeSkin');
        if (savedSkin && SNAKE_SKINS[savedSkin.toUpperCase()]) {
            this.snakeSkin = savedSkin;
            this.snakeSkinSelect.value = savedSkin;
        }
        
        const soundEnabled = localStorage.getItem('snakeSoundEnabled');
        if (soundEnabled !== null) {
            this.soundEnabled = soundEnabled === 'true';
            this.soundEffectsCheckbox.checked = this.soundEnabled;
        }
    }
    
    // 保存设置
    saveSettings() {
        localStorage.setItem('snakeSkin', this.snakeSkin);
        localStorage.setItem('snakeSoundEnabled', this.soundEnabled.toString());
    }
    
    // 重置游戏
    resetGame() {
        // 清除所有定时器
        if (this.gameInterval) clearInterval(this.gameInterval);
        if (this.timedModeInterval) clearInterval(this.timedModeInterval);
        if (this.powerUpInterval) clearInterval(this.powerUpInterval);
        
        // 初始化蛇的位置
        const centerX = Math.floor(this.canvas.width / (2 * this.gridSize)) * this.gridSize;
        const centerY = Math.floor(this.canvas.height / (2 * this.gridSize)) * this.gridSize;
        
        this.snake = [
            { x: centerX, y: centerY },
            { x: centerX - this.gridSize, y: centerY },
            { x: centerX - this.gridSize * 2, y: centerY }
        ];
        
        // 初始化方向
        this.direction = 'right';
        this.nextDirection = 'right';
        
        // 生成食物和障碍物
        this.generateFood();
        this.specialFoods = [];
        this.generateObstacles();
        
        // 重置分数和速度
        this.score = 0;
        this.scoreElement.textContent = this.score;
        this.gameSpeed = this.speed;
        
        // 根据游戏模式设置
        this.gameModeElement.textContent = this.getModeDisplayName();
        
        if (this.gameMode === GAME_MODES.TIMED) {
            this.timeRemaining = 60;
            this.timeLeftSpan.textContent = this.timeRemaining;
            this.timeLeftElement.style.display = 'block';
        } else {
            this.timeLeftElement.style.display = 'none';
        }
        
        // 重置特殊效果
        this.activeEffects = {};
        this.powerUpElement.style.display = 'none';
        
        // 重置游戏状态
        this.gameOver = false;
        this.isPaused = false;
        this.specialFoodTimer = 0;
        
        // 更新按钮状态
        this.pauseButton.disabled = !this.isRunning;
        this.pauseButton.textContent = '暂停游戏';
    }
    
    // 获取游戏模式显示名称
    getModeDisplayName() {
        switch (this.gameMode) {
            case GAME_MODES.CLASSIC:
                return '经典模式';
            case GAME_MODES.CHALLENGE:
                return '挑战模式';
            case GAME_MODES.TIMED:
                return '限时模式';
            default:
                return '经典模式';
        }
    }
    
    // 添加事件监听器
    addEventListeners() {
        // 游戏按钮事件
        this.startButton.addEventListener('click', () => this.startGame());
        this.pauseButton.addEventListener('click', () => this.pauseGame());
        this.restartButton.addEventListener('click', () => this.restartGame());
        this.backToMenuButton.addEventListener('click', () => this.showMainMenu());
        
        // 菜单按钮事件
        document.getElementById('start-classic').addEventListener('click', () => this.startGameWithMode(GAME_MODES.CLASSIC));
        document.getElementById('start-challenge').addEventListener('click', () => this.startGameWithMode(GAME_MODES.CHALLENGE));
        document.getElementById('start-timed').addEventListener('click', () => this.startGameWithMode(GAME_MODES.TIMED));
        document.getElementById('settings-btn').addEventListener('click', () => this.showSettings());
        document.getElementById('close-settings').addEventListener('click', () => this.hideSettings());
        
        // 历史战绩相关事件
        if (this.historyButton) {
            this.historyButton.addEventListener('click', () => this.showHistory());
        }
        if (this.historyBackButton) {
            this.historyBackButton.addEventListener('click', () => {
                this.hideHistory();
                this.showMainMenu();
            });
        }
        if (this.historyFilterSelect) {
            this.historyFilterSelect.addEventListener('change', () => this.displayHistoryRecords());
        }
        if (this.historyClearButton) {
            this.historyClearButton.addEventListener('click', () => this.clearHistoryRecords());
        }
        
        // 设置变更事件
        this.snakeSkinSelect.addEventListener('change', (e) => {
            this.snakeSkin = e.target.value;
            this.saveSettings();
        });
        
        this.soundEffectsCheckbox.addEventListener('change', (e) => {
            this.soundEnabled = e.target.checked;
            this.saveSettings();
        });
        
        // 键盘控制
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
    }
    
    // 处理键盘按键
    handleKeyPress(e) {
        // 如果游戏未开始，按任意键开始
        if (!this.isRunning && !this.gameOver) {
            this.startGame();
            return;
        }
        
        // 如果游戏结束，按R键重新开始
        if (this.gameOver) {
            if (e.key.toLowerCase() === 'r') {
                this.restartGame();
            }
            return;
        }
        
        // 暂停/继续游戏
        if (e.key === ' ') {
            this.togglePause();
            return;
        }
        
        // 方向控制
        const key = e.key;
        const currentDirection = this.direction;
        
        // 防止180度转弯
        if ((key === 'ArrowUp' || key === 'w' || key === 'W') && currentDirection !== 'down') {
            this.nextDirection = 'up';
        } else if ((key === 'ArrowDown' || key === 's' || key === 'S') && currentDirection !== 'up') {
            this.nextDirection = 'down';
        } else if ((key === 'ArrowLeft' || key === 'a' || key === 'A') && currentDirection !== 'right') {
            this.nextDirection = 'left';
        } else if ((key === 'ArrowRight' || key === 'd' || key === 'D') && currentDirection !== 'left') {
            this.nextDirection = 'right';
        }
    }
    
    // 开始游戏（带模式）
    startGameWithMode(mode) {
        this.gameMode = mode;
        this.hideMainMenu();
        this.resetGame();
        this.startGame();
    }
    
    // 开始游戏
    startGame() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.pauseButton.disabled = false;
        this.gameStartTime = Date.now(); // 记录游戏开始时间
        
        // 设置游戏循环
        this.gameInterval = setInterval(() => {
            if (!this.isPaused) {
                this.update();
                this.render();
            }
        }, this.gameSpeed);
        
        // 限时模式计时器
        if (this.gameMode === GAME_MODES.TIMED) {
            this.timedModeInterval = setInterval(() => {
                if (!this.isPaused && !this.gameOver) {
                    this.timeRemaining--;
                    this.timeLeftSpan.textContent = this.timeRemaining;
                    
                    if (this.timeRemaining <= 0) {
                        this.endGame();
                    }
                }
            }, 1000);
        }
        
        // 特殊效果计时器
        this.powerUpInterval = setInterval(() => {
            if (!this.isPaused && !this.gameOver) {
                this.updateActiveEffects();
            }
        }, 100);
    }
    
    // 暂停游戏
    pauseGame() {
        this.togglePause();
    }
    
    // 切换暂停状态
    togglePause() {
        if (!this.isRunning || this.gameOver) return;
        
        this.isPaused = !this.isPaused;
        this.pauseButton.textContent = this.isPaused ? '继续游戏' : '暂停游戏';
        
        // 渲染暂停状态
        this.render();
    }
    
    // 重新开始游戏
    restartGame() {
        this.resetGame();
        this.startGame();
    }
    
    // 更新游戏状态
    update() {
        // 更新方向
        this.direction = this.nextDirection;
        
        // 获取蛇头位置
        const head = { ...this.snake[0] };
        
        // 根据方向移动蛇头
        const moveDistance = this.activeEffects.speedup ? this.gridSize * 1.5 : this.gridSize;
        switch (this.direction) {
            case 'up':
                head.y -= moveDistance;
                break;
            case 'down':
                head.y += moveDistance;
                break;
            case 'left':
                head.x -= moveDistance;
                break;
            case 'right':
                head.x += moveDistance;
                break;
        }
        
        // 碰撞检测
        if (this.checkCollision(head)) {
            this.endGame();
            return;
        }
        
        // 将新头部添加到蛇的前面
        this.snake.unshift(head);
        
        // 检查是否吃到基础食物
        let ateFood = false;
        if (this.checkFoodCollision(head, this.food)) {
            this.handleFoodConsumption(this.food);
            ateFood = true;
        }
        
        // 检查是否吃到特殊食物
        for (let i = this.specialFoods.length - 1; i >= 0; i--) {
            if (this.checkFoodCollision(head, this.specialFoods[i])) {
                this.handleFoodConsumption(this.specialFoods[i]);
                this.specialFoods.splice(i, 1);
                ateFood = true;
            }
        }
        
        // 如果没吃到任何食物，移除尾部
        if (!ateFood) {
            this.snake.pop();
        }
        
        // 更新特殊食物计时器并生成特殊食物
        this.specialFoodTimer++;
        if (this.specialFoodTimer >= 50 && this.specialFoods.length < 2) {
            // 根据游戏模式调整特殊食物出现概率
            const probability = this.gameMode === GAME_MODES.CHALLENGE ? 0.3 : 0.15;
            if (Math.random() < probability) {
                this.generateSpecialFood();
                this.specialFoodTimer = 0;
            } else if (this.specialFoodTimer > 100) {
                this.specialFoodTimer = 0;
            }
        }
        
        // 更新特殊食物持续时间
        this.updateSpecialFoods();
        
        // 在挑战模式下增加难度
        if (this.gameMode === GAME_MODES.CHALLENGE && this.score % 100 === 0 && this.score > 0) {
            this.increaseDifficulty();
        }
    }
    
    // 检查碰撞
    checkCollision(head) {
        // 墙壁碰撞
        if (head.x < 0 || head.x >= this.canvas.width || 
            head.y < 0 || head.y >= this.canvas.height) {
            return true;
        }
        
        // 障碍物碰撞
        for (let obstacle of this.obstacles) {
            if (this.checkObstacleCollision(head, obstacle)) {
                return true;
            }
        }
        
        // 自身碰撞（隐身效果下可以穿过自身）
        if (!this.activeEffects.ghost) {
            for (let i = 1; i < this.snake.length; i++) {
                if (Math.abs(head.x - this.snake[i].x) < this.gridSize && 
                    Math.abs(head.y - this.snake[i].y) < this.gridSize) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    // 检查障碍物碰撞
    checkObstacleCollision(head, obstacle) {
        return Math.abs(head.x - obstacle.x) < this.gridSize && 
               Math.abs(head.y - obstacle.y) < this.gridSize;
    }
    
    // 检查食物碰撞
    checkFoodCollision(head, food) {
        return Math.abs(head.x - food.x) < this.gridSize && 
               Math.abs(head.y - food.y) < this.gridSize;
    }
    
    // 处理食物消耗
    handleFoodConsumption(food) {
        let points = food.points;
        
        // 双倍分数效果
        if (this.activeEffects.doublepoints) {
            points *= 2;
        }
        
        // 增加分数
        this.score += points;
        this.scoreElement.textContent = this.score;
        
        // 更新最高分
        if (this.score > this.highScores[this.gameMode]) {
            this.highScores[this.gameMode] = this.score;
            this.updateHighScoreDisplay();
            this.saveHighScore();
        }
        
        // 处理特殊效果
        if (food.effect) {
            this.applyEffect(food.effect, food.duration);
        }
        
        // 如果是基础食物，生成新的
        if (food.type === 'basic') {
            this.generateFood();
        }
        
        // 增加游戏速度（经典和挑战模式）
        if ((this.gameMode === GAME_MODES.CLASSIC || this.gameMode === GAME_MODES.CHALLENGE) && 
            this.gameSpeed > this.maxSpeed) {
            const speedDecrease = this.gameMode === GAME_MODES.CHALLENGE ? this.speedIncrease * 1.5 : this.speedIncrease;
            this.gameSpeed = Math.max(this.maxSpeed, this.gameSpeed - speedDecrease);
            this.updateGameSpeed();
        }
        
        // 播放音效
        this.playSound('eat');
    }
    
    // 应用特殊效果
    applyEffect(effectType, duration) {
        this.activeEffects[effectType] = Date.now() + duration;
        
        // 立即应用效果
        switch (effectType) {
            case 'speedup':
                this.gameSpeed = Math.max(this.maxSpeed, this.gameSpeed * 0.7);
                this.updateGameSpeed();
                this.updatePowerUpDisplay('速度提升', duration / 1000);
                break;
            case 'slowdown':
                this.gameSpeed *= 1.3;
                this.updateGameSpeed();
                this.updatePowerUpDisplay('速度减慢', duration / 1000);
                break;
            case 'doublepoints':
                this.updatePowerUpDisplay('双倍分数', duration / 1000);
                break;
            case 'shrink':
                // 缩短蛇身，但至少保留3节
                while (this.snake.length > 3) {
                    this.snake.pop();
                }
                break;
            case 'ghost':
                this.updatePowerUpDisplay('隐身模式', duration / 1000);
                break;
        }
    }
    
    // 更新特殊效果
    updateActiveEffects() {
        const now = Date.now();
        let effectEnded = false;
        
        for (const [effect, endTime] of Object.entries(this.activeEffects)) {
            if (now > endTime) {
                // 效果结束
                if (effect === 'speedup' || effect === 'slowdown') {
                    // 恢复原始速度（但考虑到游戏本身的加速）
                    const originalSpeed = this.speed - (this.score / 10) * this.speedIncrease;
                    this.gameSpeed = Math.max(this.maxSpeed, originalSpeed);
                    this.updateGameSpeed();
                }
                delete this.activeEffects[effect];
                effectEnded = true;
            } else {
                // 更新倒计时显示
                if (this.powerUpElement.style.display === 'block') {
                    const remaining = Math.ceil((endTime - now) / 1000);
                    this.powerUpCountdown.textContent = remaining;
                }
            }
        }
        
        // 如果没有活跃效果，隐藏效果显示
        if (effectEnded && Object.keys(this.activeEffects).length === 0) {
            this.powerUpElement.style.display = 'none';
        }
    }
    
    // 更新特殊效果显示
    updatePowerUpDisplay(name, duration) {
        this.powerUpSpan.textContent = name;
        this.powerUpCountdown.textContent = duration;
        this.powerUpElement.style.display = 'block';
    }
    
    // 更新游戏速度
    updateGameSpeed() {
        if (this.gameInterval) {
            clearInterval(this.gameInterval);
            this.gameInterval = setInterval(() => {
                if (!this.isPaused) {
                    this.update();
                    this.render();
                }
            }, this.gameSpeed);
        }
    }
    
    // 增加难度
    increaseDifficulty() {
        // 可以在这里添加更多障碍物或增加游戏速度
        if (this.obstacles.length < 10) {
            this.generateAdditionalObstacle();
        }
    }
    
    // 生成基础食物
    generateFood() {
        let overlapping;
        
        do {
            overlapping = false;
            
            // 随机生成食物位置
            this.food = {
                x: Math.floor(Math.random() * (this.canvas.width / this.gridSize)) * this.gridSize,
                y: Math.floor(Math.random() * (this.canvas.height / this.gridSize)) * this.gridSize,
                ...FOOD_TYPES.BASIC
            };
            
            // 检查食物是否与蛇重叠
            for (let segment of this.snake) {
                if (this.checkFoodCollision(segment, this.food)) {
                    overlapping = true;
                    break;
                }
            }
            
            // 检查食物是否与障碍物重叠
            if (!overlapping) {
                for (let obstacle of this.obstacles) {
                    if (this.checkObstacleCollision(this.food, obstacle)) {
                        overlapping = true;
                        break;
                    }
                }
            }
        } while (overlapping);
    }
    
    // 生成特殊食物
    generateSpecialFood() {
        const specialTypes = [FOOD_TYPES.ENERGY, FOOD_TYPES.SLOW, FOOD_TYPES.DOUBLE, FOOD_TYPES.SHRINK];
        const selectedType = specialTypes[Math.floor(Math.random() * specialTypes.length)];
        
        let overlapping;
        let newFood;
        
        do {
            overlapping = false;
            
            // 随机生成食物位置
            newFood = {
                x: Math.floor(Math.random() * (this.canvas.width / this.gridSize)) * this.gridSize,
                y: Math.floor(Math.random() * (this.canvas.height / this.gridSize)) * this.gridSize,
                ...selectedType,
                spawnTime: Date.now()
            };
            
            // 检查食物是否与蛇重叠
            for (let segment of this.snake) {
                if (this.checkFoodCollision(segment, newFood)) {
                    overlapping = true;
                    break;
                }
            }
            
            // 检查食物是否与障碍物重叠
            if (!overlapping) {
                for (let obstacle of this.obstacles) {
                    if (this.checkObstacleCollision(newFood, obstacle)) {
                        overlapping = true;
                        break;
                    }
                }
            }
            
            // 检查食物是否与其他食物重叠
            if (!overlapping) {
                if (this.checkFoodCollision(this.food, newFood)) {
                    overlapping = true;
                }
            }
            
            if (!overlapping) {
                for (let food of this.specialFoods) {
                    if (this.checkFoodCollision(food, newFood)) {
                        overlapping = true;
                        break;
                    }
                }
            }
        } while (overlapping);
        
        this.specialFoods.push(newFood);
    }
    
    // 更新特殊食物（检查持续时间）
    updateSpecialFoods() {
        const now = Date.now();
        for (let i = this.specialFoods.length - 1; i >= 0; i--) {
            if (now - this.specialFoods[i].spawnTime > 10000) { // 10秒后消失
                this.specialFoods.splice(i, 1);
            }
        }
    }
    
    // 生成静态障碍物
    generateObstacles() {
        this.obstacles = [];
        
        // 根据游戏模式确定障碍物数量
        let obstacleCount = 3;
        if (this.gameMode === GAME_MODES.CHALLENGE) {
            obstacleCount = 5;
        }
        
        for (let i = 0; i < obstacleCount; i++) {
            this.generateAdditionalObstacle();
        }
    }
    
    // 生成额外的障碍物
    generateAdditionalObstacle() {
        let overlapping;
        let newObstacle;
        
        do {
            overlapping = false;
            
            // 随机生成障碍物位置
            newObstacle = {
                x: Math.floor(Math.random() * (this.canvas.width / this.gridSize)) * this.gridSize,
                y: Math.floor(Math.random() * (this.canvas.height / this.gridSize)) * this.gridSize
            };
            
            // 确保障碍物不会生成在蛇的初始位置附近
            const safeZone = this.gridSize * 4;
            const head = this.snake[0];
            if (Math.abs(newObstacle.x - head.x) < safeZone && 
                Math.abs(newObstacle.y - head.y) < safeZone) {
                overlapping = true;
                continue;
            }
            
            // 检查障碍物是否与蛇重叠
            for (let segment of this.snake) {
                if (this.checkObstacleCollision(segment, newObstacle)) {
                    overlapping = true;
                    break;
                }
            }
            
            // 检查障碍物是否与食物重叠
            if (!overlapping && this.checkObstacleCollision(this.food, newObstacle)) {
                overlapping = true;
            }
            
            // 检查障碍物是否与其他障碍物重叠
            if (!overlapping) {
                for (let obstacle of this.obstacles) {
                    if (Math.abs(newObstacle.x - obstacle.x) < this.gridSize && 
                        Math.abs(newObstacle.y - obstacle.y) < this.gridSize) {
                        overlapping = true;
                        break;
                    }
                }
            }
        } while (overlapping);
        
        this.obstacles.push(newObstacle);
    }
    
    // 更新最高分显示
    updateHighScoreDisplay() {
        this.highScoreElement.textContent = this.highScores[this.gameMode];
    }
    
    // 保存最高分
    saveHighScore() {
        localStorage.setItem(`snake${this.gameMode.charAt(0).toUpperCase() + this.gameMode.slice(1)}HighScore`, this.highScores[this.gameMode]);
    }
    
    // 加载历史战绩
    loadHistoryRecords() {
        try {
            const savedRecords = localStorage.getItem('snakeGameHistory');
            this.historyRecords = savedRecords ? JSON.parse(savedRecords) : [];
        } catch (error) {
            console.error('加载历史战绩失败:', error);
            this.historyRecords = [];
        }
    }
    
    // 保存历史战绩
    saveHistoryRecord() {
        try {
            const gameDuration = this.gameStartTime ? Math.floor((Date.now() - this.gameStartTime) / 1000) : 0;
            const record = {
                id: Date.now(),
                mode: this.gameMode,
                score: this.score,
                snakeLength: this.snake.length,
                duration: gameDuration,
                date: new Date().toISOString(),
                difficulty: this.difficultyLevel || 1
            };
            
            // 添加新记录到数组开头
            this.historyRecords.unshift(record);
            
            // 限制历史记录数量，最多保存100条
            if (this.historyRecords.length > 100) {
                this.historyRecords = this.historyRecords.slice(0, 100);
            }
            
            // 保存到localStorage
            localStorage.setItem('snakeGameHistory', JSON.stringify(this.historyRecords));
        } catch (error) {
            console.error('保存历史战绩失败:', error);
        }
    }
    
    // 清空历史战绩
    clearHistoryRecords() {
        if (confirm('确定要清空所有历史战绩吗？此操作不可恢复。')) {
            this.historyRecords = [];
            localStorage.removeItem('snakeGameHistory');
            this.displayHistoryRecords();
        }
    }
    
    // 显示历史战绩
    showHistory() {
        this.mainMenu.classList.remove('active');
        this.settingsMenu.classList.remove('active');
        this.gameContainer.classList.remove('active');
        this.historyMenu.classList.add('active');
        this.displayHistoryRecords();
    }
    
    // 隐藏历史战绩菜单
    hideHistory() {
        this.historyMenu.classList.remove('active');
    }
    
    // 显示历史战绩列表
    displayHistoryRecords() {
        // 清空表格
        this.historyTable.innerHTML = '';
        
        // 获取筛选条件
        const filterMode = this.historyFilterSelect.value;
        
        // 筛选记录
        let filteredRecords = this.historyRecords;
        if (filterMode !== 'all') {
            filteredRecords = this.historyRecords.filter(record => record.mode === filterMode);
        }
        
        // 添加记录到表格
        filteredRecords.forEach((record, index) => {
            const row = document.createElement('tr');
            
            // 格式化日期
            const date = new Date(record.date);
            const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
            
            // 格式化时长
            const minutes = Math.floor(record.duration / 60);
            const seconds = record.duration % 60;
            const formattedDuration = `${minutes}:${String(seconds).padStart(2, '0')}`;
            
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${this.getModeDisplayName(record.mode)}</td>
                <td>${record.score}</td>
                <td>${record.snakeLength}</td>
                <td>${formattedDuration}</td>
                <td>${formattedDate}</td>
            `;
            
            // 如果是最高分，添加高亮样式
            if (record.score === this.highScores[record.mode]) {
                row.classList.add('high-score-row');
            }
            
            this.historyTable.appendChild(row);
        });
        
        // 如果没有记录，显示空状态
        if (filteredRecords.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = `<td colspan="6" class="empty-message">暂无历史战绩</td>`;
            this.historyTable.appendChild(emptyRow);
        }
    }
    
    // 播放音效（简单实现）
    playSound(type) {
        if (!this.soundEnabled) return;
        
        // 这里可以添加真实的音效播放，目前只是占位
        console.log(`Playing sound: ${type}`);
    }
    
    // 显示主菜单
    showMainMenu() {
        this.mainMenu.classList.add('active');
        this.gameContainer.classList.remove('active');
        this.settingsMenu.classList.remove('active');
        this.historyMenu.classList.remove('active');
    }
    
    // 隐藏主菜单
    hideMainMenu() {
        this.mainMenu.classList.remove('active');
        this.gameContainer.classList.add('active');
    }
    
    // 显示设置菜单
    showSettings() {
        this.mainMenu.classList.remove('active');
        this.settingsMenu.classList.add('active');
    }
    
    // 隐藏设置菜单
    hideSettings() {
        this.settingsMenu.classList.remove('active');
        this.mainMenu.classList.add('active');
    }
    
    // 渲染游戏画面
    render() {
        // 清空画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制网格
        this.drawGrid();
        
        // 绘制障碍物
        this.drawObstacles();
        
        // 绘制蛇
        this.drawSnake();
        
        // 绘制食物
        this.drawFood(this.food);
        
        // 绘制特殊食物
        for (let food of this.specialFoods) {
            this.drawSpecialFood(food);
        }
        
        // 绘制暂停提示
        if (this.isPaused) {
            this.drawPauseScreen();
        }
        
        // 绘制游戏结束画面
        if (this.gameOver) {
            this.drawGameOverScreen();
        }
    }
    
    // 绘制网格
    drawGrid() {
        this.ctx.strokeStyle = '#34495e';
        this.ctx.lineWidth = 0.5;
        
        // 绘制垂直线
        for (let x = 0; x <= this.canvas.width; x += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        // 绘制水平线
        for (let y = 0; y <= this.canvas.height; y += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }
    
    // 绘制障碍物
    drawObstacles() {
        for (let obstacle of this.obstacles) {
            this.ctx.fillStyle = '#7f8c8d';
            this.ctx.shadowColor = '#2c3e50';
            this.ctx.shadowBlur = 3;
            
            this.ctx.beginPath();
            this.ctx.rect(obstacle.x, obstacle.y, this.gridSize, this.gridSize);
            this.ctx.fill();
            
            this.ctx.strokeStyle = '#2c3e50';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }
        
        // 重置阴影
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
    }
    
    // 绘制蛇
    drawSnake() {
        for (let i = 0; i < this.snake.length; i++) {
            const segment = this.snake[i];
            
            // 设置颜色和样式（根据皮肤）
            this.setSnakeSegmentStyle(i);
            
            // 绘制蛇的身体部分
            if (this.snakeSkin === SNAKE_SKINS.PIXEL) {
                // 像素风格
                this.ctx.beginPath();
                this.ctx.rect(segment.x, segment.y, this.gridSize, this.gridSize);
                this.ctx.fill();
            } else {
                // 圆角矩形
                this.ctx.beginPath();
                this.ctx.roundRect(segment.x, segment.y, this.gridSize, this.gridSize, 4);
                this.ctx.fill();
            }
            
            // 绘制边框
            this.ctx.strokeStyle = '#2c3e50';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        }
        
        // 重置阴影
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
    }
    
    // 设置蛇身体部分的样式
    setSnakeSegmentStyle(index) {
        if (index === 0) {
            // 蛇头
            this.ctx.fillStyle = '#e74c3c';
            this.ctx.shadowColor = '#c0392b';
            this.ctx.shadowBlur = 5;
        } else {
            // 根据皮肤设置身体颜色
            switch (this.snakeSkin) {
                case SNAKE_SKINS.RAINBOW:
                    // 彩虹皮肤
                    const hue = (index * 20) % 360;
                    this.ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
                    break;
                case SNAKE_SKINS.METAL:
                    // 金属皮肤
                    const brightness = 40 + (index % 3) * 10;
                    this.ctx.fillStyle = `hsl(220, 10%, ${brightness}%)`;
                    this.ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
                    this.ctx.shadowBlur = 3;
                    break;
                case SNAKE_SKINS.PIXEL:
                    // 像素皮肤
                    this.ctx.fillStyle = `hsl(120, 60%, ${40 + (index % 5) * 5}%)`;
                    break;
                default:
                    // 默认皮肤
                    this.ctx.fillStyle = `hsl(120, ${70 - index * 2}%, ${40 + index * 0.5}%)`;
            }
        }
        
        // 隐身效果
        if (this.activeEffects.ghost) {
            this.ctx.globalAlpha = 0.5;
        } else {
            this.ctx.globalAlpha = 1;
        }
    }
    
    // 绘制基础食物
    drawFood(food) {
        this.ctx.fillStyle = food.color;
        this.ctx.shadowColor = '#e67e22';
        this.ctx.shadowBlur = 5;
        
        // 绘制圆形食物
        this.ctx.beginPath();
        this.ctx.arc(
            food.x + this.gridSize / 2,
            food.y + this.gridSize / 2,
            this.gridSize / 2 - 2,
            0,
            Math.PI * 2
        );
        this.ctx.fill();
        
        // 重置阴影
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
    }
    
    // 绘制特殊食物
    drawSpecialFood(food) {
        // 闪烁效果
        const age = Date.now() - food.spawnTime;
        const pulse = Math.sin(age / 200) * 0.5 + 0.5;
        
        this.ctx.fillStyle = food.color;
        this.ctx.globalAlpha = 0.8 + pulse * 0.2;
        
        if (food.type === 'energy') {
            // 能量食物（星星形状）
            this.drawStar(food.x + this.gridSize / 2, food.y + this.gridSize / 2, this.gridSize / 3, 5);
        } else {
            // 其他特殊食物
            this.ctx.beginPath();
            this.ctx.arc(
                food.x + this.gridSize / 2,
                food.y + this.gridSize / 2,
                this.gridSize / 2 - 2,
                0,
                Math.PI * 2
            );
            this.ctx.fill();
        }
        
        this.ctx.globalAlpha = 1;
    }
    
    // 绘制星星
    drawStar(x, y, radius, points) {
        this.ctx.beginPath();
        const angle = Math.PI / points;
        
        for (let i = 0; i < 2 * points; i++) {
            const r = i % 2 === 0 ? radius : radius * 0.5;
            const pointX = x + Math.cos(i * angle - Math.PI / 2) * r;
            const pointY = y + Math.sin(i * angle - Math.PI / 2) * r;
            
            if (i === 0) {
                this.ctx.moveTo(pointX, pointY);
            } else {
                this.ctx.lineTo(pointX, pointY);
            }
        }
        
        this.ctx.closePath();
        this.ctx.fill();
    }
    
    // 绘制暂停画面
    drawPauseScreen() {
        // 半透明遮罩
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 暂停文字
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 30px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('游戏暂停', this.canvas.width / 2, this.canvas.height / 2);
        
        this.ctx.font = '16px Arial';
        this.ctx.fillText('按空格键继续', this.canvas.width / 2, this.canvas.height / 2 + 40);
    }
    
    // 绘制游戏结束画面
    drawGameOverScreen() {
        // 半透明遮罩
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 游戏结束文字
        this.ctx.fillStyle = '#e74c3c';
        this.ctx.font = 'bold 36px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('游戏结束', this.canvas.width / 2, this.canvas.height / 2 - 50);
        
        // 显示分数
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '20px Arial';
        this.ctx.fillText(`最终得分: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2);
        
        // 最高分
        if (this.score === this.highScores[this.gameMode] && this.score > 0) {
            this.ctx.fillStyle = '#f39c12';
            this.ctx.fillText('新纪录！', this.canvas.width / 2, this.canvas.height / 2 + 30);
        }
        
        // 重新开始提示
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '16px Arial';
        this.ctx.fillText('按R键或点击"重新开始"按钮', this.canvas.width / 2, this.canvas.height / 2 + 60);
        this.ctx.fillText('按B键返回菜单', this.canvas.width / 2, this.canvas.height / 2 + 90);
    }
    
    // 结束游戏
    endGame() {
        this.isRunning = false;
        this.gameOver = true;
        this.pauseButton.disabled = true;
        
        // 清除定时器
        if (this.gameInterval) clearInterval(this.gameInterval);
        if (this.timedModeInterval) clearInterval(this.timedModeInterval);
        if (this.powerUpInterval) clearInterval(this.powerUpInterval);
        
        // 保存历史战绩
        this.saveHistoryRecord();
        
        // 播放结束音效
        this.playSound('gameover');
        
        // 渲染游戏结束画面
        this.render();
    }
}

// 当页面加载完成后初始化游戏
window.addEventListener('load', () => {
    const game = new SnakeGame();
});