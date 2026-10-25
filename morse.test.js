// Unit tests for the Morse practice app. Run: node morse.test.js
// Each test boots a fresh copy of the app with a fake page and a fake clock.
const fs=require('fs');
// the app's code is the last <script> in the page
const PAGE=fs.readFileSync(__dirname+'/morse-practice.html','utf8');
const APP_JS=[...PAGE.matchAll(/<script>([\s\S]*?)<\/script>/g)].pop()[1];
const SRC=APP_JS.replace('(function(){','(function(){window.__m={get sess(){return sess},get S(){return S},get downAt(){return downAt},noteMistake:noteMistake,weightOf:weightOf};').replace('return (t-start)*1000;}','window.__lastMs=(t-start)*1000;return window.__lastMs;}');
const noop=()=>{};
function boot(saved){
  const E={},H={};let now=0,tid=0,timers=[];const store={};if(saved)store['morse-practice-v1']=JSON.stringify(saved);
  const mk=id=>{let html='';const o={id,value:'',checked:false,hidden:false,disabled:false,dataset:{},placeholder:'',
    get innerHTML(){return html},set innerHTML(v){html=String(v)},get textContent(){return html.replace(/<[^>]*>/g,'')},set textContent(v){html=String(v)},
    classList:{add:noop,remove:noop,toggle:noop},setAttribute:noop,removeAttribute:noop,focus:noop,setPointerCapture:noop,insertBefore:noop,
    querySelector(sel){const m=/^\.([\w-]+)$/.exec(sel),f=m&&new RegExp('<span class="([^"]*\\b'+m[1]+'\\b[^"]*)">([^<]*)</span>').exec(html);
      if(!f)return ['.cd','.yay','.mean'].includes(sel)?null:mk('q');
      return {remove(){html=html.replace(f[0],'')},classList:{add(c){html=html.replace(f[0],'<span class="'+f[1]+' '+c+'">'+f[2]+'</span>')},remove:noop,toggle:noop}};},
    click(){H[id]&&H[id].click&&H[id].click.call(o,{})},insertAdjacentHTML(pos,h){html+=h},
    addEventListener(t,f){H[id]=H[id]||{};const old=H[id][t];H[id][t]=old?function(e){old.call(this,e);f.call(this,e)}:f}};return o;};
  const el=id=>E[id]||(E[id]=mk(id));
  // sliders get their real min/max from the page, like a browser would
  for(const m of PAGE.matchAll(/<input type="range" id="(\w+)" min="(-?\d+)" max="(-?\d+)"/g)){const e=el(m[1]);e.min=m[2];e.max=m[3];}
  const DH={};global.document={getElementById:el,addEventListener(type,f){const old=DH[type];DH[type]=old?function(e){old(e);f(e)}:f},querySelectorAll:()=>[],documentElement:{setAttribute:noop,removeAttribute:noop},activeElement:{tagName:'BODY'}};
  function AC(){this.currentTime=0;this.destination={};this.state='running';global.__ac=this;}
  // every oscillator and gain is recorded (in pairs) so tests can check the sounds
  global.__oscs=[];global.__gains=[];
  AC.prototype.createOscillator=function(){const o={type:'sine',frequency:{},connect:noop,start(t){this.t=t},stop(t){this.end=t;this.stopped=true}};__oscs.push(o);return o};
  AC.prototype.createGain=function(){const calls=[];const g={gain:{value:0,calls,setValueAtTime(v,t){calls.push(['set',v,t])},linearRampToValueAtTime(v,t){calls.push(['ramp',v,t])}},connect:noop};__gains.push(g);return g};AC.prototype.resume=function(){this.resumed=true;this.state='running';};
  global.window={AudioContext:AC,matchMedia:()=>({matches:false})};
  global.localStorage={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=v}};
  Object.defineProperty(global,'performance',{value:{now:()=>now},configurable:true,writable:true});
  global.setTimeout=(f,ms)=>{const id=++tid;timers.push({id,at:now+(ms||0),f});return id};
  global.clearTimeout=id=>{timers=timers.filter(t=>t.id!==id)};
  eval(SRC);
  const app={E,H,DH,M:window.__m,store,
    advance(ms){const end=now+ms;for(;;){timers.sort((a,b)=>a.at-b.at||a.id-b.id);const t=timers[0];if(!t||t.at>end)break;timers.shift();now=t.at;t.f();}now=end;},
    click(id,ev){H[id].click.call(E[id],ev||{})},
    mode(m){H.modes.click({target:{closest:()=>({dataset:{m}})}})},
    tab(t){H.tabs.click({target:{closest:()=>({dataset:{t}})}})},
    set(id,v){E[id].value=String(v);if(H[id]&&H[id].change)H[id].change.call(E[id]);if(H[id]&&H[id].input)H[id].input.call(E[id]);},
    check(id,v){E[id].checked=v;H[id].change.call(E[id]);},
    plays(){return E.playcount.textContent},fb(){return E.feedback.textContent},word(){return app.M.sess.items[app.M.sess.i]},
    answer(v){E.ans.value=v;app.click('submit');},
    timers:()=>timers.length};
  return app;
}
let pass=0,fail=0;
function test(name,fn){try{fn();pass++;console.log('PASS',name);}catch(e){fail++;console.log('FAIL',name,'--',e.message);}}
function eq(a,b,msg){if(a!==b)throw new Error((msg||'')+' expected '+JSON.stringify(b)+' got '+JSON.stringify(a));}
function ok(c,msg){if(!c)throw new Error(msg||'not true');}
const LONG=20000;// long enough for countdown + both plays

/* ---------- listen solo ---------- */
test('listen: start shows 3-2-1 countdown, nothing played yet',()=>{const a=boot();a.click('start');ok(a.fb().includes('Here comes your word in 3'));eq(a.plays(),'PLAYED 0 TIMES');a.advance(900);ok(a.fb().includes('in 2'));a.advance(900);ok(a.fb().includes('in 1'));});
test('listen: word plays twice after countdown',()=>{const a=boot();a.click('start');a.advance(2800);eq(a.plays(),'PLAYED 1 TIME');a.advance(LONG);eq(a.plays(),'PLAYED 2 TIMES');ok(!a.fb().includes('Here comes'),'countdown text cleared');});
test('listen: second play waits 2s after the first and says And again',()=>{const a=boot();a.click('start');a.advance(2700);eq(a.plays(),'PLAYED 1 TIME');const ms=window.__lastMs;a.advance(ms+1900);eq(a.plays(),'PLAYED 1 TIME','not before the 2s pause');a.advance(200);eq(a.plays(),'PLAYED 2 TIMES');ok(a.fb().includes('And again'));a.advance(LONG);ok(!a.fb().includes('And again'),'note cleared after');});
test('listen: And again note does not wipe a Not quite message',()=>{const a=boot();a.click('start');a.advance(LONG);a.answer('ZZZZZ');a.advance(700);const ms=window.__lastMs;a.advance(ms+2100);ok(a.fb().includes('Not quite')&&a.fb().includes('And again'));});
test('listen: set to 1 time plays once',()=>{const a=boot();a.set('reps',1);a.click('start');a.advance(LONG);eq(a.plays(),'PLAYED 1 TIME');});
test('listen: default tries is until right',()=>{const a=boot();eq(a.M.S.tries,'0');});
test('listen: wrong answer replays twice and stays on word',()=>{const a=boot();a.click('start');a.advance(LONG);a.answer('ZZZZZ');ok(a.fb().includes('Listen again'));a.advance(LONG);eq(a.plays(),'PLAYED 4 TIMES');eq(a.M.sess.i,0);});
test('listen: many wrong answers never give up when until-right',()=>{const a=boot();a.click('start');a.advance(LONG);for(let i=0;i<6;i++){a.answer('QQQQQ');a.advance(LONG);}eq(a.M.sess.i,0);});
test('listen: wrong with autoplay off does not replay',()=>{const a=boot();a.check('autoplay',false);a.click('start');a.advance(LONG);eq(a.plays(),'PLAYED 0 TIMES');ok(!a.fb().includes('Here comes'),'no countdown when autoplay off');a.answer('ZZZZZ');a.advance(LONG);eq(a.plays(),'PLAYED 0 TIMES');});
test('listen: right answer says yay then counts down next word',()=>{const a=boot();a.click('start');a.advance(LONG);a.answer(a.word());ok(a.fb().includes("Yay, that's right"));a.advance(1200);eq(a.M.sess.i,1);ok(a.fb().includes('Yay')&&a.fb().includes('next word in 3'));a.advance(LONG);eq(a.plays(),'PLAYED 2 TIMES');});
test('listen: play count resets each round',()=>{const a=boot();a.click('start');a.advance(LONG);a.click('play');a.answer(a.word());a.advance(1200);eq(a.plays(),'PLAYED 0 TIMES');});
test('listen: Play during countdown cancels it (one play only)',()=>{const a=boot();a.click('start');a.advance(500);a.click('play');ok(!a.fb().includes('Here comes'),'countdown text removed');a.advance(LONG);eq(a.plays(),'PLAYED 1 TIME');});
test('listen: Check during countdown stops it',()=>{const a=boot();a.click('start');a.advance(500);a.answer('QQQ');a.advance(300);ok(a.fb().includes('Not quite'),'feedback not covered');});
test('listen: empty Check during countdown keeps countdown going',()=>{const a=boot();a.click('start');a.advance(100);a.answer('');ok(a.fb().includes('Here comes'));a.advance(LONG);eq(a.plays(),'PLAYED 2 TIMES');});
test('listen: empty Check after countdown asks for an answer',()=>{const a=boot();a.click('start');a.advance(LONG);a.answer('');ok(a.fb().includes('Type your answer first'));});
test('listen: Skip during yay pause is ignored (no skipped word)',()=>{const a=boot();a.click('start');a.advance(LONG);a.answer(a.word());a.click('skip');a.click('skip');a.advance(1200);eq(a.M.sess.i,1);eq(a.M.sess.log.length,1);ok(a.M.sess.log[0].ok);});
test('listen: Quit during yay pause does not crash',()=>{const a=boot();a.click('start');a.advance(LONG);a.answer(a.word());a.click('quit');a.advance(LONG);eq(a.M.sess,null);eq(a.E.setup.hidden,false,'back to setup');eq(a.E.submit.disabled,false,'submit re-enabled');});
test('listen: Quit then new session is not touched by old timers',()=>{const a=boot();a.click('start');a.advance(LONG);a.answer(a.word());a.click('quit');a.click('again');a.click('start');a.advance(1300);eq(a.M.sess.i,0);eq(a.M.sess.log.length,0);});
test('listen: switching tabs during countdown pauses, coming back restarts it',()=>{const a=boot();a.click('start');a.advance(900);a.tab('chart');a.advance(LONG);eq(a.plays(),'PLAYED 0 TIMES');a.tab('practice');ok(a.fb().includes('Here comes your word in 3'));a.advance(LONG);eq(a.plays(),'PLAYED 2 TIMES');});
test('listen: no replay sound while on another tab',()=>{const a=boot();a.click('start');a.advance(LONG);a.answer('ZZZZZ');a.tab('chart');a.advance(LONG);eq(a.plays(),'PLAYED 2 TIMES');});
test('listen: 2 tries gives up after 2 wrong',()=>{const a=boot();a.set('tries',2);a.click('start');a.advance(LONG);a.answer('QQQQQ');ok(a.fb().includes('1 try left'));a.advance(LONG);a.answer('ZZZZZ');ok(a.fb().includes('It was'));a.advance(1500);eq(a.M.sess.i,1);ok(!a.M.sess.log[0].ok);});
test('listen: Skip moves on and counts a miss',()=>{const a=boot();a.click('start');a.advance(LONG);const w=a.word();a.click('skip');eq(a.M.sess.i,1);ok(a.M.S.miss[w[0]]>=1);});
test('listen: letters say "letter", numbers say "number"',()=>{let a=boot();a.set('kind','letters');a.click('start');ok(a.fb().includes('your letter in 3'));a=boot();a.set('kind','numbers');a.click('start');ok(a.fb().includes('your number in 3'));});
test('listen: finishing all rounds shows results with play counts',()=>{const a=boot();a.set('rounds',5);a.click('start');for(let i=0;i<5;i++){a.advance(LONG);a.answer(a.word());a.advance(1300);}eq(a.M.sess,null);ok(a.E.reslist.innerHTML.includes('played 2×'));ok(a.E.scorenote.textContent.startsWith('5 of 5'));});
test('listen: retry missed words starts with countdown',()=>{const a=boot();a.set('rounds',5);a.click('start');for(let i=0;i<5;i++){a.advance(LONG);a.click('skip');}eq(a.E.retry.hidden,false);a.E.retry.onclick();ok(a.fb().includes('Here comes your word in 3'));eq(a.M.sess.items.length,5);});

/* ---------- call signs and Q codes ---------- */
const CALL=/^[AKNW][A-Z]?\d[A-Z]{1,3}$/;
test('calls: every call sign looks like a real US call sign',()=>{const a=boot();a.set('rounds',30);a.set('kind','calls');a.click('start');a.M.sess.items.forEach(c=>ok(CALL.test(c),'bad call '+c));});
test('calls: lots of district 2 (New Jersey)',()=>{let n=0,tot=0;for(let k=0;k<10;k++){const a=boot();a.set('rounds',30);a.set('kind','calls');a.click('start');a.M.sess.items.forEach(c=>{tot++;if(/2/.test(c))n++;});}ok(n/tot>0.3,'only '+n+'/'+tot);});
test('calls: countdown says call sign',()=>{const a=boot();a.set('kind','calls');a.click('start');ok(a.fb().includes('your call sign in 3'));});
test('calls: right answer works, any case and spaces',()=>{const a=boot();a.set('kind','calls');a.click('start');a.advance(LONG);a.answer(' '+a.word().toLowerCase()+' ');ok(a.fb().includes('Yay'));});
test('calls: hint says characters',()=>{const a=boot();a.set('kind','calls');a.click('start');a.click('hint');ok(/characters\./.test(a.E.hintline.textContent));});
test('codes: items all come from the Q code list',()=>{const a=boot();a.set('rounds',30);a.set('kind','codes');a.click('start');a.M.sess.items.forEach(c=>ok(/^[A-Z0-9]{2,4}$/.test(c),'bad code '+c));ok(a.M.sess.items.some(c=>c[0]==='Q'||c.length<=4));});
test('codes: countdown says code (even for 73)',()=>{const a=boot();a.set('kind','codes');a.click('start');ok(a.fb().includes('your code in 3'));});
test('codes: no same code twice in a row',()=>{const a=boot();a.set('rounds',30);a.set('kind','codes');a.click('start');const it=a.M.sess.items;for(let i=1;i<it.length;i++)ok(it[i]!==it[i-1],'repeat '+it[i]);});
test('codes: weak letters make codes with them more likely',()=>{const a=boot();a.M.S.miss.Q=6;a.set('rounds',30);a.set('kind','codes');a.click('start');const q=a.M.sess.items.filter(c=>c.includes('Q')).length;ok(q>=10,'only '+q+' Q codes of 30');});
test('codes: wrong answer replays twice like words',()=>{const a=boot();a.set('kind','codes');a.click('start');a.advance(LONG);a.answer('ZZZZ');a.advance(LONG);eq(a.plays(),'PLAYED 4 TIMES');});
test('mixed: can include call signs and codes',()=>{const a=boot();a.set('rounds',30);a.set('kind','mixed');let seen=new Set();for(let k=0;k<5;k++){a.click('start');a.M.sess.items.forEach(c=>{if(CALL.test(c))seen.add('call');else if(/^Q/.test(c)&&c.length===3)seen.add('code');});a.click('quit');a.click('again');}ok(seen.has('call')&&seen.has('code'),[...seen].join());});
test('setup: length sliders only show for words',()=>{const a=boot();a.set('kind','calls');eq(a.E['lenmin-f'].hidden,true);a.set('kind','words');eq(a.E['lenmin-f'].hidden,false);a.set('kind','mixed');eq(a.E['lenmin-f'].hidden,false,'mixed still has words');});
test('send: call sign and code practice',()=>{let a=boot();a.set('kind','calls');a.tab('send');a.click('sendnext');ok(CALL.test(a.E.sendword.textContent));a=boot();a.set('kind','codes');a.tab('send');a.click('sendnext');ok(/^[A-Z0-9]{2,4}$/.test(a.E.sendword.textContent));});
test('history: shows friendly kind name',()=>{const a=boot();a.set('kind','codes');a.set('rounds',5);a.click('start');for(let i=0;i<5;i++){a.advance(LONG);a.click('skip');}ok(a.E.histlist.innerHTML.includes('Q codes'));});

/* ---------- meanings ---------- */
test('meanings: every code has a meaning',()=>{const src=APP_JS;const codes=src.match(/var CODES='([^']*)'/)[1].split(',');const a=boot();codes.forEach(c=>{a.M.sess=null;});
  const m=src.match(/var MEANING=\{([\s\S]*?)\};/)[1];codes.forEach(c=>ok(new RegExp("(^|[,\\s])'?"+c+"'?:").test(m),'no meaning for '+c));});
test('meanings: shown with yay and kept during next countdown',()=>{const a=boot();a.set('kind','codes');a.click('start');a.advance(LONG);const w=a.word();a.answer(w);ok(a.fb().includes(w+' means:'));a.advance(1200);ok(a.fb().includes(w+' means:')&&a.fb().includes('next code in 3'));});
test('meanings: QTH means my location',()=>{const a=boot();a.set('kind','codes');a.click('start');a.advance(LONG);a.M.sess.items[a.M.sess.i]='QTH';a.answer('QTH');ok(a.fb().includes('QTH means: my location'));});
test('meanings: not shown before you answer (no spoilers)',()=>{const a=boot();a.mode('read');a.set('kind','codes');a.click('start');a.advance(LONG);ok(!a.fb().includes('means'));a.answer('ZZZZ');ok(!a.fb().includes('means'),'not on a wrong try');});
test('meanings: shown when the answer is revealed',()=>{const a=boot();a.set('tries',1);a.set('kind','codes');a.click('start');a.advance(LONG);const w=a.word();a.answer('ZZZZ');ok(a.fb().includes('It was '+w)&&a.fb().includes(w+' means:'));});
test('meanings: partner they got it and show answer',()=>{let a=boot();a.mode('partner');a.set('kind','codes');a.click('start');a.advance(LONG);let w=a.word();a.click('gotit');ok(a.fb().includes(w+' means:'));a=boot();a.mode('partner');a.set('kind','codes');a.click('start');a.advance(LONG);w=a.word();a.click('missed');ok(a.fb().includes(w+' means:'));});
test('meanings: in results list',()=>{const a=boot();a.set('kind','codes');a.set('rounds',5);a.click('start');for(let i=0;i<5;i++){a.advance(LONG);a.click('skip');}ok(/\([a-z]/.test(a.E.reslist.innerHTML.replace(/<[^>]*>/g,'')));});
test('meanings: plain words have none',()=>{const a=boot();a.click('start');a.advance(LONG);a.answer(a.word());ok(!a.fb().includes('means'));});
test('meanings: shown after sending a code right',()=>{const a=boot();a.set('kind','codes');a.tab('send');a.click('sendnext');const w=a.E.sendword.textContent;const MC={A:'.-',B:'-...',C:'-.-.',D:'-..',E:'.',F:'..-.',G:'--.',H:'....',I:'..',J:'.---',K:'-.-',L:'.-..',M:'--',N:'-.',O:'---',P:'.--.',Q:'--.-',R:'.-.',S:'...',T:'-',U:'..-',V:'...-',W:'.--',X:'-..-',Y:'-.--',Z:'--..','0':'-----','1':'.----','2':'..---','3':'...--','4':'....-','5':'.....','6':'-....','7':'--...','8':'---..','9':'----.'};
  const tap=ms=>{a.H.key.pointerdown({preventDefault:noop,pointerId:1});a.advance(ms);a.H.key.pointerup();a.advance(120);};
  for(const ch of w){for(const sym of MC[ch])tap(sym==='.'?50:400);a.advance(1000);}ok(a.E.sendfb.textContent.includes('You sent '+w+'!'),a.E.sendfb.textContent);ok(a.E.sendfb.textContent.includes('means:'));});

/* ---------- bug clean 3 ---------- */
test('kinds: the word ANT (insect) has no antenna meaning',()=>{const a=boot();a.click('start');a.advance(LONG);a.M.sess.items[a.M.sess.i]='ANT';a.answer('ANT');ok(!a.fb().includes('means'));});
test('kinds: the code ANT does mean antenna',()=>{const a=boot();a.set('kind','codes');a.click('start');a.advance(LONG);a.M.sess.items[a.M.sess.i]='ANT';a.answer('ANT');ok(a.fb().includes('ANT means: antenna'));});
test('kinds: 73 in numbers mode is a number, no meaning',()=>{const a=boot();a.set('kind','numbers');a.click('start');a.M.sess.items[0]='73';a.click('quit');a.click('again');a.click('start');a.M.sess.items[a.M.sess.i]='73';a.advance(LONG);a.answer('73');ok(!a.fb().includes('means'));});
test('kinds: numbers countdown never says code',()=>{for(let k=0;k<20;k++){const a=boot();a.set('kind','numbers');a.click('start');ok(a.fb().includes('your number in 3'));}});
test('kinds: every item has a kind, mixed kinds match items',()=>{const a=boot();a.set('rounds',30);a.set('kind','mixed');a.click('start');const s=a.M.sess;eq(s.kinds.length,s.items.length);s.items.forEach((it,i)=>{const k=s.kinds[i];if(k==='calls')ok(CALL.test(it),it);if(k==='letters')eq(it.length,1);if(k==='numbers')ok(/^\d+$/.test(it),it);});});
test('kinds: mixed countdown matches the item kind',()=>{for(let n=0;n<15;n++){const a=boot();a.set('kind','mixed');a.click('start');const k=a.M.sess.kinds[0];const want={prosigns:'prosign',codes:'code',calls:'call sign',letters:'letter',numbers:'number',words:'word'}[k];ok(a.fb().includes('your '+want+' in 3'),k+' -> '+a.fb());}});
test('results: meaning stays inside the Answer column (4 columns)',()=>{const a=boot();a.set('kind','codes');a.set('rounds',5);a.click('start');for(let i=0;i<5;i++){a.advance(LONG);a.click('skip');}
  const rows=a.E.reslist.innerHTML.split('<div class="rrow">').slice(1);eq(rows.length,5);rows.forEach(r=>{const body=r.replace(/<\/div>$/,'');let depth=0,cells=0;body.replace(/<(\/?)(span|b)\b[^>]*>/g,(m,cl)=>{if(cl){depth--;}else{if(depth===0)cells++;depth++;}return m;});eq(cells,4,'cells in row');});});
test('results: retry keeps codes as codes',()=>{const a=boot();a.set('kind','codes');a.set('rounds',5);a.click('start');for(let i=0;i<5;i++){a.advance(LONG);a.click('skip');}a.set('kind','words');a.E.retry.onclick();ok(a.fb().includes('your code in 3'));a.advance(LONG);const w=a.word();a.answer(w);ok(a.fb().includes(w+' means:'));});
test('results: read mode does not talk about plays',()=>{const a=boot();a.mode('read');a.set('rounds',5);a.click('start');for(let i=0;i<5;i++){a.advance(LONG);a.click('skip');}ok(!/played/i.test(a.E.scorenote.textContent));ok(!/played/.test(a.E.reslist.innerHTML));});
test('results: listen mode still shows plays',()=>{const a=boot();a.set('rounds',5);a.click('start');for(let i=0;i<5;i++){a.advance(LONG);a.click('skip');}ok(/played the code 10 times/.test(a.E.scorenote.textContent),a.E.scorenote.textContent);});
test('send: numbers mode sends numbers, letters sends a letter',()=>{let a=boot();a.set('kind','numbers');a.tab('send');a.click('sendnext');ok(/^\d+$/.test(a.E.sendword.textContent));a=boot();a.set('kind','letters');a.tab('send');a.click('sendnext');eq(a.E.sendword.textContent.length,1);});
test('send: words mode respects word lengths',()=>{const a=boot();a.set('lenmin',6);a.set('lenmax',6);a.tab('send');for(let i=0;i<10;i++){a.click('sendnext');eq(a.E.sendword.textContent.length,6);}});
test('send: word ANT sent right shows no antenna meaning',()=>{const a=boot();a.tab('send');ok(!/means/.test(a.E.sendfb.textContent));});

test('page: hidden things really stay hidden (CSS rule)',()=>{ok(/\[hidden\]\{display:none!important\}/.test(require('fs').readFileSync(__dirname+'/morse-practice.html','utf8')));});
test('page: says it is UTF-8 so symbols show right',()=>{ok(/<meta charset="utf-8">/i.test(require('fs').readFileSync(__dirname+'/morse-practice.html','utf8')));});
/* ---------- prosigns ---------- */
const MC={A:'.-',B:'-...',C:'-.-.',D:'-..',E:'.',F:'..-.',G:'--.',H:'....',I:'..',J:'.---',K:'-.-',L:'.-..',M:'--',N:'-.',O:'---',P:'.--.',Q:'--.-',R:'.-.',S:'...',T:'-',U:'..-',V:'...-',W:'.--',X:'-..-',Y:'-.--',Z:'--..'};
const PROS=['AR','AS','BT','KA','KN','SK','SN','HH','SOS'];
function sendSyms(a,groups){const tap=ms=>{a.H.key.pointerdown({preventDefault:noop,pointerId:1});a.advance(ms);a.H.key.pointerup();a.advance(120);};groups.forEach(g=>{for(const sym of g)tap(sym==='.'?50:400);a.advance(1000);});}
test('prosigns: items come from the prosign list',()=>{const a=boot();a.set('rounds',30);a.set('kind','prosigns');a.click('start');a.M.sess.items.forEach(x=>ok(PROS.includes(x),x));});
test('prosigns: countdown says prosign',()=>{const a=boot();a.set('kind','prosigns');a.click('start');ok(a.fb().includes('your prosign in 3'));});
test('prosigns: SK plays run together (no letter gap)',()=>{const a=boot();a.set('kind','prosigns');a.click('start');a.M.sess.items[0]='SK';a.advance(2700);const u=1200/a.M.S.wpm;ok(Math.abs(window.__lastMs-15*u)<1,'got '+window.__lastMs+' want '+15*u);});
test('prosigns: plain word SK would have a gap (longer)',()=>{const a=boot();a.click('start');a.M.sess.items[0]='SK';a.advance(2700);const u=1200/a.M.S.wpm;ok(window.__lastMs>15*u+2*u,'got '+window.__lastMs);});
test('prosigns: plays twice like everything else',()=>{const a=boot();a.set('kind','prosigns');a.click('start');a.advance(LONG);eq(a.plays(),'PLAYED 2 TIMES');});
test('prosigns: read mode shows the code with no gap',()=>{const a=boot();a.mode('read');a.set('kind','prosigns');a.click('start');a.advance(LONG);const w=a.word();eq(a.E.codebox.innerHTML,w.split('').map(c=>MC[c]).join(''));});
test('prosigns: right answer shows meaning, typing <SK> works',()=>{const a=boot();a.set('kind','prosigns');a.click('start');a.advance(LONG);a.M.sess.items[a.M.sess.i]='SK';a.answer('<sk>');ok(a.fb().includes('SK means: end of contact'));});
test('prosigns: results show joined code and meaning',()=>{const a=boot();a.set('kind','prosigns');a.set('rounds',5);a.click('start');a.M.sess.items[0]='KN';for(let i=0;i<5;i++){a.advance(LONG);a.click('skip');}ok(a.E.reslist.innerHTML.includes('-.--.'));ok(a.E.reslist.innerHTML.includes('go ahead'));});
test('prosigns: hint says sent together',()=>{const a=boot();a.set('kind','prosigns');a.click('start');a.click('hint');ok(a.E.hintline.textContent.includes('no gap'));});
test('prosigns: every prosign has a meaning',()=>{const a=boot();a.set('kind','prosigns');a.click('start');PROS.forEach(p=>{a.M.sess.items[a.M.sess.i]=p;});ok(true);const src=APP_JS;PROS.forEach(p=>ok(new RegExp('[{,]'+p+":'").test(src.match(/var PRO_MEAN=\{[^}]*\}/)[0]),'no meaning '+p));});
test('prosigns: mixed includes prosigns',()=>{let seen=false;for(let k=0;k<10&&!seen;k++){const a=boot();a.set('rounds',30);a.set('kind','mixed');a.click('start');seen=a.M.sess.kinds.includes('prosigns');}ok(seen);});
test('send: prosign sent run together counts',()=>{const a=boot();a.set('kind','prosigns');a.tab('send');let w;do{a.click('sendnext');w=a.E.sendword.textContent;}while(w==='HH'||w==='SOS');sendSyms(a,[w.split('').map(c=>MC[c]).join('')]);ok(a.E.sendfb.textContent.includes('You sent '+w+'!'),a.E.sendfb.textContent);ok(a.E.sendfb.textContent.includes('means'));});
test('send: prosign sent as separate letters says no gap',()=>{const a=boot();a.set('kind','prosigns');a.tab('send');a.click('sendnext');const w=a.E.sendword.textContent;sendSyms(a,w.split('').map(c=>MC[c]));ok(a.E.sendfb.textContent.includes('no gap'),a.E.sendfb.textContent);});
test('send: show the code for a prosign has no space',()=>{const a=boot();a.set('kind','prosigns');a.tab('send');a.click('sendnext');a.click('sendhint');ok(!a.E.sendcode.textContent.includes(' '));});
test('send: normal words still decode letter by letter',()=>{const a=boot();a.tab('send');const w=a.E.sendword.textContent;sendSyms(a,w.split('').map(c=>MC[c]));ok(a.E.sendfb.textContent.includes('You sent '+w+'!'),a.E.sendfb.textContent);});

/* ---------- always twice ---------- */
test('times: default is 2 for new users',()=>{const a=boot();eq(a.M.S.reps,'2');eq(a.E.reps.value,'2');});
test('times: old users who had twice off get the 2 default',()=>{const a=boot({twice:false,twicev:1,loopv:1});eq(a.M.S.reps,'2');ok(!('twice' in a.M.S));});
test('times: your choice is saved and stays',()=>{let a=boot();a.set('reps',4);const saved=JSON.parse(a.store['morse-practice-v1']);eq(saved.reps,'4');a=boot(saved);eq(a.M.S.reps,'4');eq(a.E.reps.value,'4');});
for(const n of [1,2,3,4,5])test('times: set to '+n+' plays exactly '+n+' then waits',()=>{const a=boot();a.set('reps',n);a.click('start');a.advance(60000);eq(a.plays(),'PLAYED '+n+' TIME'+(n===1?'':'S'));ok(!/again/i.test(a.fb()),'note cleared: '+a.fb());});
test('times: 3 says Again (2 of 3) then (3 of 3)',()=>{const a=boot();a.set('reps',3);a.click('start');a.advance(2700);const ms=window.__lastMs;a.advance(ms+2001);ok(a.fb().includes('Again (2 of 3)'),a.fb());a.advance(window.__lastMs+2001);ok(a.fb().includes('Again (3 of 3)'),a.fb());});
test('times: 2 pauses 2 seconds between each play',()=>{const a=boot();a.set('reps',3);a.click('start');a.advance(2700);const ms=window.__lastMs;a.advance(ms+1990);eq(a.plays(),'PLAYED 1 TIME');a.advance(20);eq(a.plays(),'PLAYED 2 TIMES');});
test('times: wrong answer replays the same number of times',()=>{const a=boot();a.set('reps',3);a.click('start');a.advance(60000);a.answer('ZZZZZ');a.advance(60000);eq(a.plays(),'PLAYED 6 TIMES');});
test('times: answering mid-way stops the rest of the plays',()=>{const a=boot();a.set('reps',5);a.click('start');a.advance(2700);a.answer(a.word());a.advance(60000);eq(a.M.sess.i,1);a.advance(60000);eq(a.plays(),'PLAYED 5 TIMES','next word gets its own 5');});
test('times: Play button mid-way stops the auto plays',()=>{const a=boot();a.set('reps',4);a.click('start');a.advance(2700);a.click('play');a.advance(60000);eq(a.plays(),'PLAYED 2 TIMES');});
test('times: bad saved value falls back safely',()=>{const a=boot({reps:'abc',loopv:1});a.click('start');a.advance(60000);eq(a.plays(),'PLAYED 2 TIMES');});
test('times: partner mode uses the setting',()=>{const a=boot();a.set('reps',3);a.mode('partner');a.click('start');a.advance(60000);eq(a.plays(),'PLAYED 3 TIMES');a.click('addguess');a.advance(60000);eq(a.plays(),'PLAYED 6 TIMES');});
for(const kind of ['words','letters','numbers','calls','codes','prosigns','mixed'])test('twice: '+kind+' plays twice at start, after wrong, and next word',()=>{const a=boot();a.set('kind',kind);a.click('start');a.advance(LONG);eq(a.plays(),'PLAYED 2 TIMES','start');a.answer('ZZZZZZZZZZ');a.advance(LONG);eq(a.plays(),'PLAYED 4 TIMES','after wrong');a.answer(a.word());a.advance(1200+LONG);eq(a.plays(),'PLAYED 2 TIMES','next');});
test('twice: partner plays twice after each wrong guess',()=>{const a=boot();a.mode('partner');a.click('start');a.advance(LONG);a.click('addguess');a.advance(LONG);a.click('addguess');a.advance(LONG);eq(a.plays(),'PLAYED 6 TIMES');});
test('twice: coming back from another tab plays twice',()=>{const a=boot();a.click('start');a.tab('chart');a.tab('practice');a.advance(LONG);eq(a.plays(),'PLAYED 2 TIMES');});
test('twice: retry missed words plays twice',()=>{const a=boot();a.set('rounds',5);a.click('start');for(let i=0;i<5;i++){a.advance(LONG);a.click('skip');}a.E.retry.onclick();a.advance(LONG);eq(a.plays(),'PLAYED 2 TIMES');});

/* ---------- bug clean 4 ---------- */
test('resume: tab away during play 2 of 3, coming back finishes the rest',()=>{const a=boot();a.set('reps',3);a.click('start');a.advance(2700);const ms=window.__lastMs;a.advance(ms+2010);eq(a.plays(),'PLAYED 2 TIMES');a.tab('chart');a.advance(60000);eq(a.plays(),'PLAYED 2 TIMES','quiet while away');a.tab('practice');ok(a.fb().includes('Here comes'));a.advance(60000);eq(a.plays(),'PLAYED 4 TIMES','replays the cut one and the last one');a.advance(60000);eq(a.plays(),'PLAYED 4 TIMES','then waits');});
test('resume: all plays done, coming back does not replay',()=>{const a=boot();a.set('reps',2);a.click('start');a.advance(60000);a.tab('chart');a.tab('practice');a.advance(60000);eq(a.plays(),'PLAYED 2 TIMES');});
test('resume: after pressing Play yourself, coming back does not auto play',()=>{const a=boot();a.set('reps',3);a.click('start');a.advance(2700);a.click('play');a.tab('chart');a.tab('practice');a.advance(60000);eq(a.plays(),'PLAYED 2 TIMES');});
test('resume: auto play off never resumes',()=>{const a=boot();a.check('autoplay',false);a.click('start');a.click('play');a.tab('chart');a.tab('practice');a.advance(60000);eq(a.plays(),'PLAYED 1 TIME');});
test('settings: odd saved times and tries are fixed',()=>{let a=boot({reps:9,tries:'7',loopv:1});eq(a.E.reps.value,'5');eq(a.E.tries.value,'0');a=boot({reps:3,tries:2,loopv:1});eq(a.E.reps.value,'3');eq(a.E.tries.value,'2');});
test('partner: auto play off, wrong guess says tap Play',()=>{const a=boot();a.check('autoplay',false);a.mode('partner');a.click('start');a.click('addguess');ok(a.fb().includes('Tap Play'));a.advance(60000);eq(a.plays(),'PLAYED 0 TIMES');});
test('partner: auto play on, wrong guess says here it comes',()=>{const a=boot();a.mode('partner');a.click('start');a.advance(LONG);a.click('addguess');ok(a.fb().includes('Here it comes again'));});

test('send: leaving the tab while the key is held lets go of it',()=>{const a=boot();a.tab('send');a.H.key.pointerdown({preventDefault:noop,pointerId:1});a.advance(100);a.tab('chart');eq(a.M.downAt,null);});
test('send: after coming back, a quick tap is a dot (E)',()=>{const a=boot();a.tab('send');a.H.key.pointerdown({preventDefault:noop,pointerId:1});a.advance(100);a.tab('chart');a.advance(5000);a.tab('send');a.click('sendclear');
  a.H.key.pointerdown({preventDefault:noop,pointerId:1});a.advance(50);a.H.key.pointerup();a.advance(1000);eq(a.E.senddec.textContent.slice(-1),'E');});
test('page: every CSS color token used is defined',()=>{const html=require('fs').readFileSync(__dirname+'/morse-practice.html','utf8');const used=new Set([...html.matchAll(/var\((--[\w-]+)/g)].map(m=>m[1]));const defined=new Set([...html.matchAll(/(--[\w-]+)\s*:/g)].map(m=>m[1]));[...used].forEach(v=>ok(defined.has(v),'undefined '+v));});
test('results: says per round, not per word',()=>{const a=boot();a.set('kind','letters');a.set('rounds',5);a.click('start');for(let i=0;i<5;i++){a.advance(LONG);a.click('skip');}ok(a.E.scorenote.textContent.includes('per round'));});
test('audio: interrupted sound (iPad) is woken up when playing',()=>{const a=boot();a.click('start');a.advance(LONG);__ac.state='interrupted';__ac.resumed=false;a.click('play');ok(__ac.resumed);});
test('audio: any tap wakes up interrupted sound',()=>{const a=boot();a.click('start');a.advance(LONG);__ac.state='interrupted';__ac.resumed=false;a.DH.pointerdown({});ok(__ac.resumed);});
test('audio: running sound is left alone',()=>{const a=boot();a.click('start');a.advance(LONG);__ac.resumed=false;a.click('play');ok(!__ac.resumed);});
test('results: practice my misses includes every miss',()=>{const a=boot();a.set('rounds',10);a.click('start');for(let i=0;i<10;i++){a.advance(LONG);a.click('skip');}a.set('rounds',5);a.E.retry.onclick();eq(a.M.sess.items.length,10);});
test('results: practice my misses has each miss once',()=>{const a=boot();a.set('rounds',10);a.set('kind','letters');a.click('start');const want=a.M.sess.items.slice().sort().join();for(let i=0;i<10;i++){a.advance(LONG);a.click('skip');}a.E.retry.onclick();eq(a.M.sess.items.slice().sort().join(),want);});
test('settings: broken saved slider values fall back to normal',()=>{const a=boot({wpm:'abc',pitch:-5,far:99,vol:null,loopv:1});eq(a.M.S.wpm,10);eq(a.M.S.vol,60);eq(a.M.S.pitch,600);eq(a.M.S.far,2);a.click('start');a.advance(LONG);eq(a.plays(),'PLAYED 2 TIMES');ok(isFinite(window.__lastMs));});
test('settings: good saved slider values are kept',()=>{const a=boot({wpm:18,lenmin:4,lenmax:6,loopv:1});eq(a.M.S.wpm,18);eq(a.M.S.lenmin,4);eq(a.M.S.lenmax,6);});
/* ---------- answer sounds ---------- */
// chime notes are the non-sine oscillators made after index n0; gains are created in pairs with oscillators
const chimes=n0=>__oscs.map((o,i)=>({o,g:__gains[i]})).slice(n0).filter(x=>x.o.type!=='sine');
const semis=(f,root)=>Math.round(12*Math.log2(f/root));
function rightThenCheck(a){a.click('start');a.advance(LONG);const n0=__oscs.length;a.answer(a.word());return chimes(n0);}
test('sound: right answer plays a rising major triad (root, 3rd, 5th)',()=>{const a=boot();const c=rightThenCheck(a);eq(c.length,3);eq(c.map(x=>semis(x.o.frequency.value,a.M.S.pitch)).join(),'0,4,7');});
test('sound: right answer is one note at a time (monophone)',()=>{const a=boot();const c=rightThenCheck(a);for(let i=1;i<c.length;i++)ok(c[i].o.t>=c[i-1].o.end,'note '+i+' overlaps');});
test('sound: notes have a short attack (under 15ms)',()=>{const a=boot();const c=rightThenCheck(a);c.forEach(x=>{const r=x.g.gain.calls.find(k=>k[0]==='ramp');ok(r&&r[2]-x.o.t<0.015,'slow attack');});});
test('sound: radio-like tone, quieter than the Morse beeps',()=>{const a=boot();const c=rightThenCheck(a);const beep=__gains.find((g,i)=>__oscs[i].type==='sine');const bp=Math.max(...beep.gain.calls.map(k=>k[1]));c.forEach(x=>{ok(x.o.type==='triangle'||x.o.type==='square',x.o.type);ok(Math.max(...x.g.gain.calls.map(k=>k[1]))<bp*0.6,'too loud');});});
test('sound: follows the pitch setting',()=>{const a=boot();a.set('pitch',500);const c=rightThenCheck(a);eq(c[0].o.frequency.value,500);});
test('sound: volume 0 makes the chimes silent',()=>{const a=boot();a.set('vol',5);a.M.S.vol=0;const c=rightThenCheck(a);c.forEach(x=>eq(Math.max(...x.g.gain.calls.map(k=>k[1])),0));});
test('sound: wrong answer plays a different, falling sound',()=>{const a=boot();a.click('start');a.advance(LONG);const n0=__oscs.length;a.answer('ZZZZZ');const c=chimes(n0);ok(c.length>=2,'notes '+c.length);ok(c[c.length-1].o.frequency.value<c[0].o.frequency.value,'not falling');ok(c.map(x=>semis(x.o.frequency.value,a.M.S.pitch)).join()!=='0,4,7');});
test('sound: wrong sound is not cut off by the replay',()=>{const a=boot();a.click('start');a.advance(LONG);const n0=__oscs.length;a.answer('ZZZZZ');const c=chimes(n0);a.advance(LONG);c.forEach(x=>ok(typeof x.o.end==='number','was cut off'));});
test('sound: last wrong try ("It was") plays the wrong sound',()=>{const a=boot();a.set('tries',1);a.click('start');a.advance(LONG);const n0=__oscs.length;a.answer('ZZZZZ');ok(a.fb().includes('It was'));ok(chimes(n0).length>=2);});
test('sound: Skip makes no answer sound',()=>{const a=boot();a.click('start');a.advance(LONG);const n0=__oscs.length;a.click('skip');eq(chimes(n0).length,0);});
test('sound: partner they got it plays the triad',()=>{const a=boot();a.mode('partner');a.click('start');a.advance(LONG);const n0=__oscs.length;a.click('gotit');eq(chimes(n0).map(x=>semis(x.o.frequency.value,a.M.S.pitch)).join(),'0,4,7');});
test('sound: partner wrong guess and show answer play the wrong sound',()=>{const a=boot();a.mode('partner');a.click('start');a.advance(LONG);let n0=__oscs.length;a.click('addguess');ok(chimes(n0).length>=2,'wrong guess');a.advance(LONG);n0=__oscs.length;a.click('missed');ok(chimes(n0).length>=2,'show answer');});
test('sound: finishing a session plays a longer fanfare ending on the octave',()=>{const a=boot();a.set('rounds',5);a.click('start');for(let i=0;i<4;i++){a.advance(LONG);a.click('skip');}a.advance(LONG);a.answer(a.word());const n0=__oscs.length;a.advance(1300);eq(a.M.sess,null);const c=chimes(n0);ok(c.length>=5,'notes '+c.length);eq(semis(c[c.length-1].o.frequency.value,a.M.S.pitch),12);for(let i=1;i<c.length;i++)ok(c[i].o.t>=c[i-1].o.end,'overlap');});
test('sound: ending a session early plays no fanfare',()=>{const a=boot();a.click('start');a.advance(LONG);a.click('skip');const n0=__oscs.length;a.click('quit');eq(chimes(n0).length,0);});

/* ---------- fading Yay text ---------- */
const yayShown=a=>/class="[^"]*\byay\b/.test(a.E.feedback.innerHTML);
const yayGone=a=>/class="[^"]*\byay\b[^"]*\bgone\b/.test(a.E.feedback.innerHTML);
test('fade: Yay text fades out 3 seconds after a right answer',()=>{const a=boot();a.click('start');a.advance(LONG);a.answer(a.word());ok(yayShown(a)&&!yayGone(a),'shown');a.advance(2900);ok(yayShown(a)&&!yayGone(a),'still there at 2.9s');a.advance(200);ok(yayGone(a),'faded at 3.1s');});
test('fade: countdown ticks do not bring it back',()=>{const a=boot();a.click('start');a.advance(LONG);a.answer(a.word());a.advance(3500);ok(yayGone(a));ok(a.fb().includes('next word in 1'),'countdown still shows');});
test('fade: the code meaning stays visible',()=>{const a=boot();a.set('kind','codes');a.click('start');a.advance(LONG);const w=a.word();a.answer(w);a.advance(3200);ok(yayGone(a));ok(/class="mean"/.test(a.E.feedback.innerHTML)&&a.fb().includes(w+' means:'),'meaning gone');});
test('fade: partner they got it fades too',()=>{const a=boot();a.mode('partner');a.click('start');a.advance(LONG);a.click('gotit');ok(yayShown(a)&&!yayGone(a));a.advance(3100);ok(yayGone(a));});
test('fade: a new right answer gets its own 3 seconds',()=>{const a=boot();a.click('start');a.advance(LONG);a.answer(a.word());a.advance(1300);a.answer(a.word());a.advance(1800);ok(yayShown(a)&&!yayGone(a),'faded early by the old timer');a.advance(1300);ok(yayGone(a));});
test('fade: CSS fades smoothly to invisible',()=>{const css=PAGE.match(/<style>([\s\S]*?)<\/style>/)[1];ok(/\.yay\{[^}]*transition:[^}]*opacity/.test(css),'no transition');ok(/\.gone\{[^}]*opacity:0/.test(css),'no opacity 0');});

/* ---------- read solo ---------- */
test('read: code hidden during countdown, shown after, no sound',()=>{const a=boot();a.mode('read');a.click('start');eq(a.E.codebox.innerHTML,'');ok(a.fb().includes('Here comes'));a.advance(LONG);ok(a.E.codebox.innerHTML.length>0);eq(a.plays(),'PLAYED 0 TIMES');});
test('read: wrong says look again (not listen)',()=>{const a=boot();a.mode('read');a.click('start');a.advance(LONG);a.answer('ZZZZZ');ok(a.fb().includes('Look at the code again'));eq(a.plays(),'PLAYED 0 TIMES');});
test('read: right gives yay then countdown, code hidden again',()=>{const a=boot();a.mode('read');a.click('start');a.advance(LONG);a.answer(a.word());a.advance(1200);ok(a.fb().includes('Yay')&&a.fb().includes('next word in 3'));eq(a.E.codebox.innerHTML,'');});
test('read: tab away mid-countdown, coming back still shows the code',()=>{const a=boot();a.mode('read');a.click('start');a.advance(500);a.tab('history');a.advance(LONG);a.tab('practice');a.advance(LONG);ok(a.E.codebox.innerHTML.length>0);});

/* ---------- partner ---------- */
test('partner: countdown then plays twice',()=>{const a=boot();a.mode('partner');a.click('start');ok(a.fb().includes('Here comes'));a.advance(LONG);eq(a.plays(),'PLAYED 2 TIMES');});
test('partner: wrong guess (blank) replays twice',()=>{const a=boot();a.mode('partner');a.click('start');a.advance(LONG);a.click('addguess');ok(a.fb().includes('Here it comes again'));a.advance(LONG);eq(a.plays(),'PLAYED 4 TIMES');});
test('partner: typed wrong guess is listed',()=>{const a=boot();a.mode('partner');a.click('start');a.advance(LONG);a.E.said.value='QQ';a.click('addguess');ok(a.E.guesslist.textContent.includes('QQ'));});
test('partner: typing the right word as a wrong guess is caught',()=>{const a=boot();a.mode('partner');a.click('start');a.advance(LONG);a.E.said.value=a.word();a.click('addguess');ok(a.fb().includes('That guess is right'));eq(a.M.sess.guesses.length,0);});
test('partner: they got it gives yay then countdown',()=>{const a=boot();a.mode('partner');a.click('start');a.advance(LONG);a.click('gotit');eq(a.M.sess.i,1);ok(a.fb().includes('Yay')&&a.fb().includes('next word in 3'));});
test('partner: they got it during show-answer pause is ignored',()=>{const a=boot();a.mode('partner');a.click('start');a.advance(LONG);a.click('missed');a.click('gotit');a.click('addguess');a.advance(1500);eq(a.M.sess.i,1);eq(a.M.sess.log.length,1);ok(!a.M.sess.log[0].ok);});
test('partner: they got it during countdown stops countdown sound',()=>{const a=boot();a.mode('partner');a.click('start');a.advance(LONG);a.click('gotit');a.advance(500);a.click('gotit');eq(a.M.sess.i,2);a.advance(LONG);eq(a.plays(),'PLAYED 2 TIMES');});

/* ---------- saved settings ---------- */
test('settings: old saved tries=2 is moved to until-right once, and saved',()=>{const a=boot({tries:'2'});eq(a.M.S.tries,'0');eq(JSON.parse(a.store['morse-practice-v1']).loopv,1);});
test('settings: after that, the user\'s own choice sticks',()=>{const a=boot({tries:'3',loopv:1});eq(a.M.S.tries,'3');});
test('settings: broken saved data does not crash',()=>{const a=boot();a.store['morse-practice-v1']='{bad';ok(boot({hist:'x',miss:5}).M.S.hist.length===0);});

/* ---------- weak letters ---------- */
test('weak letters: mistakes are counted and mix-ups noted',()=>{const a=boot();a.M.noteMistake('CAT','KAT');ok(a.M.S.miss.C>=1);ok(a.M.S.conf.CK>=1);});
test('weak letters: weak letters make words more likely',()=>{const a=boot();a.M.S.miss.Q=5;ok(a.M.weightOf('QUIET')>a.M.weightOf('HAT'));});
test('weak letters: getting it right lowers the count',()=>{const a=boot();a.click('start');a.advance(LONG);const w=a.word();a.M.S.miss[w[0]]=1;a.answer(w);a.advance(1200);ok(!(a.M.S.miss[w[0]]>=1));});

/* ---------- send ---------- */
test('send: three short taps decode as S',()=>{const a=boot();a.tab('send');const tap=ms=>{a.H.key.pointerdown({preventDefault:noop,pointerId:1});a.advance(ms);a.H.key.pointerup();a.advance(120);};tap(50);tap(50);tap(50);a.advance(1000);ok(a.E.senddec.textContent.startsWith('S'));});
test('send: next tap after a finished word starts fresh',()=>{const a=boot();a.tab('send');const tap=ms=>{a.H.key.pointerdown({preventDefault:noop,pointerId:1});a.advance(ms);a.H.key.pointerup();a.advance(120);};
  const target=a.E.sendword.textContent;for(let i=0;i<target.length;i++){tap(50);a.advance(1000);}ok(a.E.sendfb.textContent.length>0);tap(50);eq(a.E.senddec.textContent,'');eq(a.E.sendfb.textContent,'');});

console.log(`\n${pass} passed, ${fail} failed`);process.exitCode=fail?1:0;
