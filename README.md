# রঙচরণ Business Manager 2.0 — Starter Project

## অন্তর্ভুক্ত
- Mobile-first বাংলা UI
- আপনার আপলোড করা Logo ও Banner
- Login screen (শুধু User ID ও Password)
- Dashboard, Orders, Products/Stock, Combo, Customers, Delivery, Expenses, Reports, Users, Settings-এর প্রাথমিক UI
- Google Apps Script backend starter এবং Google Sheets setup function
- PWA manifest/service worker

## খুব গুরুত্বপূর্ণ
এটি প্রথম কার্যকর starter build, পূর্ণ production release নয়। Backend-এর JSONP GET transport-টি সহজ deployment-এর জন্য রাখা হয়েছে; production-এ সংবেদনশীল write action-এর জন্য নিরাপদ POST bridge/request verification, password change flow, employee provisioning, role-permission matrix, edit/delete, stock transaction consistency, returns, profit calculation এবং audit hardening সম্পন্ন করতে হবে। এই starter-এ admin-এর প্রাথমিক পাসওয়ার্ড `ChangeThisAdminPassword!`; Deploy করার পর অবিলম্বে পরিবর্তন না করে বাস্তব ব্যবসার ডেটা ব্যবহার করবেন না।

## Setup
1. `Code.gs` Google Apps Script-এ paste করুন।
2. `setup()` একবার Run করুন; permission দিন। এটি নতুন Google Spreadsheet ও প্রয়োজনীয় tabs তৈরি করবে।
3. Apps Script > Deploy > New deployment > Web app:
   - Execute as: Me
   - Who has access: Anyone
4. `/exec` URL কপি করে `config.js`-এর `API_URL`-এ বসান।
5. `index.html`, `style.css`, `app.js`, `config.js`, `manifest.json`, `sw.js`, `logo.jpg`, `banner.jpg` Netlify-তে upload করুন।
6. প্রথম Admin User ID `admin`; initial password `ChangeThisAdminPassword!`। এটি production-এ ব্যবহারের আগে password-change ব্যবস্থা যোগ/প্রয়োগ করতে হবে।

## Netlify
ZIP extract করে সব ফাইল site publish directory-তে দিন। HTTPS স্বয়ংক্রিয়ভাবে Netlify-তে পাওয়া যায়।
