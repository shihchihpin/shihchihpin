// Select DOM Elements
const themeToggle = document.getElementById('theme-toggle');
const historyToggle = document.getElementById('history-toggle');
const historyPanel = document.getElementById('history-panel');
const historyList = document.getElementById('history-list');
const clearHistoryBtn = document.getElementById('clear-history');

const exprDisplay = document.getElementById('expression-display');
const resultDisplay = document.getElementById('result-display');

const btnModeBasic = document.getElementById('btn-mode-basic');
const btnModeScientific = document.getElementById('btn-mode-scientific');
const scientificKeys = document.getElementById('scientific-keys');
const calcContainer = document.getElementById('calculator');

const buttons = document.querySelectorAll('.btn, .btn-equal');

// Application State
let currentInput = '0'; // What is shown in result line (usually typing or calculation result)
let currentExpression = ''; // The full mathematical formula currently being built
let isCalculated = false; // Flag to check if screen is showing a final result
let history = JSON.parse(localStorage.getItem('calc_history')) || [];

// Init UI on load
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  renderHistory();
  setupEventListeners();
  autoScaleResultText();
});

// --- Theme Management ---
function initTheme() {
  const savedTheme = localStorage.getItem('calc_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('calc_theme', newTheme);
}

// --- Layout Mode Management ---
function setMode(mode) {
  if (mode === 'scientific') {
    btnModeScientific.classList.add('active');
    btnModeBasic.classList.remove('active');
    scientificKeys.classList.add('show');
    calcContainer.classList.add('scientific-mode');
  } else {
    btnModeBasic.classList.add('active');
    btnModeScientific.classList.remove('active');
    scientificKeys.classList.remove('show');
    calcContainer.classList.remove('scientific-mode');
  }
}

// --- UI Display Helpers ---
function updateDisplay() {
  // Format operator characters for user friendly display
  let formattedExpr = currentExpression
    .replace(/\*/g, ' × ')
    .replace(/\//g, ' ÷ ')
    .replace(/\^/g, ' ^ ')
    .replace(/PI/g, 'π')
    .replace(/E/g, 'e');
  
  exprDisplay.textContent = formattedExpr;
  resultDisplay.textContent = currentInput;
  autoScaleResultText();
}

function autoScaleResultText() {
  const len = resultDisplay.textContent.length;
  if (len > 12) {
    resultDisplay.style.fontSize = '1.4rem';
  } else if (len > 8) {
    resultDisplay.style.fontSize = '1.8rem';
  } else {
    resultDisplay.style.fontSize = '2.2rem';
  }
}

// --- History Drawer Management ---
function toggleHistoryDrawer() {
  historyPanel.classList.toggle('show');
}

function renderHistory() {
  historyList.innerHTML = '';
  if (history.length === 0) {
    historyList.innerHTML = '<div class="empty-history">尚無紀錄</div>';
    return;
  }
  
  // Display latest first
  history.slice().reverse().forEach((item, index) => {
    const originalIndex = history.length - 1 - index;
    const historyItem = document.createElement('div');
    historyItem.className = 'history-item';
    historyItem.setAttribute('data-index', originalIndex);
    
    // Format formula
    let formattedExpr = item.expr
      .replace(/\*/g, ' × ')
      .replace(/\//g, ' ÷ ')
      .replace(/\^/g, ' ^ ')
      .replace(/PI/g, 'π')
      .replace(/E/g, 'e');

    historyItem.innerHTML = `
      <span class="history-item-exp">${formattedExpr} =</span>
      <span class="history-item-res">${item.result}</span>
    `;
    
    // Clicking a history item loads it back to display
    historyItem.addEventListener('click', () => {
      currentExpression = item.expr;
      currentInput = item.result;
      isCalculated = true;
      updateDisplay();
      toggleHistoryDrawer();
    });
    
    historyList.appendChild(historyItem);
  });
}

function addToHistory(expr, result) {
  // Prevent duplicate consecutive entries
  if (history.length > 0 && history[history.length - 1].expr === expr) return;
  
  history.push({ expr, result });
  if (history.length > 100) history.shift(); // Cap history size at 100
  localStorage.setItem('calc_history', JSON.stringify(history));
  renderHistory();
}

function clearHistory() {
  history = [];
  localStorage.removeItem('calc_history');
  renderHistory();
}

// --- Mathematical Helper Functions ---
function factorial(n) {
  if (n < 0) return NaN;
  if (n === 0 || n === 1) return 1;
  if (!Number.isInteger(n)) {
    // Gamma function approximation for non-integers (simple version or just fallback to NaN for simplicity)
    return NaN;
  }
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}

function sin(x) {
  return Math.sin(x * Math.PI / 180);
}

function cos(x) {
  const val = Math.cos(x * Math.PI / 180);
  return Math.abs(val) < 1e-15 ? 0 : val;
}

function tan(x) {
  const normalized = ((x % 360) + 360) % 360;
  if (Math.abs(normalized - 90) < 1e-9 || Math.abs(normalized - 270) < 1e-9) {
    return Infinity;
  }
  const val = Math.tan(x * Math.PI / 180);
  return Math.abs(val) < 1e-15 ? 0 : val;
}

// --- Safe Evaluator ---
function safeEvaluate(expressionString) {
  // Convert visual functions to JS equivalents
  // Make sure to parse caret (^) to exponentiation. Since we might have complex parentheses, 
  // we'll replace caret operators. A simple way for a single page app is parsing functions.
  let jsExpr = expressionString;
  
  // Functions mappings
  jsExpr = jsExpr.replace(/sin\(/g, 'sin(');
  jsExpr = jsExpr.replace(/cos\(/g, 'cos(');
  jsExpr = jsExpr.replace(/tan\(/g, 'tan(');
  jsExpr = jsExpr.replace(/log\(/g, 'Math.log10(');
  jsExpr = jsExpr.replace(/ln\(/g, 'Math.log(');
  jsExpr = jsExpr.replace(/sqrt\(/g, 'Math.sqrt(');
  jsExpr = jsExpr.replace(/PI/g, 'Math.PI');
  jsExpr = jsExpr.replace(/E/g, 'Math.E');

  // Factorial parsing: match [number or constant]! and replace with factorial(number)
  // Match simple numbers or PI/E
  jsExpr = jsExpr.replace(/(\d+(\.\d+)?|Math\.PI|Math\.E)!/g, 'factorial($1)');
  
  // Power parsing (a^b -> Math.pow(a, b))
  // A robust parser is needed for nested parentheses, but for standard inputs:
  // We can solve it recursively or using standard regex if it's single level,
  // or a custom parser. Let's do a simple recursive regex replacement for caret (x^y)
  while (jsExpr.includes('^')) {
    // Pattern to find: (left) ^ (right)
    // To handle variables or numbers, we'll write a simple regex or parser.
    // Let's implement a parser replacement.
    const caretIndex = jsExpr.indexOf('^');
    
    // Find Left Operand
    let leftIndex = caretIndex - 1;
    let openBrackets = 0;
    // Walk backwards
    if (jsExpr[leftIndex] === ')') {
      openBrackets = 1;
      leftIndex--;
      while (leftIndex >= 0 && openBrackets > 0) {
        if (jsExpr[leftIndex] === ')') openBrackets++;
        if (jsExpr[leftIndex] === '(') openBrackets--;
        leftIndex--;
      }
      leftIndex++; // Adjust back
    } else {
      // Find beginning of number or math constant/function
      while (leftIndex >= 0 && /[0-9a-zA-Z._$()]/ .test(jsExpr[leftIndex])) {
        // Special check: stop if we cross an operator, but keep dots, functions, PI, E, etc.
        if (['+', '-', '*', '/', '%'].includes(jsExpr[leftIndex]) && openBrackets === 0) {
          break;
        }
        leftIndex--;
      }
      leftIndex++;
    }
    const leftOperand = jsExpr.substring(leftIndex, caretIndex).trim();

    // Find Right Operand
    let rightIndex = caretIndex + 1;
    openBrackets = 0;
    // Walk forwards
    if (jsExpr[rightIndex] === '(') {
      openBrackets = 1;
      rightIndex++;
      while (rightIndex < jsExpr.length && openBrackets > 0) {
        if (jsExpr[rightIndex] === '(') openBrackets++;
        if (jsExpr[rightIndex] === ')') openBrackets--;
        rightIndex++;
      }
    } else {
      // Find end of number or function call
      while (rightIndex < jsExpr.length && /[0-9a-zA-Z._$()]/ .test(jsExpr[rightIndex])) {
        if (['+', '-', '*', '/', '%'].includes(jsExpr[rightIndex]) && openBrackets === 0) {
          break;
        }
        rightIndex++;
      }
    }
    const rightOperand = jsExpr.substring(caretIndex + 1, rightIndex).trim();
    
    // Replace
    const target = jsExpr.substring(leftIndex, rightIndex);
    const replacement = `Math.pow(${leftOperand},${rightOperand})`;
    jsExpr = jsExpr.replace(target, replacement);
  }

  // Percentage logic: replace numbers with % suffix by dividing by 100
  // e.g. 50% -> (50/100). We should ensure this doesn't clash with standard division.
  jsExpr = jsExpr.replace(/(\d+(\.\d+)?)%/g, '($1/100)');

  // Input Sanitization for Safety
  // Only allow valid mathematical symbols and JS Math references
  let checkExpr = jsExpr;
  checkExpr = checkExpr.replace(/Math\.(log10|log|sqrt|pow|PI|E)/g, '');
  checkExpr = checkExpr.replace(/(sin|cos|tan|factorial)/g, '');
  checkExpr = checkExpr.replace(/[0-9+\-*/%().,\s]/g, '');
  if (checkExpr.length > 0) {
    throw new Error('不合法的輸入');
  }

  // Calculate
  // Define local function wrappers for safety inside eval context
  const evalFunc = new Function('factorial', 'sin', 'cos', 'tan', `return (${jsExpr})`);
  const value = evalFunc(factorial, sin, cos, tan);
  
  if (value === undefined || Number.isNaN(value) || !Number.isFinite(value)) {
    throw new Error('計算錯誤');
  }
  
  // Format long decimals
  if (value.toString().includes('.') && value.toString().split('.')[1].length > 10) {
    return parseFloat(value.toFixed(10));
  }
  return value;
}

// --- Action & Input Handling ---
function handleInput(val) {
  // If last action was a calculation, clear or chain based on input
  if (isCalculated) {
    if (['+', '-', '*', '/', '%', '^'].includes(val)) {
      currentExpression = currentInput;
    } else {
      currentExpression = '';
      currentInput = '';
    }
    isCalculated = false;
  }

  if (currentInput === '0' && !['.', '+', '-', '*', '/', '%', '^'].includes(val)) {
    currentInput = '';
  }

  currentExpression += val;
  currentInput = val;
  updateDisplay();
}

function handleAction(action) {
  switch (action) {
    case 'clear':
      currentInput = '0';
      currentExpression = '';
      isCalculated = false;
      updateDisplay();
      break;
      
    case 'backspace':
      if (isCalculated) {
        currentExpression = '';
        currentInput = '0';
        isCalculated = false;
      } else {
        if (currentExpression.length > 0) {
          // If we are deleting a function like "sin(", delete the whole thing
          const funcRegex = /(sin\(|cos\(|tan\(|log\(|ln\(|sqrt\()$/;
          if (funcRegex.test(currentExpression)) {
            currentExpression = currentExpression.replace(funcRegex, '');
          } else {
            currentExpression = currentExpression.slice(0, -1);
          }
          
          if (currentExpression === '') {
            currentInput = '0';
          } else {
            // Find last term
            const lastChar = currentExpression[currentExpression.length - 1];
            currentInput = lastChar;
          }
        } else {
          currentInput = '0';
        }
      }
      updateDisplay();
      break;

    case 'negate':
      if (isCalculated) {
        currentInput = (parseFloat(currentInput) * -1).toString();
        currentExpression = currentInput;
        isCalculated = false;
      } else {
        // Toggle negative sign of the current number term
        // Find the last number term in expression
        const matches = currentExpression.match(/(-?\d+(\.\d+)?|PI|E)$/);
        if (matches) {
          const lastNum = matches[0];
          const lastNumIndex = currentExpression.lastIndexOf(lastNum);
          
          let negated;
          if (lastNum.startsWith('-')) {
            negated = lastNum.substring(1);
          } else {
            negated = '-' + lastNum;
          }
          currentExpression = currentExpression.substring(0, lastNumIndex) + negated;
          currentInput = negated;
        } else {
          // If expression ends in a non-number (like "+"), prepend negative sign to a new number group
          currentExpression += '-';
          currentInput = '-';
        }
      }
      updateDisplay();
      break;
      
    case 'sin':
    case 'cos':
    case 'tan':
    case 'log':
    case 'ln':
    case 'sqrt':
      if (isCalculated) {
        currentExpression = action + '(' + currentInput + ')';
        isCalculated = false;
      } else {
        currentExpression += action + '(';
      }
      currentInput = action + '(';
      updateDisplay();
      break;
      
    case 'pow':
      if (isCalculated) {
        currentExpression = currentInput + '^';
        isCalculated = false;
      } else {
        currentExpression += '^';
      }
      currentInput = '^';
      updateDisplay();
      break;
      
    case 'fact':
      if (isCalculated) {
        currentExpression = currentInput + '!';
        isCalculated = false;
      } else {
        currentExpression += '!';
      }
      currentInput = '!';
      updateDisplay();
      break;
      
    case 'calculate':
      if (!currentExpression) return;
      try {
        // Close dangling parentheses automatically
        let openBrackets = (currentExpression.match(/\(/g) || []).length;
        let closeBrackets = (currentExpression.match(/\)/g) || []).length;
        while (openBrackets > closeBrackets) {
          currentExpression += ')';
          closeBrackets++;
        }

        const res = safeEvaluate(currentExpression);
        addToHistory(currentExpression, res.toString());
        currentInput = res.toString();
        isCalculated = true;
      } catch (err) {
        currentInput = err.message === '不合法的輸入' ? '不合法輸入' : '錯誤';
        isCalculated = true;
      }
      updateDisplay();
      break;
  }
}

// --- Keyboard Event Handler & Flash Effects ---
function flashButton(btnElement) {
  if (!btnElement) return;
  btnElement.classList.add('active');
  btnElement.style.transform = 'scale(0.96)';
  setTimeout(() => {
    btnElement.classList.remove('active');
    btnElement.style.transform = '';
  }, 100);
}

function handleKeyboard(e) {
  // Prevent default scrolling on space or backspace/arrow keys if needed
  if (['Space', 'Backspace'].includes(e.key)) {
    // don't prevent all in case of standard user actions, but prevent defaults for calculator keys
  }

  const key = e.key;
  let query = '';
  
  if (/[0-9]/.test(key)) {
    query = `.btn-num[data-val="${key}"]`;
    handleInput(key);
  } else if (key === '.') {
    query = `.btn-num[data-val="."]`;
    handleInput('.');
  } else if (['+', '-', '*', '/'].includes(key)) {
    query = `.btn-op[data-val="${key}"]`;
    handleInput(key);
  } else if (key === '%') {
    query = `.btn-util[data-val="%"]`;
    handleInput('%');
  } else if (key === '(' || key === ')') {
    query = `.btn-sci[data-val="${key}"]`;
    handleInput(key);
  } else if (key === '^') {
    query = `.btn-sci[data-action="pow"]`;
    handleAction('pow');
  } else if (key === '!') {
    query = `.btn-sci[data-action="fact"]`;
    handleAction('fact');
  } else if (key === 'Enter' || key === '=') {
    e.preventDefault();
    query = `.btn-equal`;
    handleAction('calculate');
  } else if (key === 'Backspace') {
    query = `.btn-util[data-action="backspace"]`;
    handleAction('backspace');
  } else if (key === 'Escape' || key.toLowerCase() === 'c') {
    query = `.btn-util[data-action="clear"]`;
    handleAction('clear');
  }
  
  if (query) {
    const btn = document.querySelector(query);
    flashButton(btn);
  }
}

// --- Event Listeners Setup ---
function setupEventListeners() {
  // Button click handlers
  buttons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      // Small vibrate effect if supported on mobile
      if (navigator.vibrate) navigator.vibrate(10);
      
      const val = btn.getAttribute('data-val');
      const action = btn.getAttribute('data-action');
      
      if (val) {
        handleInput(val);
      } else if (action) {
        handleAction(action);
      }
    });
  });

  // Keyboard support
  document.addEventListener('keydown', handleKeyboard);

  // Theme Toggler
  themeToggle.addEventListener('click', toggleTheme);

  // History Drawer Toggle
  historyToggle.addEventListener('click', toggleHistoryDrawer);
  
  // Close history drawer when clicking outside it (but inside calculator container)
  document.addEventListener('click', (e) => {
    if (!historyPanel.contains(e.target) && 
        !historyToggle.contains(e.target) && 
        historyPanel.classList.contains('show')) {
      toggleHistoryDrawer();
    }
  });

  // Clear History
  clearHistoryBtn.addEventListener('click', clearHistory);

  // Mode Selection (Basic vs Scientific)
  btnModeBasic.addEventListener('click', () => setMode('basic'));
  btnModeScientific.addEventListener('click', () => setMode('scientific'));
}
