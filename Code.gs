/**
 * RONGCHARON BUSINESS MANAGER - Google Apps Script backend
 * প্রথমবার setup() চালান। তারপর Deploy > New deployment > Web app.
 * Execute as: Me | Who has access: Anyone
 *
 * নোট: এই starter API JSONP ব্যবহার করে Netlify থেকে Apps Script-এ যোগাযোগ করে।
 * JSONP-তে GET request ব্যবহৃত হয়; production ব্যবহারের আগে request-signing,
 * rate limiting এবং sensitive actions-এর নিরাপদ POST bridge যোগ করা আবশ্যক।
 */
const DB_ID = PropertiesService.getScriptProperties().getProperty('DB_ID');
const SHEETS = {
  Users:['userId','name','passwordHash','salt','role','active','createdAt'],
  Orders:['orderId','customer','phone','address','total','advance','status','createdAt','createdBy'],
  Products:['productId','name','category','purchasePrice','sellingPrice','stock','minStock','createdAt'],
  Customers:['customerId','name','phone','address','createdAt'],
  Combos:['comboId','name','itemCount','price','note','createdAt'],
  ComboItems:['comboId','productId','quantity'],
  Expenses:['expenseId','category','amount','note','createdAt','createdBy'],
  Deliveries:['deliveryId','orderId','courier','tracking','status','createdAt'],
  Inventory:['movementId','productId','type','quantity','note','createdAt','createdBy'],
  Payments:['paymentId','orderId','amount','method','createdAt'],
  ActivityLog:['logId','userId','action','entity','recordId','createdAt'],
  Settings:['key','value']
};
function setup(){
  const ss=SpreadsheetApp.create('রঙচরণ Business Manager Database');
  PropertiesService.getScriptProperties().setProperty('DB_ID',ss.getId());
  Object.keys(SHEETS).forEach(n=>{const sh=ss.insertSheet(n);sh.appendRow(SHEETS[n]);sh.setFrozenRows(1)});
  const first=ss.getSheets()[0];if(first.getName().startsWith('Sheet'))ss.deleteSheet(first);
  const salt=Utilities.getUuid();const hash=hashPassword_('ChangeThisAdminPassword!',salt);
  ss.getSheetByName('Users').appendRow(['admin','রঙচরণ Admin',hash,salt,'admin',true,new Date()]);
  ss.getSheetByName('Settings').appendRow(['businessName','রঙচরণ']);
  ss.getSheetByName('Settings').appendRow(['businessPhone','01617304334']);
  Logger.log('Database created: '+ss.getUrl());
  Logger.log('প্রথম Admin ID: admin | Initial password: ChangeThisAdminPassword! (লগইন করে দ্রুত পরিবর্তন করুন)');
}
function doGet(e){
  const p=e.parameter||{},cb=p.callback||'';
  let result;
  try{const payload=JSON.parse(p.payload||'{}');result=route_(p.action,payload)}
  catch(err){result={ok:false,message:String(err.message||err)}}
  const json=JSON.stringify(result);
  if(cb && /^[a-zA-Z_$][\w$]*$/.test(cb))return ContentService.createTextOutput(cb+'('+json+');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}
function route_(action,p){
  const ss=openDb_();
  if(action==='login'){
    const sh=ss.getSheetByName('Users'),v=sh.getDataRange().getValues(),u=v.slice(1).find(r=>String(r[0])===String(p.userId)&&r[5]===true);
    if(!u||hashPassword_(p.password,u[3])!==u[2])throw new Error('User ID অথবা Password সঠিক নয়');
    const token=Utilities.getUuid()+Utilities.getUuid();
    CacheService.getScriptCache().put('sess_'+token,JSON.stringify({userId:u[0],name:u[1],role:u[4]}),21600);
    return {ok:true,token,user:{userId:u[0],name:u[1],role:u[4]}};
  }
  if(action==='me'){const user=auth_(p.token);return {ok:true,user};}
  const user=auth_(p.token);
  if(action==='list'){
    const data={};Object.keys(SHEETS).forEach(n=>{if(['Users','Settings','ActivityLog','Payments','Inventory','ComboItems'].includes(n))return;const vals=ss.getSheetByName(n).getDataRange().getValues();data[n[0].toLowerCase()+n.slice(1)]=vals.slice(1).map(r=>{const o={};SHEETS[n].forEach((k,i)=>o[k]=r[i]);return o})});
    return {ok:true,data:{orders:data.orders||[],products:data.products||[],customers:data.customers||[],combos:data.combos||[],expenses:data.expenses||[],deliveries:data.deliveries||[]}};
  }
  if(action==='save'){
    const allowed={orders:'Orders',products:'Products',customers:'Customers',combos:'Combos',expenses:'Expenses',deliveries:'Deliveries'};
    const sheetName=allowed[p.entity];if(!sheetName)throw new Error('এই তথ্য সংরক্ষণের অনুমতি নেই');
    if(user.role!=='admin' && ['expenses'].includes(p.entity))throw new Error('এই কাজের অনুমতি নেই');
    const sh=ss.getSheetByName(sheetName),obj=p.data||{},headers=SHEETS[sheetName],idField={Orders:'orderId',Products:'productId',Customers:'customerId',Combos:'comboId',Expenses:'expenseId',Deliveries:'deliveryId'}[sheetName];
    obj[idField]=obj[idField]||Utilities.getUuid().slice(0,8).toUpperCase();obj.createdAt=new Date();obj.createdBy=user.userId;
    sh.appendRow(headers.map(k=>obj[k]===undefined?'':obj[k]));
    ss.getSheetByName('ActivityLog').appendRow([Utilities.getUuid(),user.userId,'CREATE',sheetName,obj[idField],new Date()]);
    return {ok:true,id:obj[idField],message:'সংরক্ষিত হয়েছে'};
  }
  throw new Error('অজানা অনুরোধ');
}
function auth_(token){if(!token)throw new Error('আবার লগইন করুন');const s=CacheService.getScriptCache().get('sess_'+token);if(!s)throw new Error('সেশন শেষ হয়েছে, আবার লগইন করুন');return JSON.parse(s)}
function openDb_(){const id=PropertiesService.getScriptProperties().getProperty('DB_ID');if(!id)throw new Error('প্রথমে setup() চালান');return SpreadsheetApp.openById(id)}
function hashPassword_(password,salt){const bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(salt)+'|'+String(password),Utilities.Charset.UTF_8);return bytes.map(b=>(b+256).toString(16).slice(-2)).join('')}
