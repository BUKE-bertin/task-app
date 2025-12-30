/*
  firebase.js - placeholder module for optional Firestore sync.
  To enable Firestore sync, add your Firebase config below and implement
  the processQueue function. The app will call window.firebaseSync.processQueue(queue)
  where queue is an array of operations: {op:'add'|'update'|'delete', task?, id?, fields?}

  Example minimal implementation (fill config and uncomment):

  // import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
  // import { getFirestore, collection, doc, setDoc, deleteDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
  // const firebaseConfig = { apiKey: '...', authDomain: '...', projectId: '...' };
  // const app = initializeApp(firebaseConfig);
  // const db = getFirestore(app);
  // window.firebaseSync = {
  //   async processQueue(queue){
  //     for(const item of queue){
  //       if(item.op==='add') await setDoc(doc(collection(db,'tasks'), item.task.id), item.task);
  //       if(item.op==='update') await updateDoc(doc(db,'tasks',item.id), item.fields);
  //       if(item.op==='delete') await deleteDoc(doc(db,'tasks',item.id));
  //     }
  //   }
  // };

// Empty stub to avoid runtime errors if file is left as-is
window.firebaseSync = window.firebaseSync || {};
