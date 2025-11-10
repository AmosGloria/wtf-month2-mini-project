document.addEventListener('DOMContentLoaded', () => {
  const dashboard   = document.querySelector('.dashboard');
  const openStudent = document.getElementById('open-student');
  const studentCalc = document.getElementById('student-calc');

  if (!openStudent || !studentCalc || !dashboard) {
    console.error('Missing one or more elements. Verify your HTML IDs/class names.');
    return;
  }

  const timeEl = document.getElementById('nav-time');

  function updateTime(){
    if (!timeEl) return;
    const d  = new Date();
    const hh = String(d.getHours()).padStart(2,'0');
    const mm = String(d.getMinutes()).padStart(2,'0');
    timeEl.textContent = `${hh}:${mm}`;
  }
  updateTime();
  setInterval(updateTime, 30000);

  const dispInput  = document.getElementById('display-input');
  const dispResult = document.getElementById('display-result');
  const grid       = document.getElementById('grid');
  const symbolsRow = document.querySelector('.symbols');

  let expr = '0';
  let justEvaluated = false;

  const allowed = new Set(['0','1','2','3','4','5','6','7','8','9','.','+','-','×','/']);

  const OPS = new Set(['+','-','*','/']);
  function isDigit(ch){ return ch >= '0' && ch <= '9'; }
  function isNumChar(ch){ return isDigit(ch) || ch === '.'; }
  function isOperator(ch){ return ch === '×' || OPS.has(ch); }

  function normalize(exp){
    let out = '';
    for (const ch of exp) out += (ch === '×' ? '*' : ch);
    return out;
  }

  function sanitize(exp){
    let out = '';
    for (const ch of exp){
      if (
        isDigit(ch) || ch === '.' || ch === '(' || ch === ')' || ch === '%' || ch === ' ' ||
        ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '×'
      ){
        out += ch;
      }
    }
    return out;
  }

  function getLastNumberRange(s){
    let i = s.length - 1;
    if (i < 0) return null;
    while (i >= 0 && !isNumChar(s[i])) {
      if (s[i] !== ' ') break;
      i--;
    }
   
    let end = i + 1;
    while (i >= 0 && isNumChar(s[i])) i--;
    const start = i + 1;
    return (start < end) ? { start, end, text: s.slice(start, end) } : null;
  }

  function tokenize(str){
    const toks = [];
    let i = 0;

    while (i < str.length){
      const ch = str[i];

      if (ch === ' ') { i++; continue; }

      if (isDigit(ch) || ch === '.'){
        let start = i;
        let dotSeen = (ch === '.') ? 1 : 0;
        i++;
        while (i < str.length){
          const c = str[i];
          if (isDigit(c)) { i++; continue; }
          if (c === '.' && dotSeen === 0) { dotSeen = 1; i++; continue; }
          break;
        }
        toks.push(str.slice(start, i));
        continue;
      }

      if (isOperator(ch) || ch === '(' || ch === ')' || ch === '%'){
        toks.push(ch);
        i++;
        continue;
      }

      i++;
    }

    return toks;
  }

  function computeArithmetic(exprStr) {
    const tokens = tokenize(exprStr);

    const output = [];
    const ops = [];
   
    const prec = { 'u-': 3, 'pct': 3, '*': 2, '/': 2, '+': 1, '-': 1 };
    const rightAssoc = new Set(['u-','pct']);
    function isOpToken(t){ return Object.prototype.hasOwnProperty.call(prec, t); }

    let prev = null;

    for (const tok of tokens) {
      if (!Number.isNaN(Number(tok))) {
        output.push(Number(tok));
        prev = tok;
        continue;
      }

      if (tok === '%'){
        output.push('pct');
        prev = tok;
        continue;
      }

      if (tok === '+' || tok === '-' || tok === '*' || tok === '/'){
        const isUnary = tok === '-' && (prev === null || isOpToken(prev) || prev === '(');
        const op = isUnary ? 'u-' : tok;

        while (ops.length){
          const top = ops[ops.length - 1];
          if (top === '(') break;
          const higher = prec[top] > prec[op];
          const equalAndLeft = prec[top] === prec[op] && !rightAssoc.has(op);
          if (higher || equalAndLeft) output.push(ops.pop());
          else break;
        }
        ops.push(op);
        prev = op;
        continue;
      }

      if (tok === '('){ ops.push(tok); prev = '('; continue; }
      if (tok === ')'){
        while (ops.length && ops[ops.length - 1] !== '(') output.push(ops.pop());
        if (!ops.length) return 'Error'; 
        ops.pop(); 
        prev = ')';
        continue;
      }

    }

    while (ops.length){
      const op = ops.pop();
      if (op === '(') return 'Error'; 
      output.push(op);
    }

    const stack = [];
    for (const t of output) {
      if (typeof t === 'number') { stack.push(t); continue; }

      if (t === 'u-') {
        if (stack.length < 1) return 'Error';
        stack.push(-stack.pop());
        continue;
      }

      if (t === 'pct') {
        if (stack.length < 1) return 'Error';
        stack.push(stack.pop() / 100);
        continue;
      }

      if (t === '+' || t === '-' || t === '*' || t === '/'){
        if (stack.length < 2) return 'Error';
        const b = stack.pop();
        const a = stack.pop();
        stack.push(
          t === '+' ? a + b :
          t === '-' ? a - b :
          t === '*' ? a * b :
                      a / b
        );
        continue;
      }

      return 'Error';
    }

    const v = stack.pop();
    return (stack.length === 0 && typeof v === 'number' && Number.isFinite(v)) ? v : 'Error';
  }

  function computeResult(exp){
    const cleaned    = sanitize(exp);
    const normalized = normalize(cleaned);
    try {
      const v = computeArithmetic(normalized);
      return (typeof v === 'number' && Number.isFinite(v)) ? v : 'Error';
    } catch {
      return 'Error';
    }
  }

  function setExpression(newExpr){
    expr = newExpr;
    if (dispInput) dispInput.textContent = expr;
  }

  function appendToken(t){
    if (justEvaluated && isNumChar(t)) {
      setExpression(t);
    } else if (expr === '0' && isNumChar(t)){
      setExpression(t);
    } else {
      setExpression(expr + t);
    }
    justEvaluated = false;
  }

  function handleClearAll(){
    setExpression('0');
    if (dispResult) dispResult.textContent = '0';
    justEvaluated = false;
  }

  function handleBackspace(){
    if (justEvaluated) justEvaluated = false;
    if (expr.length <= 1){ setExpression('0'); return; }
    setExpression(expr.slice(0,-1));
  }

  function handlePlusMinus(){
    const span = getLastNumberRange(expr);
    if (!span) return;
    const before = expr.slice(0, span.start);
    const last   = span.text;
    if (before.endsWith('(-')) {   
      setExpression(before.slice(0,-2) + last + ')');
    } else {
      setExpression(before + '(-' + last + ')');
    }
  }

  function handlePercent(){
    if (expr.endsWith('%')) return;
    setExpression(expr + '%');
  }

  function handleEquals(){
    const normalized = normalize(expr);
    const result = computeResult(normalized);
    if (dispResult) dispResult.textContent = String(result);
    justEvaluated = true;
  }

  function handleSymbol(key){
    switch(key){
      case 'AC':  handleClearAll();   break;
      case '⌫':   handleBackspace();  break;
      case '+/-': handlePlusMinus();  break;
      case '%':   handlePercent();    break;
      case '=':   handleEquals();     break;

      case '/':
      case '×':
      case '+':
      case '-': {
        const last = expr[expr.length - 1];
        if (isOperator(last)) {
          setExpression(expr.slice(0,-1) + key);
        } else {
          appendToken(key);
        }
        break;
      }

      default: {
        if (allowed.has(key)) {
          if (key === '.') {
            const span = getLastNumberRange(expr);
            const lastNum = span ? span.text : '';
            if (lastNum.includes('.')) return; 
          }
          appendToken(key);
        }
      }
    }
  }

  [grid, symbolsRow].filter(Boolean).forEach(area => {
    area.addEventListener('click', (e) => {
      let node = e.target;
      while (node && node !== area) {
        if (node.tagName === 'BUTTON' && node.hasAttribute('data-key')) break;
        node = node.parentNode;
      }
      if (!node || node === area) return;
      const key = node.getAttribute('data-key');
      handleSymbol(key);
    });
  });

  const chips = document.querySelectorAll('.chip');
  for (const chip of chips) {
    chip.addEventListener('click', () => {
      const mode = chip.dataset.mode;
      if (dispInput) dispInput.textContent = `Mode: ${mode}`;
    });
  }

});
