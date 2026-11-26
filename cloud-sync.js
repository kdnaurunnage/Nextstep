/* NextStep Firebase cloud sync. Device progress always remains in localStorage. */
(function(){
'use strict';
const HOST=window.location.hostname;
const CONF=window.NEXTSTEP_FIREBASE_CONFIG;
const MERGE=window.NextStepMerge;
const B=()=>window.NextStepCloudBridge;
const VALID=!!(CONF&&CONF.apiKey&&CONF.authDomain&&CONF.projectId&&CONF.appId);
let auth, db, fbAuth, fbStore, currentUser=null, unsubscribe=null;
let mode=VALID?'loading':'setup', message='', syncing=false, pending=false, retryTimer=null, lastUIDKey='nextstep-cloud-last-account';
const status=()=>({signedIn:!!currentUser,mode,email:currentUser?.email||'',message});
window.NextStepCloud={status,isSignedIn:()=>!!currentUser};
const esc=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
function paint(){
 const box=document.getElementById('nextstepCloudPanel');
 if(!box)return;
 const common='<h2 class="mainTitle">Cloud sync <span class="dim tiny">· Tablet + PC</span></h2>';
 let html='';
 if(!VALID)html='<p class="sectionNote">Cloud sync is not configured yet. Your current lessons and study time are still saved locally. Follow the one-time Firebase setup instructions in the GitHub repository.</p><a class="btn" href="https://github.com/kdnaurunnage/Nextstep/blob/main/CLOUD_SYNC_SETUP.md" target="_blank" rel="noopener">Setup instructions ↗</a>';
 else if(mode==='loading')html='<p class="sectionNote">Preparing secure sign-in… Your offline study tracker is available.</p>';
 else if(currentUser){
  const label=mode==='synced'?'Up to date':mode==='syncing'?'Syncing…':mode==='offline'?'Offline — will retry':mode==='error'?'Sync problem':'Connecting…';
  html='<p class="sectionNote">Signed in as <b>'+esc(currentUser.email)+'</b></p>'+
   '<p class="sectionNote"><b>'+esc(label)+'</b>'+ (message?' — '+esc(message):'')+'</p>'+
   '<div class="actions"><button type="button" class="btn primary" data-cloud="sync">Sync now</button><button type="button" class="btn ghost" data-cloud="signout">Sign out</button></div>'+
   '<p class="sectionNote">Updates to tasks and study hours sync automatically when online. Keep an exported backup as well.</p>';
 } else {
  html='<p class="sectionNote">Sign in with the same NextStep account on your tablet and PC. Your existing local progress will be merged, not discarded.</p>'+
   '<form id="cloudAuthForm"><label>Email address</label><input class="field" type="email" name="email" autocomplete="email" required placeholder="you@example.com">'+
   '<label style="margin-top:10px">Password</label><input class="field" type="password" name="password" autocomplete="current-password" required minlength="6" placeholder="Your private password">'+
   '<div class="actions mt"><button class="btn primary" type="submit" data-cloud-submit="signin">Sign in</button><button class="btn" type="submit" data-cloud-submit="signup">Create account</button></div></form>'+
   '<div class="actions mt"><button class="btn ghost sm" type="button" data-cloud="resetpassword">Forgot password?</button></div>'+
   (message?'<p class="sectionNote" role="status">'+esc(message)+'</p>':'');
 }
 const next=common+html;
 if(box.innerHTML!==next)box.innerHTML=next;
}
function setMode(m,txt=''){mode=m;message=txt;paint()}
window.addEventListener('nextstep:render',paint);
document.addEventListener('submit',async e=>{
 if(e.target?.id!=='cloudAuthForm')return;
 e.preventDefault();
 if(!VALID||!auth)return;
 const form=e.target, data=new FormData(form),email=String(data.get('email')||'').trim(),password=String(data.get('password')||'');
 const kind=e.submitter?.dataset.cloudSubmit||'signin';
 try{
   setMode('loading');
   if(kind==='signup')await fbAuth.createUserWithEmailAndPassword(auth,email,password);
   else await fbAuth.signInWithEmailAndPassword(auth,email,password);
 }catch(err){setMode('signedout',friendly(err));}
 finally{form.querySelector('input[name=password]')?.setAttribute('value','');}
});
document.addEventListener('click',async e=>{
 const b=e.target.closest('[data-cloud]');if(!b||!VALID||!auth)return;
 const a=b.dataset.cloud;
 if(a==='sync'){pending=true;await syncNow();return;}
 if(a==='signout'){if(unsubscribe){unsubscribe();unsubscribe=null;}currentUser=null;await fbAuth.signOut(auth);setMode('signedout');return;}
 if(a==='resetpassword'){
   const email=prompt('Enter the email address for your NextStep account:');
   if(!email)return;
   try{await fbAuth.sendPasswordResetEmail(auth,email.trim());setMode('signedout','If the account exists, check your email for password reset instructions.');}
   catch(err){setMode('signedout',friendly(err));}
 }
});
function friendly(e){
 const code=String(e?.code||'');
 if(code.includes('network'))return 'No connection. Your local progress is safe.';
 if(code.includes('permission-denied'))return 'Database access denied. Check Firestore rules in Firebase Console.';
 if(code.includes('invalid-credential')||code.includes('wrong-password'))return 'Check your email and password.';
 if(code.includes('email-already-in-use'))return 'Account already exists. Choose Sign in.';
 if(code.includes('weak-password'))return 'Choose a stronger password (at least 6 characters).';
 if(code.includes('operation-not-allowed'))return 'Enable Email/Password under Firebase Authentication.';
 return (e?.message||'Unable to sync.').slice(0,220);
}
function docRef(){return fbStore.doc(db,'users',currentUser.uid,'nextstep','state')}
function schedule(){
 if(!currentUser)return;
 pending=true;
 clearTimeout(retryTimer);
 retryTimer=setTimeout(()=>{retryTimer=null;syncNow()},1100);
}
window.addEventListener('nextstep:local-change',schedule);
window.addEventListener('online',()=>{if(currentUser){pending=true;schedule()}});
async function syncNow(){
 if(!currentUser||syncing||!B()||!MERGE)return;
 if(!navigator.onLine){setMode('offline','Changes remain saved on this device.');return;}
 const userId=currentUser.uid;syncing=true;pending=false;setMode('syncing');
 try{
  const local=MERGE.project(B().snapshot());
  const merged=await fbStore.runTransaction(db,async tx=>{
    const ref=docRef();
    const remote=await tx.get(ref);
    const cloud=remote.exists()?remote.data().payload:null;
    const both=MERGE.merge(cloud,local);
    if(!remote.exists()||!MERGE.equal(cloud,both)){
      tx.set(ref,{schema:1,payload:both,updatedAt:fbStore.serverTimestamp()});
    }
    return both;
  });
  if(!currentUser||currentUser.uid!==userId)return;
  const latest=B().snapshot();
  const final=MERGE.merge(merged,latest);
  if(!MERGE.equal(latest,final))B().apply(final);
  if(!MERGE.equal(final,merged))pending=true;
  setMode('synced');
 }catch(err){
  if(currentUser&&currentUser.uid===userId){
    pending=true;
    setMode(navigator.onLine?'error':'offline',friendly(err));
  }
 }finally{
  syncing=false;
  if(pending&&mode!=='error'&&navigator.onLine)schedule();
 }
}
async function signedIn(user){
 if(unsubscribe){unsubscribe();unsubscribe=null;}
 currentUser=user;
 if(!user){setMode('signedout');return;}
 const last=localStorage.getItem(lastUIDKey);
 if(last&&last!==user.uid){
   currentUser=null;
   await fbAuth.signOut(auth);
   setMode('signedout','This device was linked to a different account. Export a backup before switching accounts.');
   return;
 }
 localStorage.setItem(lastUIDKey,user.uid);
 setMode('syncing');
 await syncNow();
 if(!currentUser)return;
 unsubscribe=fbStore.onSnapshot(docRef(),snap=>{
    if(!snap.exists()||snap.metadata.hasPendingWrites||!B())return;
    const cloud=snap.data().payload;
    const local=B().snapshot();
    const both=MERGE.merge(cloud,local);
    if(!MERGE.equal(local,both))B().apply(both);
    if(!MERGE.equal(cloud,both))schedule();
    else if(mode!=='error')setMode('synced');
 },err=>setMode('error',friendly(err)));
}
async function boot(){
 if(!VALID){setMode('setup');return;}
 if(!MERGE||!B()){setMode('error','The local study app could not initialize.');return;}
 try{
  const ver='13.4.0',base='https://www.gstatic.com/firebasejs/'+ver+'/';
  const [appmod,authmod,storemod]=await Promise.all([import(base+'firebase-app.js'),import(base+'firebase-auth.js'),import(base+'firebase-firestore.js')]);
  fbAuth=authmod;fbStore=storemod;
  const app=appmod.initializeApp(CONF);
  auth=authmod.getAuth(app);db=storemod.getFirestore(app);
  authmod.onAuthStateChanged(auth,signedIn,e=>setMode('error',friendly(e)));
 }catch(e){setMode('error','Could not load Firebase. Check your internet connection and web-app configuration.');}
}
boot();
})();