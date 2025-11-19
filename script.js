document.addEventListener('DOMContentLoaded', function() {
    const generateBtn = document.getElementById('generateBtn');
    const repeatBtn = document.getElementById('repeatBtn');
    const resetBtn = document.getElementById('resetBtn');
    const calledNumbersList = document.getElementById('calledNumbersList');
    const currentNumberDisplay = document.getElementById('currentNumber');
    const currentLetterDisplay = document.getElementById('currentLetter');
    const bingoBoard = document.getElementById('bingoBoard');
    const pauseBtn = document.getElementById('pauseBtn');
    const resumeBtn = document.getElementById('resumeBtn');
    const bingoMessage = document.getElementById('bingoMessage');
    
    const autoStatusIndicator = document.getElementById('autoStatusIndicator');
    const autoStatusText = document.getElementById('autoStatusText');
    const availableCount = document.getElementById('availableCount');
    const calledCount = document.getElementById('calledCount');
    const progressFill = document.getElementById('progressFill');
    
    const intervalSelectorBtn = document.getElementById('intervalSelectorBtn');
    const intervalDropdown = document.getElementById('intervalDropdown');
    const intervalText = document.getElementById('intervalText');
    const intervalOptions = document.querySelectorAll('.interval-option');
    
    // Elementos del modo oscuro
    const body = document.body;
    const darkModeToggle = document.getElementById('darkModeToggle');
    const darkModeIcon = document.getElementById('darkModeIcon');
    const themeKey = 'bingoThemeMode';


    let availableNumbers = [];
    let calledNumbers = [];
    let autoGenerateInterval = null;
    let reelInterval = null; // Nuevo intervalo para el efecto carrete
    let currentInterval = 0;
    let isGenerating = false; 
    
    const REEL_DURATION_MS = 1500; 

    const synthSpeech = window.speechSynthesis;
    const synth = new Tone.Synth().toDestination();
    const bingoSynth = new Tone.PolySynth(Tone.Synth).toDestination();

    // --- Lógica del Modo Oscuro/Claro ---
    function loadTheme() {
        const savedTheme = localStorage.getItem(themeKey);
        if (savedTheme === 'dark') {
            setDarkMode(true);
        } else {
            setDarkMode(false);
        }
    }

    function setDarkMode(isDark) {
        if (isDark) {
            body.classList.add('dark-mode');
            body.classList.remove('light-mode');
            darkModeIcon.classList.remove('fa-sun');
            darkModeIcon.classList.add('fa-moon');
            localStorage.setItem(themeKey, 'dark');
        } else {
            body.classList.remove('dark-mode');
            body.classList.add('light-mode');
            darkModeIcon.classList.remove('fa-moon');
            darkModeIcon.classList.add('fa-sun');
            localStorage.setItem(themeKey, 'light');
        }
    }

    darkModeToggle.addEventListener('click', () => {
        const isDark = body.classList.contains('dark-mode');
        setDarkMode(!isDark);
    });
    // ------------------------------------


    function speakNumber(number, letter) {
        if (!synthSpeech) {
            console.log("Speech Synthesis API no está soportada en este navegador.");
            return;
        }
        
        const textToSpeak = `${letter} ${number}, ${letter}, el número, ${number}`;
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        
        utterance.lang = 'es-US'; 
        utterance.rate = 1;
        
        synthSpeech.cancel();
        synthSpeech.speak(utterance);
    }

    // Actualiza el estado (habilitado/deshabilitado) de los botones de control
    function updateButtonStates() {
        repeatBtn.disabled = calledNumbers.length === 0;
        pauseBtn.disabled = !autoGenerateInterval;
        resumeBtn.disabled = !!autoGenerateInterval || currentInterval === 0;
    }

    function updateNumbersCounter() {
        const available = availableNumbers.length;
        const called = calledNumbers.length;
        const total = 75;
        
        availableCount.textContent = available;
        calledCount.textContent = called;
        
        const progressPercentage = (called / total) * 100;
        progressFill.style.width = `${progressPercentage}%`;
    }

    function updateAutoStatusIndicator(isActive, interval = null) {
        if (isActive && interval) {
            autoStatusIndicator.classList.remove('inactive');
            autoStatusIndicator.classList.add('active');
            autoStatusText.textContent = `Generando cada ${interval} segundos`;
        } else {
            autoStatusIndicator.classList.remove('active');
            autoStatusIndicator.classList.add('inactive');
            autoStatusText.textContent = 'Generación automática desactivada';
        }
    }

    function renderBoard() {
        bingoBoard.innerHTML = '';
        const letters = ['B', 'I', 'N', 'G', 'O'];
        const ranges = [[1, 15], [16, 30], [31, 45], [46, 60], [61, 75]];

        letters.forEach((letter, index) => {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'bingo-row ' + letter.toLowerCase() + '-row';

            const headerDiv = document.createElement('div');
            headerDiv.className = 'bingo-header';
            headerDiv.textContent = letter;
            rowDiv.appendChild(headerDiv);

            const [start, end] = ranges[index];
            for (let i = start; i <= end; i++) {
                const cellDiv = document.createElement('div');
                cellDiv.className = 'bingo-cell ' + letter.toLowerCase() + '-col';
                cellDiv.id = letter.toLowerCase() + '-' + i;
                cellDiv.textContent = i;
                rowDiv.appendChild(cellDiv);
            }
            bingoBoard.appendChild(rowDiv);
        });
    }

    function initializeNumbers() {
        availableNumbers = Array.from({length: 75}, (_, i) => i + 1);
        calledNumbers = [];
        updateCalledNumbersList();
        resetBoard();
        currentNumberDisplay.textContent = '-';
        currentLetterDisplay.textContent = '';
        currentLetterDisplay.className = 'current-number-letter';
        stopAutoGenerate();
        stopReelEffect();
        updateNumbersCounter();
        updateAutoStatusIndicator(false);
        
        intervalText.textContent = 'Seleccionar intervalo';
        intervalSelectorBtn.classList.remove('active');
        intervalOptions.forEach(option => option.classList.remove('active'));
        
        isGenerating = false;
        generateBtn.disabled = false;
        resetBtn.disabled = false;
        intervalSelectorBtn.disabled = false;
        updateButtonStates();

        if (synthSpeech) {
            synthSpeech.cancel();
        }
    }
    
    function resetBoard() {
        const cells = document.querySelectorAll('.bingo-cell');
        cells.forEach(cell => {
            cell.classList.remove('called');
            cell.classList.remove('called-pulse');
            cell.style.cssText = ''; 
        });
    }
    
    function updateCalledNumbersList() {
        calledNumbersList.innerHTML = '';
        const reversedCalledNumbers = [...calledNumbers].reverse();
        reversedCalledNumbers.forEach(number => {
            const numberItem = document.createElement('div');
            const letter = getColumnLetter(number);
            
            numberItem.className = 'number-item ' + letter + '-item';
            numberItem.textContent = number;
            calledNumbersList.appendChild(numberItem);
        });
    }
    
    function getNumberLetter(number) {
        if (number <= 15) return 'b';
        if (number <= 30) return 'i';
        if (number <= 45) return 'n';
        if (number <= 60) return 'g';
        return 'o';
    }

    function startReelEffect() {
        if (availableNumbers.length === 0) return;

        const allNumbers = Array.from({length: 75}, (_, i) => i + 1); 

        if (reelInterval) {
            clearInterval(reelInterval);
        }
        
        currentNumberDisplay.classList.add('reel-flashing');
        currentLetterDisplay.classList.add('reel-flashing');

        reelInterval = setInterval(() => {
            const randomIndex = Math.floor(Math.random() * allNumbers.length);
            const flashingNumber = allNumbers[randomIndex];
            const letter = getNumberLetter(flashingNumber);
            const upperLetter = letter.toUpperCase();

            currentNumberDisplay.textContent = flashingNumber;
            currentLetterDisplay.textContent = upperLetter; 
            currentLetterDisplay.className = `current-number-letter ${letter}-letter`;

            synth.triggerAttackRelease("C2", "64n");

        }, 50);
    }

    function stopReelEffect() {
        if (reelInterval) {
            clearInterval(reelInterval);
            reelInterval = null;
        }
        currentNumberDisplay.classList.remove('reel-flashing');
        currentLetterDisplay.classList.remove('reel-flashing');
    }

    function _updateFinalNumber(number) {
        const letter = getNumberLetter(number);
        const upperLetter = letter.toUpperCase();

        currentNumberDisplay.textContent = number;
        currentLetterDisplay.textContent = upperLetter;
        currentLetterDisplay.className = `current-number-letter ${letter}-letter`;

        updateBoard(number);
        updateCalledNumbersList();
        updateNumbersCounter();
        
        bingoSynth.triggerAttackRelease(["C4", "G4"], "8n"); 
        speakNumber(number, upperLetter);
    }
    
    function generateNumber() {
        if (isGenerating) return;

        if (availableNumbers.length === 0) {
            stopAutoGenerate();
            showBingoMessage('¡Todos los números han sido sorteados!');
            return;
        }
        
        isGenerating = true;
        generateBtn.disabled = true;
        resetBtn.disabled = true; 
        repeatBtn.disabled = true; 
        pauseBtn.disabled = true; 
        resumeBtn.disabled = true; 
        intervalSelectorBtn.disabled = true; 
        
        const randomIndex = Math.floor(Math.random() * availableNumbers.length);
        const finalNumber = availableNumbers[randomIndex];
        
        startReelEffect();
        Tone.start();

        setTimeout(() => {
            stopReelEffect();
            
            availableNumbers.splice(randomIndex, 1);
            calledNumbers.push(finalNumber);
            
            _updateFinalNumber(finalNumber);
            
            isGenerating = false;
            generateBtn.disabled = false;
            resetBtn.disabled = false;
            intervalSelectorBtn.disabled = false;
            updateButtonStates();

        }, REEL_DURATION_MS);
    }
    
    function updateBoard(number) {
        const letter = getNumberLetter(number);
        const cell = document.getElementById(letter + '-' + number);
        if (cell) {
            cell.classList.add('called');
            cell.classList.remove('called-pulse');
            void cell.offsetWidth; // Force reflow
            cell.classList.add('called-pulse');

            setTimeout(() => {
                cell.classList.remove('called-pulse');
            }, 500);
        }
    }
    
    function getColumnLetter(number) {
        return getNumberLetter(number);
    }

    function startAutoGenerate(interval) {
        stopAutoGenerate();
        currentInterval = interval;
        autoGenerateInterval = setInterval(generateNumber, REEL_DURATION_MS + (interval * 1000));
        updateAutoStatusIndicator(true, interval);
        Tone.start();
        updateButtonStates();
    }

    function stopAutoGenerate() {
        if (autoGenerateInterval) {
            clearInterval(autoGenerateInterval);
            autoGenerateInterval = null;
        }
        updateAutoStatusIndicator(false);
        if (synthSpeech) {
            synthSpeech.cancel();
        }
        updateButtonStates();
    }

    function showBingoMessage(message) {
        bingoMessage.textContent = message;
        bingoMessage.classList.add('show');

        setTimeout(() => {
            bingoMessage.classList.remove('show');
        }, 3000); 
    }
    
    generateBtn.addEventListener('click', () => {
        Tone.start();
        generateNumber();
    });

    repeatBtn.addEventListener('click', () => {
        if (calledNumbers.length > 0) {
            const lastNumber = calledNumbers[calledNumbers.length - 1];
            const lastLetter = getColumnLetter(lastNumber).toUpperCase();
            speakNumber(lastNumber, lastLetter);
        } else {
            showBingoMessage('No hay números cantados para repetir.', 3000); 
            synth.triggerAttackRelease("C3", "16n");
        }
    });

    resetBtn.addEventListener('click', () => {
        if (isGenerating) return;
        initializeNumbers();
    });

    intervalSelectorBtn.addEventListener('click', function() {
        if (intervalSelectorBtn.disabled) return;
        intervalDropdown.classList.toggle('open');
        intervalSelectorBtn.classList.toggle('open');
    });

    intervalOptions.forEach(option => {
        option.addEventListener('click', function() {
            if (isGenerating) return; 

            const interval = parseInt(this.dataset.interval);
            
            intervalText.textContent = `${interval} segundos`;
            intervalSelectorBtn.classList.add('active');
            
            intervalOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            
            intervalDropdown.classList.remove('open');
            intervalSelectorBtn.classList.remove('open');
            
            startAutoGenerate(interval);
        });
    });

    document.addEventListener('click', function(event) {
        // Ignorar clics en el toggle de modo oscuro
        if (event.target === darkModeToggle || darkModeToggle.contains(event.target)) {
            return;
        }
        // Ocultar el dropdown si se hace clic fuera
        if (!intervalSelectorBtn.contains(event.target) && !intervalDropdown.contains(event.target)) {
            intervalDropdown.classList.remove('open');
            intervalSelectorBtn.classList.remove('open');
        }
    });

    pauseBtn.addEventListener('click', () => {
        if (pauseBtn.disabled) return;
        stopAutoGenerate();
    });

    resumeBtn.addEventListener('click', () => {
        if (resumeBtn.disabled) return; 
        Tone.start();
        if (!autoGenerateInterval && currentInterval > 0) {
            startAutoGenerate(currentInterval);
        }
    });
    
    // Inicializar
    loadTheme(); // Cargar el tema al inicio
    renderBoard();
    initializeNumbers();
});