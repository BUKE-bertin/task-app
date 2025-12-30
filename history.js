(function(){
  const HISTORY_KEY = 'task-history:v1';
  function loadHistory(){ try{return JSON.parse(localStorage.getItem(HISTORY_KEY))||[];}catch(e){return[]} }
  function saveHistory(h){ try{ localStorage.setItem(HISTORY_KEY, JSON.stringify(h)); }catch(e){}
  }

  window.pushHistory = function(entry){
    const h = loadHistory();
    const ev = {
      ts: Date.now(),
      type: entry.type,
      id: entry.task && entry.task.id || entry.id || null,
      title: entry.task && entry.task.title || entry.title || ''
    };
    h.push(ev);
    if(h.length>1000) h.splice(0,h.length-1000);
    saveHistory(h);
  };

  window.renderHistory = function(){
    const h = loadHistory();
    const rangeSelect = document.getElementById('historyRange');
    const days = (rangeSelect && parseInt(rangeSelect.value)) || 14;
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days-1));

    const labels = [];
    const dateMapAdd = {};
    const dateMapDone = {};
    for(let i=0;i<days;i++){
      const d = new Date(start);
      d.setDate(start.getDate()+i);
      const key = d.toISOString().slice(0,10);
      labels.push(key);
      dateMapAdd[key]=0; dateMapDone[key]=0;
    }

    h.forEach(ev=>{
      const k = new Date(ev.ts).toISOString().slice(0,10);
      if(k in dateMapAdd && ev.type==='add') dateMapAdd[k] = (dateMapAdd[k]||0)+1;
      if(k in dateMapDone && ev.type==='done') dateMapDone[k] = (dateMapDone[k]||0)+1;
    });

    const addData = labels.map(l=>dateMapAdd[l]||0);
    const doneData = labels.map(l=>dateMapDone[l]||0);

    const canvas = document.getElementById('historyChart');
    if(canvas && typeof Chart !== 'undefined'){
      const ctx = canvas.getContext('2d');
      if(window._historyChart && typeof window._historyChart.destroy==='function'){
        try{ window._historyChart.destroy(); }catch(e){}
      }
      window._historyChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels.map(l=>l),
          datasets: [
            {label: 'Ajouts', data: addData, borderColor: '#007bff', backgroundColor: 'rgba(0,123,255,0.1)', fill: true, tension:0.2},
            {label: 'Terminés', data: doneData, borderColor: '#28a745', backgroundColor: 'rgba(40,167,69,0.08)', fill: true, tension:0.2}
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {mode:'index',intersect:false},
          scales: { x: { display:true }, y: { beginAtZero:true, precision:0 } }
        }
      });
    }

    const list = document.getElementById('historyList');
    if(list){
      list.innerHTML = '';
      h.slice(-50).reverse().forEach(ev=>{
        const li = document.createElement('li');
        li.textContent = `${new Date(ev.ts).toLocaleString()} — ${ev.type} — ${ev.title || ''}`;
        list.appendChild(li);
      });
    }
  };

  document.addEventListener('DOMContentLoaded', ()=>{
    const sel = document.getElementById('historyRange');
    if(sel) sel.addEventListener('change', window.renderHistory);
    window.renderHistory();
  });
})();
