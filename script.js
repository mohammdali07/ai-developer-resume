/* ==========================================================================
   MOHAMMAD ALI KHANUSIYA - PORTFOLIO LOGIC
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    initMobileNav();
    initTerminal();
    initProjectFilters();
    initBugHunter();
    initChatbot();
    initContactForm();
    initEntropy();
    init3DEffects();
    // Three.js needs the library; wait for it
    if (typeof THREE !== 'undefined') {
        initThreeModel();
    } else {
        const s = document.querySelector('script[src*="three"]');
        if (s) s.addEventListener('load', initThreeModel);
    }
});


/* ==========================================================================
   CODE RUNNER ENDLESS GAME
   ========================================================================== */

function initBugHunter() {
    const canvas = document.getElementById('runner-canvas');
    const stage = document.getElementById('runner-stage');
    if (!canvas || !stage) return;

    const ctx = canvas.getContext('2d');
    const overlay = document.getElementById('runner-overlay');
    const startButton = document.getElementById('runner-start');
    const jumpButton = document.getElementById('runner-jump');
    const scoreEl = document.getElementById('runner-score');
    const bestEl = document.getElementById('runner-best');
    const speedEl = document.getElementById('runner-speed');
    const messageEl = document.getElementById('runner-message');
    const instructionEl = document.getElementById('runner-instruction');
    const statusEl = document.getElementById('runner-status');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = 900;
    let height = 390;
    let groundY = 320;
    let dpr = 1;
    let state = 'ready';
    let score = 0;
    let best = Number(localStorage.getItem('codeRunnerBest') || 0);
    let speed = 6;
    let spawnTimer = 80;
    let tokenTimer = 180;
    let lastTime = 0;
    let animationId = 0;
    let worldOffset = 0;
    let obstacles = [];
    let tokens = [];
    let particles = [];
    let skyline = [];
    const player = { x: 92, y: 0, width: 46, height: 58, velocityY: 0, grounded: true, frame: 0 };

    function formatScore(value) {
        return String(Math.floor(value)).padStart(5, '0');
    }

    function resize() {
        const rect = stage.getBoundingClientRect();
        width = Math.max(300, Math.floor(rect.width));
        height = Math.max(280, Math.floor(rect.height));
        groundY = height - 65;
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (player.grounded) player.y = groundY - player.height;
        buildSkyline();
        draw();
    }

    function buildSkyline() {
        skyline = [];
        let x = 0;
        while (x < width + 120) {
            const buildingWidth = 28 + Math.random() * 52;
            skyline.push({ x, width: buildingWidth, height: 35 + Math.random() * 90 });
            x += buildingWidth + 12;
        }
    }

    function reset() {
        score = 0;
        speed = reduceMotion ? 5 : 6;
        spawnTimer = 75;
        tokenTimer = 150;
        worldOffset = 0;
        obstacles = [];
        tokens = [];
        particles = [];
        player.y = groundY - player.height;
        player.velocityY = 0;
        player.grounded = true;
        scoreEl.textContent = '00000';
        speedEl.textContent = '1.0x';
    }

    function startGame() {
        reset();
        state = 'running';
        overlay.classList.add('is-hidden');
        jumpButton.classList.add('is-visible');
        statusEl.textContent = 'Game started.';
        lastTime = performance.now();
        cancelAnimationFrame(animationId);
        animationId = requestAnimationFrame(loop);
    }

    function jump() {
        if (state === 'ready' || state === 'gameover') {
            startGame();
            return;
        }
        if (state === 'running' && player.grounded) {
            player.velocityY = -14.5;
            player.grounded = false;
            createParticles(player.x + 18, groundY - 2, '#38bdf8', 6);
        }
    }

    function spawnObstacle() {
        const isBlock = Math.random() > 0.72;
        obstacles.push({
            x: width + 30,
            y: isBlock ? groundY - 48 : groundY - 30,
            width: isBlock ? 42 : 43,
            height: isBlock ? 48 : 30,
            type: isBlock ? 'error' : 'bug',
            phase: Math.random() * Math.PI * 2
        });
        spawnTimer = Math.max(46, 92 - speed * 4) + Math.random() * 48;
    }

    function spawnToken() {
        tokens.push({
            x: width + 40,
            y: groundY - 90 - Math.random() * 80,
            radius: 13,
            collected: false,
            rotation: 0
        });
        tokenTimer = 150 + Math.random() * 130;
    }

    function createParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            particles.push({
                x, y, color,
                vx: (Math.random() - .5) * 4,
                vy: -Math.random() * 3,
                life: 1
            });
        }
    }

    function intersects(a, b, inset = 6) {
        return a.x + inset < b.x + b.width - inset &&
            a.x + a.width - inset > b.x + inset &&
            a.y + inset < b.y + b.height - inset &&
            a.y + a.height - inset > b.y + inset;
    }

    function endGame() {
        state = 'gameover';
        best = Math.max(best, Math.floor(score));
        localStorage.setItem('codeRunnerBest', best);
        bestEl.textContent = formatScore(best);
        messageEl.textContent = 'Build crashed at ' + formatScore(score);
        instructionEl.textContent = 'The bugs won this run. Ship a cleaner build.';
        startButton.textContent = 'Run again';
        overlay.classList.remove('is-hidden');
        jumpButton.classList.remove('is-visible');
        statusEl.textContent = 'Game over. Score ' + Math.floor(score) + '.';
        createParticles(player.x + 24, player.y + 30, '#fb7185', 16);
        draw();
    }

    function update(delta) {
        const step = Math.min(delta / 16.67, 2);
        score += .11 * speed * step;
        speed = Math.min(12.5, (reduceMotion ? 5 : 6) + score / 420);
        worldOffset = (worldOffset + speed * step) % 48;
        scoreEl.textContent = formatScore(score);
        speedEl.textContent = (speed / 6).toFixed(1) + 'x';

        player.velocityY += .78 * step;
        player.y += player.velocityY * step;
        if (player.y >= groundY - player.height) {
            player.y = groundY - player.height;
            player.velocityY = 0;
            player.grounded = true;
        }
        player.frame += step * speed * .04;

        spawnTimer -= step;
        tokenTimer -= step;
        if (spawnTimer <= 0) spawnObstacle();
        if (tokenTimer <= 0) spawnToken();

        obstacles.forEach(obstacle => {
            obstacle.x -= speed * step;
            obstacle.phase += .15 * step;
        });
        tokens.forEach(token => {
            token.x -= speed * step;
            token.rotation += .08 * step;
        });

        const playerBox = { x: player.x, y: player.y, width: player.width, height: player.height };
        for (const obstacle of obstacles) {
            if (intersects(playerBox, obstacle, 8)) {
                endGame();
                return;
            }
        }

        tokens.forEach(token => {
            const tokenBox = { x: token.x - token.radius, y: token.y - token.radius, width: token.radius * 2, height: token.radius * 2 };
            if (!token.collected && intersects(playerBox, tokenBox, 3)) {
                token.collected = true;
                score += 50;
                createParticles(token.x, token.y, '#22c55e', 10);
            }
        });

        particles.forEach(particle => {
            particle.x += particle.vx * step;
            particle.y += particle.vy * step;
            particle.vy += .12 * step;
            particle.life -= .035 * step;
        });
        obstacles = obstacles.filter(item => item.x + item.width > -30);
        tokens = tokens.filter(item => !item.collected && item.x + item.radius > -20);
        particles = particles.filter(item => item.life > 0);
    }

    function drawBackground() {
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#07101f');
        gradient.addColorStop(1, '#0f1b2d');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = 'rgba(56, 189, 248, .055)';
        ctx.lineWidth = 1;
        for (let x = -worldOffset; x < width; x += 48) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, groundY); ctx.stroke();
        }
        for (let y = 35; y < groundY; y += 48) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
        }

        skyline.forEach((building, index) => {
            const parallaxX = (building.x - worldOffset * .15 + width) % (width + 80) - 40;
            ctx.fillStyle = 'rgba(15, 35, 55, .8)';
            ctx.fillRect(parallaxX, groundY - building.height, building.width, building.height);
            ctx.fillStyle = index % 3 === 0 ? 'rgba(34, 197, 94, .18)' : 'rgba(56, 189, 248, .13)';
            for (let wy = groundY - building.height + 10; wy < groundY - 8; wy += 16) {
                ctx.fillRect(parallaxX + 7, wy, 4, 4);
                if (building.width > 38) ctx.fillRect(parallaxX + 20, wy, 4, 4);
            }
        });

        ctx.fillStyle = '#13243a';
        ctx.fillRect(0, groundY, width, height - groundY);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(0, groundY, width, 2);
        ctx.strokeStyle = 'rgba(34, 197, 94, .2)';
        ctx.setLineDash([18, 18]);
        ctx.lineDashOffset = worldOffset;
        ctx.beginPath(); ctx.moveTo(0, groundY + 28); ctx.lineTo(width, groundY + 28); ctx.stroke();
        ctx.setLineDash([]);
    }

    function drawPlayer() {
        const x = player.x;
        const y = player.y;
        const bob = player.grounded ? Math.sin(player.frame * 2) * 1.5 : 0;
        ctx.save();
        ctx.translate(x, y + bob);

        ctx.shadowColor = 'rgba(56, 189, 248, .45)';
        ctx.shadowBlur = 14;
        ctx.fillStyle = '#15263d';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(7, 2, 33, 31, 8);
        ctx.fill(); ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#07101f';
        ctx.fillRect(13, 10, 21, 12);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(17, 14, 4, 4);
        ctx.fillRect(27, 14, 4, 4);

        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.roundRect(4, 32, 39, 17, 5);
        ctx.fill();
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 11px JetBrains Mono';
        ctx.textAlign = 'center';
        ctx.fillText('</>', 23.5, 44);

        const legOffset = player.grounded ? Math.sin(player.frame * 3) * 5 : 0;
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(15, 48); ctx.lineTo(13 + legOffset, 57); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(33, 48); ctx.lineTo(35 - legOffset, 57); ctx.stroke();
        ctx.restore();
    }

    function drawBug(obstacle) {
        ctx.save();
        ctx.translate(obstacle.x, obstacle.y);
        if (obstacle.type === 'error') {
            ctx.shadowColor = 'rgba(251, 113, 133, .35)';
            ctx.shadowBlur = 10;
            ctx.fillStyle = '#351827';
            ctx.strokeStyle = '#fb7185';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.roundRect(1, 1, obstacle.width - 2, obstacle.height - 2, 7); ctx.fill(); ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#fb7185';
            ctx.font = 'bold 21px JetBrains Mono';
            ctx.textAlign = 'center';
            ctx.fillText('!', obstacle.width / 2, 31);
        } else {
            const wiggle = Math.sin(obstacle.phase) * 2;
            ctx.strokeStyle = '#fb7185';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            [[8, 4, 1, wiggle], [8, 14, 0, 16 + wiggle], [35, 4, 42, wiggle], [35, 14, 43, 16 + wiggle]].forEach(leg => {
                ctx.beginPath(); ctx.moveTo(leg[0], leg[1] + 8); ctx.lineTo(leg[2], leg[3] + 8); ctx.stroke();
            });
            ctx.fillStyle = '#3b1726';
            ctx.strokeStyle = '#fb7185';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.ellipse(21.5, 16, 15, 13, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#fecdd3';
            ctx.fillRect(14, 11, 4, 4); ctx.fillRect(25, 11, 4, 4);
        }
        ctx.restore();
    }

    function drawToken(token) {
        ctx.save();
        ctx.translate(token.x, token.y);
        ctx.scale(Math.max(.25, Math.abs(Math.cos(token.rotation))), 1);
        ctx.shadowColor = 'rgba(34, 197, 94, .7)';
        ctx.shadowBlur = 14;
        ctx.fillStyle = '#123521';
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, token.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#bbf7d0';
        ctx.font = 'bold 13px JetBrains Mono';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✓', 0, 1);
        ctx.restore();
    }

    function draw() {
        ctx.clearRect(0, 0, width, height);
        drawBackground();
        tokens.forEach(drawToken);
        obstacles.forEach(drawBug);
        drawPlayer();
        particles.forEach(particle => {
            ctx.globalAlpha = Math.max(0, particle.life);
            ctx.fillStyle = particle.color;
            ctx.fillRect(particle.x, particle.y, 3, 3);
        });
        ctx.globalAlpha = 1;
    }

    function loop(time) {
        if (state !== 'running') return;
        const delta = time - lastTime;
        lastTime = time;
        update(delta);
        draw();
        if (state === 'running') animationId = requestAnimationFrame(loop);
    }

    function handleControl(event) {
        if (event.type === 'keydown' && !['Space', 'ArrowUp', 'KeyW'].includes(event.code)) return;
        if (event.type === 'keydown' && ['INPUT', 'TEXTAREA', 'BUTTON'].includes(document.activeElement.tagName)) return;
        event.preventDefault();
        jump();
    }

    startButton.addEventListener('click', startGame);
    jumpButton.addEventListener('click', jump);
    canvas.addEventListener('pointerdown', handleControl);
    document.addEventListener('keydown', handleControl);
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && state === 'running') {
            state = 'ready';
            overlay.classList.remove('is-hidden');
            jumpButton.classList.remove('is-visible');
            messageEl.textContent = 'Run paused';
            instructionEl.textContent = 'Your build is safe. Start again when ready.';
            startButton.textContent = 'Restart run';
        }
    });

    bestEl.textContent = formatScore(best);
    resize();
}

/* ==========================================================================
   MOBILE NAVIGATION DRAWER
   ========================================================================== */

function initMobileNav() {
    const navToggle = document.getElementById('nav-toggle');
    const drawerClose = document.getElementById('drawer-close');
    const mobileDrawer = document.getElementById('mobile-drawer');
    const drawerLinks = document.querySelectorAll('.drawer-link');

    const openDrawer = () => {
        if (!navToggle || !mobileDrawer) return;
        mobileDrawer.classList.add('open');
        mobileDrawer.setAttribute('aria-hidden', 'false');
        navToggle.setAttribute('aria-expanded', 'true');
        navToggle.setAttribute('aria-label', 'Close navigation menu');
        document.body.classList.add('drawer-open');
        drawerClose?.focus();
    };

    const closeDrawer = (returnFocus = true) => {
        if (!navToggle || !mobileDrawer) return;
        mobileDrawer.classList.remove('open');
        mobileDrawer.setAttribute('aria-hidden', 'true');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.setAttribute('aria-label', 'Open navigation menu');
        document.body.classList.remove('drawer-open');
        if (returnFocus) navToggle.focus();
    };

    if (navToggle && mobileDrawer) {
        navToggle.addEventListener('click', () => {
            if (mobileDrawer.classList.contains('open')) closeDrawer();
            else openDrawer();
        });
    }

    if (drawerClose && mobileDrawer) {
        drawerClose.addEventListener('click', () => {
            closeDrawer();
        });
    }

    // Close drawer when clicking a link
    drawerLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (mobileDrawer) {
                closeDrawer(false);
            }
        });
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && mobileDrawer?.classList.contains('open')) {
            closeDrawer();
        }
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 768 && mobileDrawer?.classList.contains('open')) {
            closeDrawer(false);
        }
    });
}

/* ==========================================================================
   HERO TERMINAL SIMULATOR
   ========================================================================== */

const TERMINAL_SEQUENCE = [
    { type: 'input', text: 'mohammad_ali.init()' },
    { type: 'output', text: 'Initializing environment: Python 3.11.9... [OK]\nLoading core libraries: NumPy, Pandas, Tkinter... [OK]\nConnecting database: MySQL daemon... [OK]\nSystem operational: v1.0.0-stable' },
    { type: 'input', text: 'mohammad_ali.get_status()' },
    { type: 'output', text: 'Role: Python Developer (AI) & Graphic Designer\nInternship: Python Developer Intern @ Xipra Info Tech\nEducation: BCA @ HNGU (Ongoing)' },
    { type: 'input', text: 'mohammad_ali.get_skills()' },
    { type: 'output', text: 'Languages: Python, JavaScript, SQL\nGUI: Tkinter | DB: MySQL\nWeb: HTML, CSS, Tailwind CSS, Bootstrap\nDesign: Photoshop, Canva, UV Precision Templates' },
    { type: 'input', text: 'mohammad_ali.run_diagnostics()' },
    { type: 'output', text: 'Local debugger: RUNNING\nGitHub repositories: SYNCED\nCompilation gates: ACTIVE\nReady for query interface...' }
];

let terminalIndex = 0;
let charIndex = 0;
let terminalTimeout = null;

function initTerminal() {
    const terminalOutput = document.getElementById('terminal-output');
    const resetBtn = document.getElementById('terminal-reset-btn');

    if (!terminalOutput) return;

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            clearTimeout(terminalTimeout);
            terminalOutput.innerHTML = '<span class="terminal-prompt">$</span> <span class="terminal-cursor">|</span>';
            terminalIndex = 0;
            charIndex = 0;
            runTerminalStep();
        });
    }

    runTerminalStep();
}

function runTerminalStep() {
    const terminalOutput = document.getElementById('terminal-output');
    if (!terminalOutput || terminalIndex >= TERMINAL_SEQUENCE.length) {
        // Scroll terminal to bottom
        terminalOutput.scrollTop = terminalOutput.scrollHeight;
        return;
    }

    const currentStep = TERMINAL_SEQUENCE[terminalIndex];
    
    // Remove the cursor before writing new content
    const cursor = terminalOutput.querySelector('.terminal-cursor');
    if (cursor) cursor.remove();

    if (currentStep.type === 'input') {
        // Create prompt line if charIndex is 0
        if (charIndex === 0) {
            const promptSpan = document.createElement('span');
            promptSpan.className = 'terminal-prompt';
            promptSpan.textContent = terminalIndex === 0 ? '$ ' : '\n$ ';
            terminalOutput.appendChild(promptSpan);

            const inputSpan = document.createElement('span');
            inputSpan.className = 'cmd-input';
            inputSpan.id = `cmd-line-${terminalIndex}`;
            terminalOutput.appendChild(inputSpan);
        }

        const inputSpan = document.getElementById(`cmd-line-${terminalIndex}`);
        if (inputSpan) {
            inputSpan.textContent += currentStep.text.charAt(charIndex);
            charIndex++;
        }

        if (charIndex < currentStep.text.length) {
            terminalTimeout = setTimeout(runTerminalStep, 50);
        } else {
            // Finished typing command line
            charIndex = 0;
            terminalIndex++;
            // Re-append cursor
            appendCursor(terminalOutput);
            terminalTimeout = setTimeout(runTerminalStep, 400);
        }
    } else if (currentStep.type === 'output') {
        const outputDiv = document.createElement('div');
        outputDiv.className = 'cmd-output';
        
        // Highlight specific terms
        let formattedText = currentStep.text
            .replace(/\[OK\]/g, '<span class="cmd-highlight">[OK]</span>')
            .replace(/ACTIVE/g, '<span class="cmd-highlight">ACTIVE</span>')
            .replace(/RUNNING/g, '<span class="cmd-highlight">RUNNING</span>')
            .replace(/SYNCED/g, '<span class="cmd-highlight">SYNCED</span>');
            
        outputDiv.innerHTML = formattedText;
        terminalOutput.appendChild(outputDiv);

        terminalIndex++;
        appendCursor(terminalOutput);
        terminalTimeout = setTimeout(runTerminalStep, 600);
    }

    // Scroll to bottom
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

function appendCursor(container) {
    const cursorSpan = document.createElement('span');
    cursorSpan.className = 'terminal-cursor';
    cursorSpan.textContent = '|';
    container.appendChild(cursorSpan);
}

/* ==========================================================================
   PROJECTS FILTER & MODAL
   ========================================================================== */

function initProjectFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const projectCards = document.querySelectorAll('.project-card');

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            const filterValue = button.getAttribute('data-filter');

            projectCards.forEach(card => {
                const category = card.getAttribute('data-category');
                
                if (filterValue === 'all' || category === filterValue) {
                    card.style.display = 'flex';
                    card.classList.remove('fade-out');
                    card.classList.add('fade-in');
                } else {
                    card.classList.remove('fade-in');
                    card.classList.add('fade-out');
                    // Sync display none after transition
                    setTimeout(() => {
                        if (card.classList.contains('fade-out')) {
                            card.style.display = 'none';
                        }
                    }, 300);
                }
            });
        });
    });
}

// Project Modal Database
const PROJECT_DATABASE = {
    inventory: {
        category: 'Python & GUIs',
        title: 'Tkinter Inventory Manager',
        desc: 'A desktop graphical interface developed in Python utilizing the Tkinter window framework. The application handles structured transactional records and logs stock entries directly into a MySQL database schema.',
        impacts: [
            '<strong>MySQL Integration:</strong> Wrote optimized SQL queries to query, insert, and update database tables without transaction delays.',
            '<strong>Data Handling:</strong> Built structured error handling workflows to filter invalid input records and validate data types.',
            '<strong>GUI Usability:</strong> Crafted custom components and tables within Tkinter to show real-time database outputs.'
        ],
        nodes: ['GUI Form', 'Tkinter Handlers', 'SQL Sanitizer', 'MySQL Tables']
    },
    datakit: {
        category: 'Python & GUIs',
        title: 'NumPy & Pandas Analytics Kit',
        desc: 'A data processing utility built in Python to import messy CSV spreadsheets, filter out empty values, compute statistical values, and write clean outputs.',
        impacts: [
            '<strong>Pandas Processing:</strong> Cleaned datasets using Pandas vector mappings to replace null fields and group key dimensions.',
            '<strong>NumPy Computations:</strong> Accelerated mathematical analysis of tabular metrics using multi-dimensional NumPy arrays.',
            '<strong>Debugging Integrity:</strong> Built comprehensive validation scripts to verify computation correctness against sample benchmarks.'
        ],
        nodes: ['Messy CSV', 'Pandas DataFrame', 'NumPy Vector Calculations', 'Filtered Output']
    },
    portfolio: {
        category: 'Web Development',
        title: 'Responsive Portfolio Hub',
        desc: 'A modern, single-page portfolio layout developed with semantic HTML, fluid responsive CSS structures, and interactive JavaScript hooks.',
        impacts: [
            '<strong>Responsive Layouts:</strong> Implemented responsive layout rules matching both compact smartphones and wide desktop viewports.',
            '<strong>Tailwind & Bootstrap styling:</strong> Utilized styling structures to guarantee high-contrast layouts and consistent margins.',
            '<strong>Dynamic Interactions:</strong> Integrated interactive elements like modals, slide toggles, and filter grids with transition handlers.'
        ],
        nodes: ['Viewport Rules', 'Tailwind / CSS Grids', 'JS Event Hooks', 'Interactive DOM']
    },
    attendance: {
        category: 'AI & Computer Vision',
        title: 'Face Recognition Attendance System',
        desc: 'A Tkinter desktop application that uses a webcam and face encodings to register users, recognize known faces, and record timestamped entry and exit events in CSV attendance reports.',
        impacts: [
            '<strong>Face Enrollment:</strong> Captures a face from the webcam and saves it for future recognition against known encodings.',
            '<strong>Attendance Workflow:</strong> Records entry and exit status with timestamps while preventing duplicate records in the attendance file.',
            '<strong>Automated Alerts:</strong> Uses background checks and text-to-speech reminders when an expected exit event is missing.'
        ],
        nodes: ['Webcam Feed', 'Face Encoding', 'Identity Match', 'CSV Attendance']
    },
    alisChatbot: {
        category: 'Generative AI & Web',
        title: 'Alis AI Web Chatbot',
        desc: 'A full-stack conversational assistant with a Flask backend, JSON chat endpoint, hosted language-model integration, retained conversation context, and a responsive browser interface.',
        impacts: [
            '<strong>Flask API:</strong> Exposes a POST chat route that accepts JSON messages and returns model responses to the frontend.',
            '<strong>Conversation Context:</strong> Maintains user and assistant messages so replies remain aware of the active conversation.',
            '<strong>Interactive Interface:</strong> Includes asynchronous message delivery, typing feedback, automatic scrolling, and a persistent light/dark theme.'
        ],
        nodes: ['Web Chat UI', 'Flask JSON Route', 'Conversation History', 'LLM API']
    },
    billing: {
        category: 'Python, Tkinter & MySQL',
        title: 'MySQL Retail Billing Suite',
        desc: 'A multi-module desktop system for managing customers and products, building a shopping cart, calculating totals, saving invoices and line items, displaying receipts, and emailing bills.',
        impacts: [
            '<strong>Relational Data:</strong> Connects customer, product, bill, and bill-item records through parameterized MySQL operations.',
            '<strong>Billing Workflow:</strong> Retrieves prices, calculates line totals and payable amounts, then saves complete invoices transactionally.',
            '<strong>Business Tools:</strong> Provides CRUD screens, receipt presentation, customer lookup, product selection, and SMTP bill delivery.'
        ],
        nodes: ['Tkinter Modules', 'Customer & Product CRUD', 'Billing Engine', 'MySQL Records']
    },
    news: {
        category: 'Python GUI & APIs',
        title: 'Live News Desktop App',
        desc: 'A Tkinter desktop news reader that requests article data from a remote API, downloads and resizes story images, navigates between reports, and opens source articles in the browser.',
        impacts: [
            '<strong>API Integration:</strong> Fetches and validates JSON article data with graceful handling for failed or empty responses.',
            '<strong>Media Rendering:</strong> Loads remote images with Pillow and substitutes a fallback image when an article has no artwork.',
            '<strong>Article Navigation:</strong> Builds previous, next, and read-more controls dynamically for the selected story.'
        ],
        nodes: ['News API', 'Requests / JSON', 'Pillow Rendering', 'Tkinter Reader']
    },
    uvprint: {
        category: 'Graphic Design',
        title: 'Raahbar UV Vector Suite',
        desc: 'A collection of visual graphic templates created for UV printing queues. The projects match target templates with exact dimensions and ink color ranges.',
        impacts: [
            '<strong>UV Optimization:</strong> Designed layouts matching UV ink specifications, improving print rendering quality.',
            '<strong>Color Alignment:</strong> Managed tight production tolerances for color separations and alignment coordinates.',
            '<strong>Visual Materials:</strong> Prepared high-impact marketing designs and product packaging layouts under tight client deadlines.'
        ],
        nodes: ['Raw Asset', 'Photoshop Canvas', 'Color-Channel Splits', 'UV Flatbed Print']
    }
};

function openProjectModal(projectId) {
    const modal = document.getElementById('project-modal');
    const modalContent = document.getElementById('modal-content-area');
    const project = PROJECT_DATABASE[projectId];

    if (!modal || !modalContent || !project) return;

    // Create Architecture Nodes HTML
    let archNodesHtml = '';
    project.nodes.forEach((node, i) => {
        archNodesHtml += `<div class="arch-node ${i === 1 || i === 2 ? 'accent-node' : ''}">${node}</div>`;
        if (i < project.nodes.length - 1) {
            archNodesHtml += `<div class="arch-arrow">&rarr;</div>`;
        }
    });

    // Create Impacts HTML
    let impactsHtml = '';
    project.impacts.forEach(imp => {
        impactsHtml += `<li>${imp}</li>`;
    });

    modalContent.innerHTML = `
        <div class="modal-header">
            <div class="modal-category">${project.category}</div>
            <h3 class="modal-title" id="project-modal-title">${project.title}</h3>
        </div>
        <p class="modal-desc-text">${project.desc}</p>
        
        <h4 class="modal-sub-heading">Functional Architecture</h4>
        <div class="architecture-container">
            <div class="arch-node-row">
                ${archNodesHtml}
            </div>
        </div>

        <h4 class="modal-sub-heading">Accomplishments</h4>
        <ul class="modal-list">
            ${impactsHtml}
        </ul>
    `;

    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden'; // Lock background scrolling
    modal.querySelector('.modal-close')?.focus();
}

function closeProjectModal() {
    const modal = document.getElementById('project-modal');
    if (modal) {
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
    }
    document.body.style.overflow = 'auto'; // Unlock background scrolling
}

// Close modal on background click
const modalOverlay = document.getElementById('project-modal');
if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            closeProjectModal();
        }
    });
}

// Esc key to close modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeProjectModal();
    }
});

/* ==========================================================================
   INTERACTIVE AI CHATBOT SIMULATOR
   ========================================================================== */

const CHAT_DATABASE = {
    projects: "Mohammad Ali has built several structured projects:\n1. <strong>Face Recognition Attendance System</strong>: OpenCV-based enrollment and timestamped entry/exit tracking.\n2. <strong>Alis AI Web Chatbot</strong>: Flask assistant with model integration and conversation history.\n3. <strong>MySQL Retail Billing Suite</strong>: Customer, product, invoice, receipt, and email workflows.\n4. <strong>Live News Desktop App</strong>: API-driven Tkinter reader with image rendering and article navigation.\n5. <strong>NumPy & Pandas Analytics Kit</strong>: Dataset cleaning and numerical analysis.\n6. <strong>Responsive Portfolio Hub</strong>: Responsive HTML, CSS, and JavaScript portfolio.",
    skills: "My technical skill list comprises:\n• <strong>Scripting</strong>: Python 3.11.9, JavaScript, OOP.\n• <strong>AI & Data</strong>: OpenCV, face recognition, NumPy, Pandas.\n• <strong>Application Stack</strong>: Flask, REST APIs, Tkinter, HTML5, CSS3.\n• <strong>Databases</strong>: MySQL with relational CRUD and billing workflows.\n• <strong>Tools</strong>: Git/GitHub, Photoshop, Canva.",
    experience: "My professional timeline includes:\n• <strong>Python Developer Intern</strong> @ Xipra Info Tech (Nov 2024 - Present): Building Python applications, writing backend business logic, working with Tkinter GUIs, and MySQL queries.\n• <strong>Graphic Designer (Freelance)</strong> @ Raahbar UV Prints (2023 - 2024): UV flatbed print templates design, color alignment, client deliverables.",
    contact: "You can connect with Mohammad Ali Khanusiya via:\n• <strong>Phone</strong>: +91 94094 33440\n• <strong>Mail</strong>: khanusiyamoali@gmail.com\n• <strong>Address</strong>: Ayman 52, Ahmedabad, Gujarat\n• <strong>LinkedIn</strong>: <a href='http://www.linkedin.com/in/mohammad-ali-khanusiya-905a71293' target='_blank' style='color:#22c55e;'>linkedin.com/in/mohammad-ali-khanusiya-905a71293</a>",
    default: "Thank you for asking! I am Mohammad Ali's cyber replica. I can provide details on his Python internship at Xipra Info Tech, MySQL skills, Tkinter designs, HNGU BCA education, or contact details. Ask me about his projects, skills, or how to contact him!"
};

function initChatbot() {
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');

    if (!chatForm || !chatInput) return;

    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const question = chatInput.value.trim();
        if (!question) return;

        // Add user message
        appendChatMessage(question, 'user');
        chatInput.value = '';

        // Generate response
        triggerAiResponse(question);
    });
}

function sendSuggestedMessage(question) {
    appendChatMessage(question, 'user');
    triggerAiResponse(question);
}

function appendChatMessage(text, sender) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `msg msg-${sender}`;

    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'msg-bubble';
    bubbleDiv.innerHTML = text;

    messageDiv.appendChild(bubbleDiv);
    chatMessages.appendChild(messageDiv);
    
    // Auto scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function triggerAiResponse(userQuery) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;

    // Determine query intent
    const queryLower = userQuery.toLowerCase();
    let responseText = CHAT_DATABASE.default;

    if (queryLower.includes('project') || queryLower.includes('work') || queryLower.includes('build') || queryLower.includes('do') || queryLower.includes('make')) {
        responseText = CHAT_DATABASE.projects;
    } else if (queryLower.includes('skill') || queryLower.includes('stack') || queryLower.includes('language') || queryLower.includes('framework') || queryLower.includes('library')) {
        responseText = CHAT_DATABASE.skills;
    } else if (queryLower.includes('experience') || queryLower.includes('intern') || queryLower.includes('job') || queryLower.includes('history') || queryLower.includes('xipra')) {
        responseText = CHAT_DATABASE.experience;
    } else if (queryLower.includes('contact') || queryLower.includes('email') || queryLower.includes('phone') || queryLower.includes('reach') || queryLower.includes('linkedin') || queryLower.includes('address')) {
        responseText = CHAT_DATABASE.contact;
    }

    // Append Typing Indicator
    const typingDiv = document.createElement('div');
    typingDiv.className = 'msg msg-ai typing-container';
    typingDiv.innerHTML = `
        <div class="msg-bubble">
            <div class="typing-indicator">
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
            </div>
        </div>
    `;
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Simulate Network Latency + Streaming
    setTimeout(() => {
        // Remove typing indicator
        typingDiv.remove();

        // Create actual response container
        const responseDiv = document.createElement('div');
        responseDiv.className = 'msg msg-ai';
        const bubble = document.createElement('div');
        bubble.className = 'msg-bubble';
        responseDiv.appendChild(bubble);
        chatMessages.appendChild(responseDiv);

        // Streaming text effect
        let currentText = '';
        let charIdx = 0;
        
        const words = responseText.split(/(\s+|<[^>]+>)/g).filter(Boolean);
        
        const streamInterval = setInterval(() => {
            if (charIdx < words.length) {
                currentText += words[charIdx];
                bubble.innerHTML = currentText;
                charIdx++;
                chatMessages.scrollTop = chatMessages.scrollHeight;
            } else {
                clearInterval(streamInterval);
            }
        }, 20);

    }, 1000); // Simulated think latency
}

/* ==========================================================================
   CONTACT FORM INTEGRATION
   ========================================================================== */

function initContactForm() {
    const contactForm = document.getElementById('contact-form');
    const formPanel = document.querySelector('.contact-form-panel');

    if (!contactForm || !formPanel) return;

    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Validate values
        const name = document.getElementById('form-name').value.trim();
        const email = document.getElementById('form-email').value.trim();
        const subject = document.getElementById('form-subject').value.trim();
        const message = document.getElementById('form-message').value.trim();

        if (!name || !email || !subject || !message) return;

        // Change submit button to loading state
        const submitBtn = document.getElementById('form-submit-btn');
        const submitBtnSpan = submitBtn.querySelector('span');
        submitBtnSpan.textContent = 'Transmitting Payload...';
        submitBtn.style.opacity = '0.7';
        submitBtn.style.pointerEvents = 'none';

        // Simulate secure transit API response
        setTimeout(() => {
            formPanel.innerHTML = `
                <div class="success-screen">
                    <div class="success-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>
                    <h3 class="success-title">Transmission Successful</h3>
                    <p class="success-text">Message payload successfully cataloged in Mohammad Ali's inbox routing system. Handshake connection will follow shortly.</p>
                </div>
            `;
        }, 1200);
    });
}


/* ==========================================================================
   ENTROPY PARTICLE CANVAS (ported from entropy.tsx)
   ========================================================================== */

function initEntropy() {
    const canvas = document.getElementById('entropy-canvas');
    if (!canvas) return;

    const wrap = canvas.parentElement;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    let size = 400;

    function resizeCanvas() {
        const w = wrap.clientWidth || 400;
        const h = wrap.clientHeight || 400;
        size = Math.min(w, h, 420);
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        canvas.style.width = size + 'px';
        canvas.style.height = size + 'px';
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
    }

    resizeCanvas();

    const particleColor = '#ffffff';

    function hexAlpha(alpha) {
        return Math.round(Math.min(1, Math.max(0, alpha)) * 255)
            .toString(16).padStart(2, '0');
    }

    class Particle {
        constructor(x, y, order) {
            this.x = x;
            this.y = y;
            this.originalX = x;
            this.originalY = y;
            this.size = 2;
            this.order = order;
            this.velocity = {
                x: (Math.random() - 0.5) * 2,
                y: (Math.random() - 0.5) * 2
            };
            this.influence = 0;
            this.neighbors = [];
        }

        update() {
            if (this.order) {
                const dx = this.originalX - this.x;
                const dy = this.originalY - this.y;
                const ci = { x: 0, y: 0 };
                this.neighbors.forEach(nb => {
                    if (!nb.order) {
                        const d = Math.hypot(this.x - nb.x, this.y - nb.y);
                        const s = Math.max(0, 1 - d / 100);
                        ci.x += nb.velocity.x * s;
                        ci.y += nb.velocity.y * s;
                        this.influence = Math.max(this.influence, s);
                    }
                });
                const inf = this.influence;
                this.x += dx * 0.05 * (1 - inf) + ci.x * inf;
                this.y += dy * 0.05 * (1 - inf) + ci.y * inf;
                this.influence *= 0.99;
            } else {
                this.velocity.x += (Math.random() - 0.5) * 0.5;
                this.velocity.y += (Math.random() - 0.5) * 0.5;
                this.velocity.x *= 0.95;
                this.velocity.y *= 0.95;
                this.x += this.velocity.x;
                this.y += this.velocity.y;
                if (this.x < size / 2 || this.x > size) this.velocity.x *= -1;
                if (this.y < 0 || this.y > size) this.velocity.y *= -1;
                this.x = Math.max(size / 2, Math.min(size, this.x));
                this.y = Math.max(0, Math.min(size, this.y));
            }
        }

        draw() {
            const alpha = this.order ? 0.8 - this.influence * 0.5 : 0.8;
            ctx.fillStyle = particleColor + hexAlpha(alpha);
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function buildParticles() {
        const list = [];
        const gridSize = 25;
        const spacing = size / gridSize;
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                const x = spacing * i + spacing / 2;
                const y = spacing * j + spacing / 2;
                list.push(new Particle(x, y, x < size / 2));
            }
        }
        return list;
    }

    let particles = buildParticles();

    function updateNeighbors() {
        particles.forEach(p => {
            p.neighbors = particles.filter(o => {
                if (o === p) return false;
                return Math.hypot(p.x - o.x, p.y - o.y) < 100;
            });
        });
    }

    let time = 0;
    let animId = null;

    function animate() {
        ctx.clearRect(0, 0, size, size);
        if (time % 30 === 0) updateNeighbors();

        particles.forEach(p => {
            p.update();
            p.draw();
            p.neighbors.forEach(nb => {
                const d = Math.hypot(p.x - nb.x, p.y - nb.y);
                if (d < 50) {
                    const a = 0.2 * (1 - d / 50);
                    ctx.strokeStyle = particleColor + hexAlpha(a);
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(nb.x, nb.y);
                    ctx.stroke();
                }
            });
        });

        // Centre divider line
        ctx.strokeStyle = particleColor + '4D';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(size / 2, 0);
        ctx.lineTo(size / 2, size);
        ctx.stroke();

        time++;
        animId = requestAnimationFrame(animate);
    }

    window.addEventListener('resize', () => {
        cancelAnimationFrame(animId);
        resizeCanvas();
        particles = buildParticles();
        time = 0;
        animate();
    });

    animate();
}


/* ==========================================================================
   THREE.JS 3D NEURAL BRAIN MODEL
   ========================================================================== */

function initThreeModel() {
    const panel = document.getElementById('hero-3d-panel');
    const canvas = document.getElementById('three-canvas');
    if (!panel || !canvas || typeof THREE === 'undefined') return;

    const W = panel.offsetWidth || 480;
    const H = panel.offsetHeight || 420;

    // ── Renderer ────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    // ── Scene & Camera ──────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(52, W / H, 0.1, 100);
    camera.position.z = 7;

    // ── Main Group ──────────────────────────────────────────
    const group = new THREE.Group();
    scene.add(group);

    // ── Core Icosahedron Wireframe ──────────────────────────
    const coreGeo = new THREE.IcosahedronGeometry(1.4, 2);
    const coreMat = new THREE.MeshBasicMaterial({
        color: 0x22c55e,
        wireframe: true,
        transparent: true,
        opacity: 0.35
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    group.add(core);

    // Inner soft glow sphere
    const glowGeo = new THREE.SphereGeometry(1.0, 24, 24);
    const glowMat = new THREE.MeshBasicMaterial({
        color: 0x22c55e,
        transparent: true,
        opacity: 0.04
    });
    group.add(new THREE.Mesh(glowGeo, glowMat));

    // ── Orbital Nodes ────────────────────────────────────────
    const NODE_COUNT = 72;
    const nodePositions = [];
    const nodeGeo = new THREE.SphereGeometry(0.055, 7, 7);

    for (let i = 0; i < NODE_COUNT; i++) {
        // Fibonacci sphere distribution
        const phi   = Math.acos(1 - (2 * (i + 0.5)) / NODE_COUNT);
        const theta = Math.PI * (1 + Math.sqrt(5)) * i;
        const r     = 2.2 + (Math.random() - 0.5) * 0.7;
        const pos   = new THREE.Vector3(
            r * Math.sin(phi) * Math.cos(theta),
            r * Math.sin(phi) * Math.sin(theta),
            r * Math.cos(phi)
        );
        nodePositions.push(pos);

        // Alternate node colours: green / sky-blue / purple
        const palette = [0x22c55e, 0x38bdf8, 0xc084fc];
        const mat = new THREE.MeshBasicMaterial({ color: palette[i % 3] });
        const mesh = new THREE.Mesh(nodeGeo, mat);
        mesh.position.copy(pos);
        group.add(mesh);
    }

    // ── Connection Lines (single merged geometry) ────────────
    const lineVerts = [];
    for (let i = 0; i < NODE_COUNT; i++) {
        for (let j = i + 1; j < NODE_COUNT; j++) {
            if (nodePositions[i].distanceTo(nodePositions[j]) < 1.6) {
                lineVerts.push(
                    nodePositions[i].x, nodePositions[i].y, nodePositions[i].z,
                    nodePositions[j].x, nodePositions[j].y, nodePositions[j].z
                );
            }
        }
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(lineVerts, 3));
    const lineMat = new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.22
    });
    group.add(new THREE.LineSegments(lineGeo, lineMat));

    // ── Ambient Floating Particles ──────────────────────────
    const PART = 280;
    const partPos = new Float32Array(PART * 3);
    for (let i = 0; i < PART * 3; i++) partPos[i] = (Math.random() - 0.5) * 12;
    const partGeo = new THREE.BufferGeometry();
    partGeo.setAttribute('position', new THREE.BufferAttribute(partPos, 3));
    const partMat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.028,
        transparent: true,
        opacity: 0.35
    });
    scene.add(new THREE.Points(partGeo, partMat));

    // ── Outer Ring ──────────────────────────────────────────
    const ringGeo = new THREE.TorusGeometry(2.8, 0.012, 8, 120);
    const ringMat = new THREE.MeshBasicMaterial({
        color: 0x22c55e,
        transparent: true,
        opacity: 0.18
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 3;
    group.add(ring);

    const ring2 = new THREE.Mesh(
        new THREE.TorusGeometry(3.1, 0.008, 8, 120),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.1 })
    );
    ring2.rotation.x = -Math.PI / 4;
    ring2.rotation.y = Math.PI / 6;
    group.add(ring2);

    // ── Mouse / Cursor Tracking ─────────────────────────────
    let mouseX = 0, mouseY = 0;
    let targetRotX = 0, targetRotY = 0;
    let scrollRot = window.scrollY * 0.0025;
    let targetScrollRot = scrollRot;

    window.addEventListener('mousemove', (e) => {
        mouseX =  (e.clientX / window.innerWidth  - 0.5) * 2;
        mouseY = -(e.clientY / window.innerHeight - 0.5) * 2;
    });

    window.addEventListener('scroll', () => {
        targetScrollRot = window.scrollY * 0.0025;
    }, { passive: true });

    // ── Animation Loop ───────────────────────────────────────
    let t = 0;
    (function animate() {
        requestAnimationFrame(animate);
        t += 0.006;

        // Smooth lerp toward cursor
        targetRotY += (mouseX * 2.2 - targetRotY) * 0.045;
        targetRotX += (mouseY * 1.1 - targetRotX) * 0.045;
        scrollRot += (targetScrollRot - scrollRot) * 0.08;

        group.rotation.y = targetRotY + scrollRot + t * 0.18;
        group.rotation.x = targetRotX + Math.sin(scrollRot * 0.55) * 0.18
            + Math.sin(t * 0.4) * 0.06;

        // Pulsing core
        const pulse = 1 + Math.sin(t * 1.8) * 0.03;
        core.scale.set(pulse, pulse, pulse);
        coreMat.opacity = 0.28 + Math.sin(t) * 0.1;

        // Slow ring rotation
        ring.rotation.z  += 0.003;
        ring2.rotation.z -= 0.002;

        renderer.render(scene, camera);
    })();

    // ── Resize ──────────────────────────────────────────────
    window.addEventListener('resize', () => {
        const w = panel.offsetWidth;
        const h = panel.offsetHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    });
}


/* ==========================================================================
   3D CARD TILT + CURSOR GLOW
   ========================================================================== */

function init3DEffects() {

    // ── Cursor glow orb ─────────────────────────────────────
    const glow = document.createElement('div');
    glow.className = 'cursor-glow';
    document.body.appendChild(glow);

    window.addEventListener('mousemove', (e) => {
        glow.style.left = e.clientX + 'px';
        glow.style.top  = e.clientY + 'px';
    });

    // ── 3D Tilt on cards ────────────────────────────────────
    const cards = document.querySelectorAll('.focus-card, .project-card');

    cards.forEach((card) => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width  - 0.5;  // -0.5 → 0.5
            const y = (e.clientY - rect.top)  / rect.height - 0.5;

            card.style.transition = 'transform 0.08s ease, box-shadow 0.08s ease';
            card.style.transform  = `
                perspective(900px)
                rotateX(${(-y * 14).toFixed(2)}deg)
                rotateY(${(x  * 14).toFixed(2)}deg)
                scale3d(1.03, 1.03, 1.03)
            `;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transition = 'transform 0.65s cubic-bezier(0.23,1,0.32,1), box-shadow 0.65s ease';
            card.style.transform  = 'perspective(900px) rotateX(0) rotateY(0) scale3d(1,1,1)';
        });
    });

    // ── Hero section parallax ───────────────────────────────
    const hero = document.querySelector('.hero-section');
    if (hero) {
        window.addEventListener('mousemove', (e) => {
            const cx = (e.clientX / window.innerWidth  - 0.5) * 2;
            const cy = (e.clientY / window.innerHeight - 0.5) * 2;
            hero.style.setProperty('--hero-mx', cx.toFixed(3));
            hero.style.setProperty('--hero-my', cy.toFixed(3));
        });
    }
}
