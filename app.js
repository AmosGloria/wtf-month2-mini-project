
document.addEventListener('DOMContentLoaded', () => {
  const dashboard     = document.querySelector('.dashboard');
  const openStudent   = document.getElementById('open-student');
  const openBusiness  = document.getElementById('open-business');
  const studentCalc   = document.getElementById('student-calc');
  const businessCalc  = document.getElementById('business-calc');
  const backBusiness  = document.getElementById('back-from-business');


  if (!openStudent || !openBusiness || !studentCalc || !businessCalc || !backBusiness || !dashboard) {
    console.error('Missing one or more elements. Verify your HTML IDs/class names.');
    return;
  }

  openStudent.onclick = () => { dashboard.hidden = true;  studentCalc.hidden = false; };
  openBusiness.onclick = () => { dashboard.hidden = true; businessCalc.hidden = false; };
  backBusiness.onclick = () => { businessCalc.hidden = true; dashboard.hidden = false; };

  const timeEl = document.getElementById('nav-time');
  const battEl = document.getElementById('nav-battery');

  function updateTime(){
    if (!timeEl) return;
    const d = new Date();
    const hh = String(d.getHours()).padStart(2,'0');
    const mm = String(d.getMinutes()).padStart(2,'0');
    timeEl.textContent = `${hh}:${mm}`;
  }
  updateTime();
  setInterval(updateTime, 30_000);

  if (battEl) {
    let fakeBattery = 76;
    battEl.textContent = `🔋${fakeBattery}%`;
  }

  const dispInput   = document.getElementById('display-input');
  const dispResult  = document.getElementById('display-result');
  const grid        = document.getElementById('grid');
  const symbolsRow  = document.querySelector('.symbols');

  let expr = '0';
  let justEvaluated = false;

  const allowed = new Set(['0','1','2','3','4','5','6','7','8','9','.','+','-','×','/']);

  function normalize(exp){ return exp.replace(/×/g, '*'); }
  function safeEval(exp){
    const cleaned = exp.replace(/[^0-9+\-*/().% ]/g, '');
    const pct = cleaned.replace(/(\d+(\.\d+)?)%/g, '($1/100)');
    try {
      const v = eval(pct);
      return (typeof v === 'number' && Number.isFinite(v)) ? v : 'Error';
    } catch { return 'Error'; }
  }
  function setExpression(newExpr){
    expr = newExpr;
    if (dispInput) dispInput.textContent = expr;
  }
  function appendToken(t){
    if (justEvaluated && /[0-9.]/.test(t)) {
      setExpression(t);
    } else if (expr === '0' && /[0-9.]/.test(t)){
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
    const m = expr.match(/(\d+(\.\d+)?)$/);
    if (!m) return;
    const last = m[0];
    const start = m.index;
    const before = expr.slice(0, start);
    if (before.endsWith('(-')) {
      setExpression(before.slice(0,-2) + last + ')');
    } else {
      setExpression(before + '(-' + last + ')');
    }
  }
  function handlePercent(){
    if (/%$/.test(expr)) return;
    setExpression(expr + '%');
  }
  function handleEquals(){
    const normalized = normalize(expr);
    const result = safeEval(normalized);
    if (dispResult) dispResult.textContent = String(result);
    justEvaluated = true;
  }
  function handleSymbol(key){
    switch(key){
      case 'AC': handleClearAll(); break;
      case '⌫': handleBackspace(); break;
      case '+/-': handlePlusMinus(); break;
      case '%': handlePercent(); break;
      case '=': handleEquals(); break;
      case '/':
      case '×':
      case '+':
      case '-':
        if (/[+\-×/][+\-×/]$/.test(expr)) {
          setExpression(expr.slice(0,-1) + key);
        } else {
          appendToken(key);
        }
        break;
      default:
        if (allowed.has(key)) {
          if (key === '.') {
            const lastNum = expr.split(/[+\-×/]/).pop() || '';
            if (lastNum.includes('.')) return;
          }
          appendToken(key);
        }
    }
  }

  [grid, symbolsRow].filter(Boolean).forEach(area => {
    area.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-key]');
      if(!btn) return;
      const key = btn.getAttribute('data-key');
      handleSymbol(key);
    });
  });

  document.querySelectorAll('.chip').forEach(chip=>{
    chip.addEventListener('click', ()=>{
      const mode = chip.dataset.mode;
      if (dispInput) dispInput.textContent = `Mode: ${mode}`;
    });
  });

  const bizIn   = document.getElementById('biz-input');
  const bizRes  = document.getElementById('biz-result');
  const bizClr  = document.getElementById('biz-clear');
  const bizEval = document.getElementById('biz-eval');

  if (bizClr) {
    bizClr.onclick = ()=> {
      if (bizIn) bizIn.value = '';
      if (bizRes) bizRes.textContent = 'Result: 0';
    };
  }

  if (bizEval) {
    bizEval.onclick = ()=> {
      if (!bizIn || !bizRes) return;
      const exp = bizIn.value.replace(/×/g,'*').replace(/÷/g,'/');
      const cleaned = exp.replace(/[^0-9+\-*/().% ]/g, '')
                         .replace(/(\d+(\.\d+)?)%/g, '($1/100)');
      try{
        const v = eval(cleaned);
        bizRes.textContent = `Result: ${Number.isFinite(v) ? v : 'Error'}`;
      }catch{
        bizRes.textContent = 'Result: Error';
      }
    };
  }
});
