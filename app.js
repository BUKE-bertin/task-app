// app.js - logique principale de l'application de tâches
(function(){
  const STORAGE_KEY = 'light-tasks:v1';
  let tasks = [];
  let pendingQueue = [];

  const $ = selector => document.querySelector(selector);
  const taskForm = $('#taskForm');
  const taskInput = $('#taskInput');
  const taskPriority = $('#taskPriority');
  const taskTime = $('#taskTime');
  const taskList = $('#taskList');
  const statusEl = $('#status');
  const showDone = $('#showDone');
  const syncToggle = $('#syncToggle');
  const enableNotifBtn = $('#enableNotifBtn');
  const themeToggle = $('#themeToggle');
  const installBtn = $('#installBtn');

  function saveLocal(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify({tasks,pendingQueue}));
  }

  function loadLocal(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return;
      const parsed = JSON.parse(raw);
      tasks = parsed.tasks || [];
      pendingQueue = parsed.pendingQueue || [];
    }catch(e){console.warn('loadLocal',e)}
  }

  function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,8)}

  function render(){
    taskList.innerHTML = '';
    const show = showDone.checked;
    tasks.slice().reverse().forEach(task=>{
      if(task.done && !show) return;
      const li = document.createElement('li');
      const urgencyClass = task.priority === 'urgent' ? ' urgent' : (task.priority==='low'?' low':'');
      const dueSoon = task.due && (task.due - Date.now() <= 60*60*1000) && !task.done;
      li.className = 'task-item' + (task.done? ' done':'' ) + urgencyClass + (dueSoon? ' due-soon':'');
      li.dataset.id = task.id;
      const dueStr = task.due ? new Date(task.due).toLocaleString() : '';
      li.innerHTML = `
        <input type="checkbox" class="task-check" ${task.done?'checked':''} aria-label="Marquer">
        <div class="title">${escapeHtml(task.title)}</div>
        <div class="meta">${escapeHtml(task.priority || 'normal')} ${dueStr? ' — ' + escapeHtml(dueStr):''}</div>
        <button class="edit">✏️</button>
        <button class="delete">🗑️</button>
      `;
      taskList.appendChild(li);
    });
    if(typeof window.renderHistory === 'function') window.renderHistory();
  }

  function escapeHtml(s){return String(s).replace(/[&<>\"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"})[c])}

  function addTask(title){
    const priority = (taskPriority && taskPriority.value) || 'normal';
    let due = null;
    if(taskTime && taskTime.value){
      const d = new Date(taskTime.value);
      if(!isNaN(d)) due = d.getTime();
    }
    const t = {id:uid(),title,done:false,updated:Date.now(),priority, due, notified:false};
    tasks.push(t);
    pendingQueue.push({op:'add',task:t});
    if(typeof window.pushHistory === 'function') window.pushHistory({type:'add',task:t});
    saveLocal();
    render();
    trySync();
  }

  function updateTask(id, fields){
    const t = tasks.find(x=>x.id===id); if(!t) return;
    const prevDone = t.done;
    Object.assign(t,fields,{updated:Date.now()});
    // reset notified flag when changing due/priority
    if(typeof fields.due !== 'undefined' || typeof fields.priority !== 'undefined' || typeof fields.title !== 'undefined'){
      t.notified = false;
    }
    pendingQueue.push({op:'update',id,fields});
    // push history when completion status changes
    if(typeof window.pushHistory === 'function' && typeof fields.done !== 'undefined'){
      if(!prevDone && fields.done) window.pushHistory({type:'done',task:t});
      else if(prevDone && !fields.done) window.pushHistory({type:'undone',task:t});
    }
    saveLocal(); render(); trySync();
  }

  function removeTask(id){
    const t = tasks.find(x=>x.id===id);
    tasks = tasks.filter(x=>x.id!==id);
    pendingQueue.push({op:'delete',id});
    if(typeof window.pushHistory === 'function') window.pushHistory({type:'delete',id,task:t});
    saveLocal(); render(); trySync();
  }

  taskForm.addEventListener('submit', e=>{
    e.preventDefault();
    const val = taskInput.value.trim();
    if(!val) return;
    addTask(val);
    taskInput.value = '';
    if(taskPriority) taskPriority.value = 'normal';
    if(taskTime) taskTime.value = '';
  });

  taskList.addEventListener('click', e=>{
    const li = e.target.closest('.task-item'); if(!li) return;
    const id = li.dataset.id;
    if(e.target.classList.contains('delete')){
      removeTask(id);
    }else if(e.target.classList.contains('edit')){
      const t = tasks.find(x=>x.id===id);
      const newTitle = prompt('Modifier la tâche', t.title);
      if(newTitle==null) return;
      const newPriority = prompt('Priorité (urgent, normal, low)', t.priority||'normal');
      const newDueStr = prompt('Heure (YYYY-MM-DDTHH:MM) ou vide', t.due? new Date(t.due).toISOString().slice(0,16):'');
      const upd = {title:newTitle};
      if(newPriority) upd.priority = (newPriority==='urgent'?'urgent':(newPriority==='low'?'low':'normal'));
      if(newDueStr){ const dd = new Date(newDueStr); if(!isNaN(dd)) upd.due = dd.getTime(); }
      else upd.due = null;
      updateTask(id, upd);
    }else if(e.target.classList.contains('task-check')){
      updateTask(id,{done:e.target.checked});
    }
  });

  // Notification support
  async function ensureNotificationPermission(){
    if(!('Notification' in window)) return false;
    if(Notification.permission === 'granted') return true;
    if(Notification.permission === 'denied') return false;
    const p = await Notification.requestPermission();
    return p === 'granted';
  }

  async function checkUrgencyAndNotify(){
    if(!navigator.onLine) return; // optional: only notify when online
    if(typeof Notification === 'undefined') return;
    if(Notification.permission !== 'granted') return;
    const now = Date.now();
    const threshold = 60*60*1000; // 1 hour
    let changed = false;
    tasks.forEach(t=>{
      if(t.done) return;
      if(t.notified) return;
      const dueSoon = t.due && (t.due - now <= threshold) && (t.due - now >= -5*60*1000);
      const urgentCategory = t.priority === 'urgent';
      if(urgentCategory || dueSoon){
        try{
          new Notification(t.title, {body: (t.due? 'À faire vers : '+ new Date(t.due).toLocaleString() : 'Priorité : '+t.priority)});
          t.notified = true; changed = true;
        }catch(e){console.warn('notif error',e)}
      }
    });
    if(changed) saveLocal();
  }

  if(enableNotifBtn){
    enableNotifBtn.addEventListener('click', async ()=>{
      const ok = await ensureNotificationPermission();
      if(ok) { alert('Notifications activées'); checkUrgencyAndNotify(); }
      else alert('Autorisation de notification refusée ou non supportée');
    });
  }

  // check periodically
  setInterval(()=>{ try{ checkUrgencyAndNotify(); }catch(e){} }, 60*1000);
  // also check on load
  setTimeout(()=>{ try{ checkUrgencyAndNotify(); }catch(e){} }, 2000);

  showDone.addEventListener('change', render);

  window.addEventListener('online', ()=>{
    statusEl.textContent = 'Statut: en ligne';
    trySync();
  });
  window.addEventListener('offline', ()=>{
    statusEl.textContent = 'Statut: hors-ligne';
  });

  // Simple sync hook: if firebase.js exposes a `sync.processQueue` function, use it.
  async function trySync(){
    if(!navigator.onLine) return;
    if(typeof window.firebaseSync === 'object' && typeof window.firebaseSync.processQueue === 'function' && syncToggle.checked){
      const q = pendingQueue.slice();
      try{
        await window.firebaseSync.processQueue(q);
        pendingQueue = [];
        saveLocal();
      }catch(err){
        console.warn('sync failed',err);
      }
    }
  }

  // Service worker registration
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  }

  // PWA install button
  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', (e)=>{
    e.preventDefault();
    deferredPrompt = e;
    installBtn.style.display = 'inline-block';
  });
  installBtn.addEventListener('click', async ()=>{
    if(!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    deferredPrompt = null; installBtn.style.display='none';
  });

  // Initial load
  loadLocal();
  // theme: prefer saved, else follow system preference
  const savedTheme = localStorage.getItem('theme');
  const systemPrefLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
  const initialTheme = savedTheme || (systemPrefLight ? 'light' : 'dark');
  try{ document.documentElement.setAttribute('data-theme', initialTheme); }catch(e){}
  function updateThemeButton(){
    if(!themeToggle) return;
    const cur = document.documentElement.getAttribute('data-theme')==='light' ? 'light' : 'dark';
    themeToggle.textContent = cur === 'light' ? 'Mode clair' : 'Mode sombre';
    themeToggle.setAttribute('aria-label', cur === 'light' ? 'Mode clair activé. Cliquer pour passer en mode sombre' : 'Mode sombre activé. Cliquer pour passer en mode clair');
  }
  updateThemeButton();
  if(themeToggle) themeToggle.addEventListener('click', ()=>{
    const cur = document.documentElement.getAttribute('data-theme')==='light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', cur);
    localStorage.setItem('theme', cur);
    updateThemeButton();
  });
  render();
  if(navigator.onLine) statusEl.textContent = 'Statut: en ligne';

  // Expose for debugging
  window.appTasks = {get: ()=>tasks, add:addTask, update:updateTask, remove:removeTask};

})();
