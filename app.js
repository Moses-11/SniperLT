const $ = id => document.getElementById(id);
$('threshold').addEventListener('input',()=> $('thresholdValue').textContent=$('threshold').value+'%');
function ema(values, period){
  const k=2/(period+1); let out=[values[0]];
  for(let i=1;i<values.length;i++) out.push(values[i]*k+out[i-1]*(1-k));
  return out;
}
function rsi(values, period=14){
  let gains=0,losses=0;
  for(let i=values.length-period;i<values.length;i++){
    const d=values[i]-values[i-1]; if(d>0) gains+=d; else losses-=d;
  }
  if(losses===0) return 100;
  const rs=(gains/period)/(losses/period); return 100-(100/(1+rs));
}
function analyse(values){
  const fast=ema(values,9), slow=ema(values,21);
  const macdLine=fast.map((v,i)=>v-slow[i]);
  const signalLine=ema(macdLine,9);
  const last=values.length-1, currentRsi=rsi(values);
  const trendUp=fast[last]>slow[last], macdUp=macdLine[last]>signalLine[last];
  const momentumUp=values[last]>values[last-1];
  const bullish=[trendUp,macdUp,currentRsi>50&&currentRsi<70,momentumUp].filter(Boolean).length;
  const bearish=[!trendUp,!macdUp,currentRsi<50&&currentRsi>30,!momentumUp].filter(Boolean).length;
  const direction=bullish>bearish?'CALL':bearish>bullish?'PUT':'WAIT';
  const alignment=Math.max(bullish,bearish);
  const score=direction==='WAIT'?50:Math.round(50+(alignment/4)*45);
  const reasons=[
    `EMA 9 vs EMA 21: ${trendUp?'short-term trend is bullish': 'short-term trend is bearish'}.`,
    `MACD: ${macdUp?'momentum is positive':'momentum is negative'} relative to its signal line.`,
    `RSI(14): ${currentRsi.toFixed(1)} — ${currentRsi>=70?'potentially overbought':currentRsi<=30?'potentially oversold':currentRsi>50?'above the midpoint':'below the midpoint'}.`,
    `Latest candle: ${momentumUp?'closed higher':'closed lower'} than the previous close.`
  ];
  return {direction,score,currentRsi,trendUp,macdUp,reasons};
}
function addHistory(data){
  const row=document.createElement('tr');
  const cls=data.direction==='CALL'?'buy':data.direction==='PUT'?'sell':'wait';
  [new Date().toLocaleTimeString(),data.asset,data.direction,data.score+'%', '$'+data.stake,data.timeframe].forEach((v,i)=>{
    const td=document.createElement('td');td.textContent=v;if(i===2)td.className=cls;row.appendChild(td);
  });
  if($('historyBody').querySelector('.wait')) $('historyBody').innerHTML='';
  $('historyBody').prepend(row);
}
$('analyse').addEventListener('click',()=>{
  const raw=$('prices').value.trim();
  const values=raw.split(/[\s,;]+/).filter(Boolean).map(Number);
  if(values.length<3 || values.some(v=>!Number.isFinite(v)||v<=0)){
    alert('Enter at least 3 valid positive closing prices. Separate them with commas or new lines.');return;
  }
  const stake=Number($('stake').value);
  if(!Number.isFinite(stake)||stake<=0){alert('Enter a valid stake amount.');return;}
  const a=analyse(values), threshold=Number($('threshold').value);
  const qualifies=a.direction!=='WAIT'&&a.score>=threshold;
  const asset=$('asset').value, timeframe=$('timeframe').value;
  $('signalState').textContent=qualifies?'SIGNAL QUALIFIED':a.direction==='WAIT'?'NO CLEAR EDGE':'BELOW THRESHOLD';
  const direction=qualifies?a.direction:'WAIT';
  const title=direction==='CALL'?'CALL':direction==='PUT'?'PUT':'WAIT';
  const reasons=a.reasons.map(r=>'<div>• '+r+'</div>').join('');
  $('result').innerHTML=`
    <div class="signal">
      <div class="eyebrow">${asset} • ${timeframe} • ${$('market').value}</div>
      <div class="direction ${direction==='PUT'?'put':''}">${title}</div>
      <div class="signal-sub">${qualifies?'Technical conditions meet your selected threshold.':'No qualified entry. Wait for clearer conditions.'}</div>
    </div>
    <div class="metrics">
      <div class="metric"><small>Strength score</small><strong>${a.score}%</strong></div>
      <div class="metric"><small>RSI (14)</small><strong>${a.currentRsi.toFixed(1)}</strong></div>
      <div class="metric"><small>Configured stake</small><strong>$${stake.toFixed(2)}</strong></div>
    </div>
    <div class="reason"><b>Indicator breakdown</b>${reasons}<p>Score measures agreement among four simple indicators. It is not a probability of winning and has not been calibrated through backtesting.</p></div>`;
  addHistory({asset,direction,score:a.score,stake:stake.toFixed(2),timeframe});
});
$('clear').addEventListener('click',()=>{$('historyBody').innerHTML='<tr><td colspan="6" class="wait">No analyses yet.</td></tr>';});
$('market').addEventListener('change',()=>{
  const otc=$('market').value==='OTC';
  $('asset').value=otc?'EUR/USD OTC':'EUR/USD';
});
