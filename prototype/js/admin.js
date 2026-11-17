// FreshNest prototype — Admin dashboard behaviour (sample data only, nothing is saved)
window.onerror = function (m, s, l) { document.documentElement.setAttribute('data-err', m + ' @' + l); };
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var fmt = function (n) { return Math.round(n).toLocaleString('en-IN'); };

  /* ---------- toast, modal, tooltip ---------- */
  var tt;
  function toast(msg) { var t = $('#toast'); t.textContent = msg; t.classList.remove('hidden'); clearTimeout(tt); tt = setTimeout(function () { t.classList.add('hidden'); }, 3400); }
  function modal(title, body, okLabel, onOk, okClass) {
    $('#mTitle').textContent = title; $('#mBody').innerHTML = body;
    var f = $('#mFoot'); f.innerHTML = '';
    var c = document.createElement('button'); c.className = 'btn ghost'; c.textContent = 'Close'; c.onclick = closeModal; f.appendChild(c);
    if (okLabel) { var o = document.createElement('button'); o.className = 'btn ' + (okClass || 'slate'); o.textContent = okLabel; o.onclick = function () { if (onOk() !== false) closeModal(); }; f.appendChild(o); }
    $('#veil').classList.remove('hidden');
  }
  function closeModal() { $('#veil').classList.add('hidden'); }
  $('#veil').addEventListener('click', function (e) { if (e.target.id === 'veil') closeModal(); });
  function need(el) { if (!el || !el.value.trim()) { if (el) el.style.outline = '2px solid var(--clay)'; return false; } el.style.outline = ''; return true; }
  var tip = $('#tip');
  function showTip(html, e) { tip.innerHTML = html; tip.classList.remove('hidden'); var x = e.clientX + 14, y = e.clientY + 14; if (x + 270 > innerWidth) x = e.clientX - 270; tip.style.left = x + 'px'; tip.style.top = y + 'px'; }
  function hideTip() { tip.classList.add('hidden'); }

  /* ---------- who is looking (Preview as) ---------- */
  var ADMINS = {
    nusrat: { name: 'Nusrat Jahan', short: 'Nusrat', role: 'Super Admin', perms: ['super', 'verify', 'deals', 'reports', 'announce', 'analytics'] },
    tanvir: { name: 'Tanvir Ahmed', short: 'Tanvir', role: 'Admin', perms: ['verify', 'deals'] },
    mitu: { name: 'Mitu Rahman', short: 'Mitu', role: 'Admin', perms: ['reports', 'announce', 'analytics'] }
  };
  var permNames = { super: 'Super Admin', verify: 'Verification', deals: 'Delivery failures & cancellations', reports: 'Reports & reviews', announce: 'Announcements', analytics: 'Analytics' };
  var me = ADMINS.nusrat;
  function can(p) { return me.perms.indexOf(p) >= 0; }
  function applyPerms() {
    $$('[data-perm]').forEach(function (el) {
      var ok = el.dataset.perm.split(' ').some(can);
      el.classList.toggle('hide-perm', !ok);
    });
    $('#whoA').textContent = me.short[0];
    $('#whoN').innerHTML = me.name + '<small>' + me.role + '</small>';
    $('#hello').textContent = 'Good morning, ' + me.short;
    $('#permText').textContent = me.perms.filter(function (p) { return p !== 'super'; }).map(function (p) { return permNames[p]; }).join(' · ') + (can('super') ? ' · plus team, settings, products, lifting bans' : '');
    var cur = location.hash.slice(1) || 'home', link = $('[data-nav="' + cur + '"]');
    if (link && link.classList.contains('hide-perm')) go('home');
    var firstTab = $$('#caseTabs button').filter(function (b) { return !b.classList.contains('hide-perm'); })[0];
    if (firstTab && $('#caseTabs button.on.hide-perm, #caseTabs button:not(.on)') && (!$('#caseTabs button.on') || $('#caseTabs button.on').classList.contains('hide-perm'))) openCaseTab(firstTab.dataset.t);
  }
  $('#asWho').onchange = function () { me = ADMINS[this.value]; applyPerms(); renderVerify(); renderFail(); renderUsers(); toast('Now previewing as ' + me.name + '. The menu shows only their permissions.'); };

  /* ---------- navigation ---------- */
  var views = ['home', 'verify', 'fail', 'cases', 'users', 'products', 'announce', 'analytics', 'team'];
  function show(v) {
    if (views.indexOf(v) < 0) v = 'home';
    var link = $('[data-nav="' + v + '"]'); if (link && link.classList.contains('hide-perm')) v = 'home';
    $$('[data-view]').forEach(function (s) { s.classList.toggle('hidden', s.dataset.view !== v); });
    $$('[data-nav]').forEach(function (a) { a.classList.toggle('on', a.dataset.nav === v); });
    window.scrollTo(0, 0);
    if (v === 'analytics') renderAnalytics();
  }
  function go(v) { if (location.hash === '#' + v) show(v); else location.hash = v; }
  window.addEventListener('hashchange', function () { show(location.hash.slice(1)); });
  $('#bell').onclick = function (e) { e.stopPropagation(); $('#drop').classList.toggle('hidden'); };
  document.addEventListener('click', function (e) { if (!$('#drop').contains(e.target)) $('#drop').classList.add('hidden'); });
  $$('[data-goto]').forEach(function (el) { el.onclick = function () { $('#drop').classList.add('hidden'); go(el.dataset.goto); }; });

  /* ---------- activity log ---------- */
  var LOG = [
    ['13 Nov 10:24', 'Nusrat', 'Approved delivery failure · cauliflower 700 kg at Shibganj, Bogura (was escalated after 30 min)'],
    ['13 Nov 10:02', 'Tanvir', 'Approved delivery failure FN-1031 · green chili 380 kg at Ullapara, Sirajganj'],
    ['13 Nov 09:30', 'Tanvir', 'Rejected dealer Quick Agro · reason: name on trade license does not match NID'],
    ['13 Nov 09:05', 'Nusrat', 'Added admin Mitu Rahman · permissions: reports, announcements, analytics'],
    ['12 Nov 16:20', 'Mitu', 'Sent announcement to Ullapara upazila (214 users): dense fog'],
    ['10 Nov 11:12', 'Tanvir', 'Verified vehicle Bogura-Ma 11-2245 (Bogura Logistics)'],
    ['2 Nov 15:40', 'Nusrat', 'Banned Fake Agro BD · reason: took advance payments and never collected produce (4 reports)']
  ];
  function log(text) { LOG.unshift(['13 Nov ' + new Date().toTimeString().slice(0, 5), me.short, text]); renderLog(); }
  function renderLog() { $('#log').innerHTML = '<tr><th>When</th><th>Admin</th><th>Action</th></tr>' + LOG.map(function (r) { return '<tr><td>' + r[0] + '</td><td><b>' + r[1] + '</b></td><td>' + r[2] + '</td></tr>'; }).join(''); }

  /* ---------- lock (Being handled by X, auto-release after 15 min idle) ---------- */
  var locks = { v3: { by: 'tanvir', idle: 12 * 60 } };
  function lockHtml(id) {
    var l = locks[id];
    if (!l || l.by === Object.keys(ADMINS).filter(function (k) { return ADMINS[k] === me; })[0]) return '<span class="lock">Being handled by you · other admins see this case as locked · releases after 15 min idle</span>';
    var left = 15 * 60 - l.idle;
    return '<span class="lock other">Being handled by ' + ADMINS[l.by].short + ' · idle ' + Math.floor(l.idle / 60) + ' min · releases in <span class="num" data-lockcd="' + id + '">' + Math.ceil(left / 60) + ' min</span></span>' + (can('super') ? ' <button class="btn sm ghost" data-unlock="' + id + '">Unlock now</button>' : '');
  }
  function lockedByOther(id) { var l = locks[id]; return l && ADMINS[l.by] !== me; }
  function takeLock(id) { if (!lockedByOther(id)) locks[id] = { by: Object.keys(ADMINS).filter(function (k) { return ADMINS[k] === me; })[0], idle: 0 }; }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-unlock]'); if (!b) return;
    delete locks[b.dataset.unlock]; log('Unlocked case ' + b.dataset.unlock + ' held by Tanvir'); toast('Lock released. You can work on this case now.'); renderVerify(b.dataset.unlock);
  });
  setInterval(function () {
    Object.keys(locks).forEach(function (id) {
      var l = locks[id]; if (ADMINS[l.by] === me) return;
      l.idle += 1;
      if (l.idle >= 15 * 60) { delete locks[id]; toast('A lock was released automatically after 15 minutes idle.'); renderVerify(); }
    });
    $$('[data-lockcd]').forEach(function (el) { var l = locks[el.dataset.lockcd]; if (l) { var s = 15 * 60 - l.idle; el.textContent = Math.floor(s / 60) + 'm ' + (s % 60) + 's'; } });
    $$('[data-cd]').forEach(function (el) { var s = +el.dataset.cd + 1; el.dataset.cd = s; el.textContent = Math.floor(s / 60) + ' min'; });
  }, 1000);

  /* ---------- history panel ---------- */
  function histHtml(h) {
    return '<div class="hist"><h4>History · ' + h.who + '</h4><dl>' +
      h.rows.map(function (r) { return '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>'; }).join('') + '</dl>' +
      (h.notes ? '<ul>' + h.notes.map(function (n) { return '<li>' + n + '</li>'; }).join('') + '</ul>' : '') + '</div>';
  }

  /* =====================================================
     A2 VERIFICATION
  ===================================================== */
  var VER = [
    { id: 'v1', kind: 'Dealer', name: 'Sirajganj Sabji Ghar', place: 'Shahjadpur, Sirajganj', when: 'today 8:12 AM', docs: ['NID · Abdul Malek', 'Trade license · TL-2026-4471'], blur: [], st: 'Waiting', info: [['Owner', 'Abdul Malek'], ['Phone', '01718-xxx-302'], ['Business', 'Wholesale vegetables, Shahjadpur bazar'], ['Check', 'Name on NID and license match']],
      hist: { who: 'new user', rows: [['Signed up', 'today'], ['Other accounts on this phone', 'none']] } },
    { id: 'v2', kind: 'Dealer', name: 'Rahman Agro', place: 'Gobindaganj, Gaibandha', when: 'today 7:40 AM', docs: ['NID · Mizanur Rahman', 'Trade license · "M. Rahim Store"'], blur: [], st: 'Waiting', info: [['Owner', 'Mizanur Rahman'], ['Phone', '01923-xxx-118'], ['Business', 'Vegetable shop, Gobindaganj'], ['Check', 'Name on license does NOT match NID']],
      hist: { who: 'new user', rows: [['Signed up', 'today'], ['Other accounts on this phone', 'none']] } },
    { id: 'v3', kind: 'Transporter', name: 'Padma Movers', place: 'Ullapara, Sirajganj', when: 'yesterday 6:05 PM', docs: ['NID · Shafiqul Islam', 'Driving license · DL-RJ-88231', 'Vehicle reg · Sirajganj-Ta 12-3390'], blur: [], st: 'Waiting', info: [['Owner', 'Shafiqul Islam'], ['Vehicle', 'Truck 3 t · Normal'], ['Districts', 'Sirajganj, Bogura, Dhaka']],
      hist: { who: 'new user', rows: [['Signed up', 'yesterday'], ['Vehicles', '1']] } },
    { id: 'v4', kind: 'Vehicle', name: 'Mintu Pickup · 2nd vehicle', place: 'Bogura Sadar, Bogura', when: 'today 9:55 AM', docs: ['Vehicle reg · Bogura-Tha 11-7788'], blur: [0], st: 'Waiting', info: [['Vehicle', 'Mini truck 1.5 t · Ventilated'], ['Provider', 'Mintu Pickup (verified since Aug)'], ['Check', 'Photo of the paper is blurry']],
      hist: { who: 'Mintu Pickup', rows: [['Rating', '4.5 (30)'], ['Trips', '30'], ['Failures', '0'], ['Reports', '0']] } }
  ];
  var verOpen = 'v1';
  function renderVerify(open) {
    if (open) verOpen = open;
    var groups = ['Dealer', 'Transporter', 'Vehicle'];
    $('#verList').innerHTML = groups.map(function (g) {
      return '<h5>' + g + 's</h5>' + VER.filter(function (v) { return v.kind === g; }).map(function (v) {
        var tag = v.st === 'Waiting' ? (lockedByOther(v.id) ? '<span class="tag gold">Locked</span>' : '<span class="tag plain">Waiting</span>') : '<span class="tag ' + (v.st === 'Approved' ? 'green' : v.st === 'Rejected' ? 'red' : 'gold') + '">' + v.st + '</span>';
        return '<button class="item' + (v.id === verOpen ? ' on' : '') + '" data-v="' + v.id + '"><b><span>' + v.name + '</span> ' + tag + '</b><span>' + v.place + ' · ' + v.when + '</span></button>';
      }).join('');
    }).join('');
    $$('#verList .item').forEach(function (b) { b.onclick = function () { takeLock(b.dataset.v); renderVerify(b.dataset.v); }; });
    var v = VER.filter(function (x) { return x.id === verOpen; })[0];
    var locked = lockedByOther(v.id), done = v.st !== 'Waiting';
    $('#verDetail').innerHTML = '<div class="case"><div>' +
      '<div class="dhead"><div class="ttl"><div><h2>' + v.name + '</h2><p class="muted">' + v.kind + ' · ' + v.place + ' · sent ' + v.when + '</p></div></div><div class="right">' + (done ? '<span class="tag">' + v.st + '</span>' : '') + '</div></div>' +
      (done ? '' : '<div class="sec">' + lockHtml(v.id) + '</div>') +
      '<div class="sec"><div class="grid g2">' + v.docs.map(function (d, i) { return '<div><div class="doc' + (v.blur.indexOf(i) >= 0 ? ' blur' : '') + '">' + d + '</div></div>'; }).join('') + '</div></div>' +
      '<div class="sec"><dl class="kv">' + v.info.map(function (r) { return '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>'; }).join('') + '</dl></div>' +
      (done ? '' : '<div class="sec"><div class="btns"><button class="btn slate" data-va="approve"' + (locked ? ' disabled' : '') + '>Approve</button><button class="btn ghost" data-va="reupload"' + (locked ? ' disabled' : '') + '>Ask for re-upload</button><button class="btn warn" data-va="reject"' + (locked ? ' disabled' : '') + '>Reject</button></div></div>') +
      '</div>' + histHtml(v.hist) + '</div>';
    $$('[data-va]').forEach(function (b) { b.onclick = function () { verAction(v, b.dataset.va); }; });
  }
  function verAction(v, a) {
    if (a === 'approve') { v.st = 'Approved'; log('Approved ' + v.kind.toLowerCase() + ' ' + v.name); toast(v.name + ' is verified and gets the Verified badge.'); renderVerify(); return; }
    var reasons = a === 'reupload' ? ['Blurry or unreadable photo', 'Document expired', 'Name does not match', 'Wrong document uploaded'] : ['Name on documents does not match', 'Fake or edited document', 'Business does not exist', 'Other'];
    modal((a === 'reupload' ? 'Ask for re-upload · ' : 'Reject · ') + v.name,
      '<div class="field"><label>Reason</label><select id="vr"><option value="">Choose</option>' + reasons.map(function (r) { return '<option>' + r + '</option>'; }).join('') + '</select></div><div class="field"><label>Message to the user <small>(optional)</small></label><textarea id="vm" rows="2"></textarea></div>' +
      (a === 'reupload' ? '<p class="small muted">The user keeps their account and only replaces the file. It comes back to this queue.</p>' : '<p class="small muted">The application is closed. The user can apply again with correct documents.</p>'),
      a === 'reupload' ? 'Send request' : 'Reject', function () {
        if (!need($('#vr'))) return false;
        v.st = a === 'reupload' ? 'Re-upload asked' : 'Rejected';
        log((a === 'reupload' ? 'Asked ' + v.name + ' to re-upload (' : 'Rejected ' + v.name + ' (') + $('#vr').value + ')');
        toast(a === 'reupload' ? 'Request sent. ' + v.name + ' is notified.' : v.name + ' is rejected and notified.');
        renderVerify();
      }, a === 'reject' ? 'warn' : 'slate');
  }

  /* =====================================================
     A3 DELIVERY FAILURES
  ===================================================== */
  var FAIL = [
    { id: 'f3', prod: 'Tomato · 900 kg', deal: 'FN-1052', where: 'Sherpur upazila, Bogura', reason: 'Breakdown (gearbox)', cond: 'Good', usable: '880 kg', moves: 'No', shelf: '3 days', urgency: 1, waited: 31 * 60, st: 'Waiting', farmer: 'Rokeya Begum (Gobindaganj, Gaibandha)', dealer: 'Kawran Bazar Agro (Dhaka)', tr: 'Swift Carriers',
      hist: { who: 'Swift Carriers', rows: [['Trips', '41'], ['Failures, 30 days', '3 (alert)'], ['Failures, all time', '5'], ['Rating', '3.9']], notes: ['28 Oct: breakdown, Gobindaganj (approved)', '6 Nov: flat tyre, Palashbari (approved)', '13 Nov: this request'] } },
    { id: 'f4', prod: 'Brinjal · 400 kg', deal: 'FN-1050B', where: 'Kahaloo upazila, Bogura', reason: 'Road blocked', cond: 'Good', usable: '400 kg', moves: 'Yes', shelf: '4 days', urgency: 2, waited: 6 * 60, st: 'Waiting', farmer: 'Delwar Hossain (Kahaloo, Bogura)', dealer: 'Joypurhat Fresh (Joypurhat)', tr: 'Rana Transport', photoNote: 'Photo shows an open road with traffic',
      hist: { who: 'Rana Transport', rows: [['Trips', '18'], ['Failures, 30 days', '1'], ['Reports', '1 (asked for extra money)'], ['Rating', '4.1']] } },
    { id: 'f1', prod: 'Cauliflower · 700 kg', deal: 'FN-1046', where: 'Shibganj upazila, Bogura', reason: 'Breakdown', cond: 'Good', usable: '700 kg', moves: 'Yes, slowly', shelf: '2 days', urgency: 0, st: 'Approved by Nusrat 10:24 AM (escalated)', farmer: 'Jalal Mia (Pirganj, Rangpur)', dealer: 'Dhaka buyer', tr: 'Cold Line BD',
      hist: { who: 'Cold Line BD', rows: [['Trips', '40'], ['Failures', '1'], ['Rating', '4.9']] } },
    { id: 'f2', prod: 'Green chili · 380 kg', deal: 'FN-1031', where: 'Ullapara upazila, Sirajganj', reason: 'Engine failure', cond: 'Good', usable: '380 kg', moves: 'No', shelf: '2 days', urgency: 0, st: 'Approved by Tanvir 10:02 AM', farmer: 'Karim Uddin (Bogura Sadar)', dealer: 'Kawran Bazar Agro (Dhaka)', tr: 'Dhaka Road Lines',
      hist: { who: 'Dhaka Road Lines', rows: [['Trips', '63'], ['Failures', '2'], ['Rating', '4.4']] } }
  ];
  var failOpen = 'f3';
  function renderFail(open) {
    if (open) failOpen = open;
    var wait = FAIL.filter(function (f) { return f.st === 'Waiting'; }).sort(function (a, b) { return a.urgency - b.urgency; });
    var done = FAIL.filter(function (f) { return f.st !== 'Waiting'; });
    function item(f) {
      var tag = f.st === 'Waiting' ? (f.waited >= 1800 ? '<span class="tag red">Escalated</span>' : '<span class="tag gold">Waiting</span>') : '<span class="tag ' + (/Reject/.test(f.st) ? 'plain' : 'green') + '">' + (/Reject/.test(f.st) ? 'Rejected' : 'Approved') + '</span>';
      return '<button class="item' + (f.id === failOpen ? ' on' : '') + '" data-f="' + f.id + '"><b><span>' + f.prod + '</span> ' + tag + '</b><span>' + f.where + ' · shelf life ' + f.shelf + '</span></button>';
    }
    $('#failList').innerHTML = '<h5>Waiting · most urgent first</h5>' + (wait.map(item).join('') || '<p class="small muted" style="padding:10px 16px">Nothing waiting.</p>') + '<h5>Decided today</h5>' + done.map(item).join('');
    $$('#failList .item').forEach(function (b) { b.onclick = function () { renderFail(b.dataset.f); }; });
    var f = FAIL.filter(function (x) { return x.id === failOpen; })[0], w = f.st === 'Waiting';
    $('#failDetail').innerHTML = '<div class="case"><div>' +
      '<div class="dhead"><div class="ttl"><div><h2>' + f.prod + '</h2><p class="muted">Deal ' + f.deal + ' · transporter ' + f.tr + '</p></div></div><div class="right">' +
      (w ? (f.waited >= 1800 ? '<span class="esc">Escalated · waiting <span data-cd="' + f.waited + '">' + Math.floor(f.waited / 60) + ' min</span></span>' : '<span class="small muted">Waiting <span data-cd="' + f.waited + '">' + Math.floor(f.waited / 60) + ' min</span> · escalates at 30 min</span>') : '<span class="tag green">' + f.st + '</span>') + '</div></div>' +
      (w ? '<div class="sec"><span class="lock">Being handled by you · releases after 15 min idle</span></div>' : '') +
      '<div class="sec"><div class="grid g2"><div class="doc">Driver\'s photo' + (f.photoNote ? '<br>(' + f.photoNote + ')' : '') + '</div><dl class="kv" style="grid-template-columns:120px 1fr">' +
      [['Stuck at', '<b>' + f.where + '</b>'], ['Reason', f.reason], ['Condition', f.cond], ['Usable', f.usable], ['Vehicle can move', f.moves], ['Shelf life left', f.shelf + ' (added by the system)'], ['Farmer', f.farmer], ['Dealer', f.dealer]].map(function (r) { return '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>'; }).join('') + '</dl></div></div>' +
      (w ? '<div class="sec"><div class="note">If you approve: the original deal is marked "Failed: released for emergency sale", the dealer is told, and the farmer starts an emergency sale. Dealers are told closest first: ' + f.where.split(', ')[0] + ' first, the whole of ' + f.where.split(', ')[1] + ' after 1 hour without a bid, then neighbouring districts. The pickup point is the vehicle\'s location in ' + f.where.split(' upazila')[0] + '.</div><div class="btns" style="margin-top:12px"><button class="btn slate" data-fa="ok">Approve</button><button class="btn warn" data-fa="no">Reject</button></div></div>' : '') +
      '</div>' + histHtml(f.hist) + '</div>';
    $$('[data-fa]').forEach(function (b) {
      b.onclick = function () {
        if (b.dataset.fa === 'ok') { f.st = 'Approved by ' + me.short + ' just now'; log('Approved delivery failure ' + f.deal + ' · ' + f.prod + ' at ' + f.where); toast('Approved. ' + f.farmer.split(' (')[0] + ' is notified to start the emergency sale.'); renderFail(); return; }
        modal('Reject failure report · ' + f.deal, '<div class="field"><label>Reason (sent to the driver)</label><select id="fr"><option value="">Choose</option><option>Photo does not show the problem</option><option>Location does not match GPS</option><option>Problem can be fixed on the spot</option><option>Other</option></select></div><p class="small muted">The trip goes back to In transit and the driver continues.</p>', 'Reject', function () {
          if (!need($('#fr'))) return false; f.st = 'Rejected by ' + me.short; log('Rejected delivery failure ' + f.deal + ' (' + $('#fr').value + ')'); toast('Rejected. The trip is back to In transit.'); renderFail();
        }, 'warn');
      };
    });
  }

  /* =====================================================
     A4 CASES
  ===================================================== */
  var CASES = {
    cancel: [
      { id: 'c1', title: 'Rangpur Mart wants to cancel FN-1045', sub: 'Brinjal 600 kg · transport booked (Bogura Logistics)', group: 'After transport was booked', body: '<p><b>Their description:</b> "A fire in our warehouse last night. We have no place to keep the produce." Photo attached.</p>', who: 'Rangpur Mart', hist: { who: 'Rangpur Mart', rows: [['Deals', '64'], ['Cancellations, 30 days', '0'], ['Reports', '0'], ['Rating', '4.8']] }, actions: ['Approve cancellation', 'Reject'] },
      { id: 'c2', title: 'Nabil Fresh wants to cancel FN-1039', sub: 'Potato 1,500 kg · transport booked (Mintu Pickup)', group: 'After transport was booked', body: '<p><b>Their description:</b> "The price now seems too high compared to the market."</p>', who: 'Nabil Fresh', hist: { who: 'Nabil Fresh', rows: [['Deals', '12'], ['Cancellations, 30 days', '1'], ['Reports', '0']] }, actions: ['Approve cancellation', 'Reject'] }
    ],
    reports: [
      { id: 'r1', title: 'Karim Uddin reported Hasan Traders', sub: 'Cancelled without a valid reason · FN-1033', group: 'Cancelled without a valid reason', body: '<div class="note">Attached automatically: FN-1033 · Potato 600 kg · ৳21/kg · cancelled 11 Nov 6:40 PM · dealer\'s reason: "Changed plans".</div><p class="small" style="margin-top:8px"><b>Automatic alert:</b> Hasan Traders cancelled 3 deals in 30 days.</p>', who: 'Hasan Traders', hist: { who: 'Hasan Traders', rows: [['Deals', '41'], ['Cancellations, 30 days', '3 (alert)'], ['Reports before', '0'], ['Rating', '4.7']], notes: ['First report against this dealer'] }, actions: ['Warn', 'Suspend or ban', 'Dismiss'], active: 'FN-1047 (tomato, choosing transport)' },
      { id: 'r2', title: '4 reports against Bhuiyan Traders', sub: 'Asked for a lower price after the deal (2) · Did not receive the product (2)', group: 'Asked for a lower price after the deal', body: '<p>Reported by Selina Begum, Abdul Kader, Delwar Hossain and Bogura Logistics in the last 3 weeks. All four are linked to completed or failed deals.</p>', who: 'Bhuiyan Traders', hist: { who: 'Bhuiyan Traders', rows: [['Deals', '22'], ['Cancellations, 30 days', '2'], ['Reports, 30 days', '4'], ['Warnings', '1 (20 Oct)'], ['Rating', '3.1']] }, actions: ['Warn', 'Suspend or ban', 'Dismiss'], active: 'FN-1044 (potato, in transit)' },
      { id: 'r3', title: 'Joypurhat Fresh reported Bablu Mia (farmer)', sub: 'Cancelled without a valid reason · FN-1037', group: 'Cancelled without a valid reason', body: '<div class="note">Attached automatically: FN-1037 · Cauliflower 300 kg · cancelled before transport · farmer\'s reason: "Sold at local bazar".</div><p class="small" style="margin-top:8px"><b>Automatic alert:</b> Bablu Mia cancelled 3 deals in 30 days.</p>', who: 'Bablu Mia', hist: { who: 'Bablu Mia', rows: [['Deals', '9'], ['Cancellations, 30 days', '3 (alert)'], ['Reports before', '0']] }, actions: ['Warn', 'Suspend or ban', 'Dismiss'], active: '' }
    ],
    reviews: [
      { id: 'w1', title: 'Bogura Logistics reported a review', sub: 'Jalal Mia · 2 stars · "Driver asked for extra money"', group: 'Fake review', body: '<p>The trip FN-0978 happened (12 Oct, both codes entered). No proof the review is false.</p>', who: 'Jalal Mia', hist: { who: 'Jalal Mia', rows: [['Reviews written', '14'], ['Reviews hidden before', '0'], ['Rating', '4.5']] }, actions: ['Keep review', 'Hide review'] }
    ]
  };
  var caseTab = 'cancel', caseOpen = 'c1';
  function openCaseTab(t) { caseTab = t; caseOpen = CASES[t][0].id; $$('#caseTabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.t === t); }); renderCases(); }
  $$('#caseTabs button').forEach(function (b) { b.onclick = function () { openCaseTab(b.dataset.t); }; });
  function renderCases() {
    var list = CASES[caseTab], groups = [];
    list.forEach(function (c) { if (groups.indexOf(c.group) < 0) groups.push(c.group); });
    $('#caseList').innerHTML = groups.map(function (g) {
      return '<h5>' + g + '</h5>' + list.filter(function (c) { return c.group === g; }).map(function (c) {
        return '<button class="item' + (c.id === caseOpen ? ' on' : '') + '" data-c="' + c.id + '"><b><span>' + c.title + '</span>' + (c.done ? ' <span class="tag plain">' + c.done + '</span>' : '') + '</b><span>' + c.sub + '</span></button>';
      }).join('');
    }).join('');
    $$('#caseList .item').forEach(function (b) { b.onclick = function () { caseOpen = b.dataset.c; renderCases(); }; });
    var c = list.filter(function (x) { return x.id === caseOpen; })[0];
    $('#caseDetail').innerHTML = '<div class="case"><div><div class="dhead"><div class="ttl"><div><h2>' + c.title + '</h2><p class="muted">' + c.sub + '</p></div></div></div>' +
      (c.done ? '' : '<div class="sec"><span class="lock">Being handled by you · releases after 15 min idle</span></div>') +
      '<div class="sec">' + c.body + '</div>' +
      (c.done ? '<div class="sec"><span class="tag green">' + c.done + '</span></div>' : '<div class="sec"><div class="btns">' + c.actions.map(function (a, i) { return '<button class="btn ' + (i === 0 ? 'slate' : (/Reject|Suspend|Hide/.test(a) ? 'warn' : 'ghost')) + '" data-ca="' + a + '">' + a + '</button>'; }).join('') + '</div></div>') +
      '</div>' + histHtml(c.hist) + '</div>';
    $$('[data-ca]').forEach(function (b) { b.onclick = function () { caseAction(c, b.dataset.ca); }; });
  }
  function caseAction(c, a) {
    function finish(label, msg) { c.done = label; log(label + ' · ' + c.title); toast(msg); renderCases(); }
    if (a === 'Suspend or ban') return suspendModal(c.who, c.active, function (label) { finish(label, c.who + ': ' + label.toLowerCase() + '. They are notified with your reason.'); });
    if (a === 'Warn' || a === 'Reject' || a === 'Dismiss') {
      return modal(a + ' · ' + c.who, '<div class="field"><label>Written reason ' + (a === 'Dismiss' ? '<small>(optional)</small>' : '(required)') + '</label><textarea id="cr" rows="3"></textarea></div>', a, function () {
        if (a !== 'Dismiss' && !need($('#cr'))) return false;
        finish(a === 'Warn' ? 'Warned' : a === 'Reject' ? 'Request rejected' : 'Dismissed', a === 'Warn' ? c.who + ' received a warning.' : a === 'Reject' ? 'Rejected. The deal continues.' : 'Report dismissed.');
      }, a === 'Dismiss' ? 'slate' : 'warn');
    }
    if (a === 'Approve cancellation') return finish('Cancellation approved', 'Approved. The farmer and the transporter are notified, the vehicle is free and the farmer can relist in one click.');
    if (a === 'Keep review') return finish('Review kept', 'The review stays visible.');
    if (a === 'Hide review') return finish('Review hidden', 'The review is hidden from the profile.');
  }
  function suspendModal(who, active, done) {
    modal('Suspend or ban · ' + who,
      '<div class="field"><label>Type</label><div class="checks"><label><input type="radio" name="sx" value="Suspended 7 days" checked> Suspend 7 days</label><label><input type="radio" name="sx" value="Suspended 30 days"> Suspend 30 days</label><label><input type="radio" name="sx" value="Banned"> Permanent ban</label></div></div>' +
      '<div class="field"><label>Written reason (required, the user sees it)</label><textarea id="sr" rows="3"></textarea></div>' +
      '<div class="note" style="margin-bottom:8px">While suspended they cannot create listings, bids, offers or trips.' + (active ? ' <b>Deal in progress: ' + active + '</b> continues to completion so the other side is not punished.<br><label style="display:inline-flex;gap:6px;margin-top:6px"><input type="checkbox" id="sCancel"> Cancel this deal too</label>' : '') + '</div>' +
      '<p class="small muted">Only the Super Admin can lift a ban.</p>', 'Confirm', function () {
        if (!need($('#sr'))) return false;
        done($('input[name=sx]:checked').value + ($('#sCancel') && $('#sCancel').checked ? ' · deal cancelled' : ''));
      }, 'warn');
  }

  /* =====================================================
     GEO + ANALYTICS DATA
  ===================================================== */
  var P = [
    { k: 'potato', n: 'Potato', bn: 'আলু', c: '#2a78d6', s: [.5, .9, 1.6, 1.8, 1.2, .9, .7, .6, .6, .6, .6, .7], p0: 27, p1: 21, cat: 'Vegetable', life: 60, store: 'Normal', co: 'seed potato, cold storage and late-blight fungicide' },
    { k: 'tomato', n: 'Tomato', bn: 'টমেটো', c: '#eb6834', s: [1.4, 1.6, 1.4, .9, .4, .2, .1, .1, .15, .3, .7, 1.2], p0: 64, p1: 27, cat: 'Vegetable', life: 7, store: 'Normal (ventilated for long trips)', co: 'hybrid tomato seed, staking material and fruit-borer control' },
    { k: 'cauli', n: 'Cauliflower', bn: 'ফুলকপি', c: '#1baf7a', s: [1.6, 1.5, 1, .4, .15, .1, .05, .05, .1, .3, .9, 1.4], p0: 58, p1: 30, cat: 'Vegetable', life: 6, store: 'Ventilated for long trips', co: 'hybrid cauliflower seed and boron fertiliser' },
    { k: 'brinjal', n: 'Brinjal', bn: 'বেগুন', c: '#eda100', s: [1, 1, .9, .8, .8, .9, 1, 1, 1, 1, 1, 1], p0: 42, p1: 31, cat: 'Vegetable', life: 5, store: 'Normal', co: 'shoot-and-fruit-borer control and Bt brinjal seed' },
    { k: 'chili', n: 'Green chili', bn: 'কাঁচা মরিচ', c: '#e87ba4', s: [.8, .7, .8, 1, 1.1, 1.2, 1.3, 1.2, 1, .9, .8, .8], p0: 92, p1: 58, cat: 'Vegetable', life: 5, store: 'Ventilated for long trips', co: 'chili seed, mite control and drying equipment' },
    { k: 'lalshak', n: 'Lal shak', bn: 'লাল শাক', c: '#008300', s: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, .4, 1], p0: 26, p1: 24, cat: 'Vegetable', life: 2, store: 'Normal', co: 'fast-growing leafy seed and organic fertiliser', isNew: 1 }
  ];
  var PK = {}; P.forEach(function (p, i) { PK[p.k] = i; });
  var MONTHS = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
  // upazila: [name, district, primary, secondary, farmers]
  var U = [
    ['Bogura Sadar', 'Bogura', 'tomato', 'cauli', 140], ['Shibganj', 'Bogura', 'potato', 'brinjal', 120], ['Sherpur', 'Bogura', 'brinjal', 'chili', 95], ['Shajahanpur', 'Bogura', 'tomato', 'cauli', 70],
    ['Gabtali', 'Bogura', 'chili', 'brinjal', 66], ['Kahaloo', 'Bogura', 'potato', 'tomato', 88], ['Nandigram', 'Bogura', 'potato', 'brinjal', 60], ['Dhunat', 'Bogura', 'cauli', 'brinjal', 52],
    ['Sonatala', 'Bogura', 'chili', 'potato', 48], ['Sariakandi', 'Bogura', 'chili', 'brinjal', 74], ['Adamdighi', 'Bogura', 'potato', 'tomato', 58], ['Dhupchanchia', 'Bogura', 'potato', 'cauli', 50],
    ['Gaibandha Sadar', 'Gaibandha', 'tomato', 'brinjal', 90], ['Gobindaganj', 'Gaibandha', 'potato', 'tomato', 110], ['Palashbari', 'Gaibandha', 'tomato', 'potato', 62], ['Sadullapur', 'Gaibandha', 'chili', 'brinjal', 44],
    ['Saghata', 'Gaibandha', 'brinjal', 'chili', 46], ['Sundarganj', 'Gaibandha', 'chili', 'potato', 58], ['Phulchhari', 'Gaibandha', 'chili', 'brinjal', 30],
    ['Joypurhat Sadar', 'Joypurhat', 'tomato', 'potato', 64], ['Panchbibi', 'Joypurhat', 'potato', 'brinjal', 92], ['Akkelpur', 'Joypurhat', 'potato', 'cauli', 50], ['Kalai', 'Joypurhat', 'potato', 'tomato', 66], ['Khetlal', 'Joypurhat', 'potato', 'brinjal', 40],
    ['Rangpur Sadar', 'Rangpur', 'cauli', 'tomato', 80], ['Pirganj', 'Rangpur', 'potato', 'brinjal', 96], ['Mithapukur', 'Rangpur', 'potato', 'tomato', 78], ['Badarganj', 'Rangpur', 'potato', 'cauli', 60],
    ['Gangachara', 'Rangpur', 'tomato', 'chili', 52], ['Kaunia', 'Rangpur', 'cauli', 'brinjal', 44], ['Pirgachha', 'Rangpur', 'brinjal', 'potato', 50], ['Taraganj', 'Rangpur', 'chili', 'potato', 36],
    ['Sirajganj Sadar', 'Sirajganj', 'cauli', 'brinjal', 70], ['Ullapara', 'Sirajganj', 'chili', 'potato', 84], ['Shahjadpur', 'Sirajganj', 'brinjal', 'chili', 76], ['Belkuchi', 'Sirajganj', 'brinjal', 'tomato', 48],
    ['Raiganj', 'Sirajganj', 'potato', 'brinjal', 56], ['Tarash', 'Sirajganj', 'chili', 'potato', 40], ['Kazipur', 'Sirajganj', 'chili', 'brinjal', 46], ['Chauhali', 'Sirajganj', 'chili', 'cauli', 28], ['Kamarkhanda', 'Sirajganj', 'tomato', 'brinjal', 34]
  ];
  var DISTS = ['Bogura', 'Gaibandha', 'Joypurhat', 'Rangpur', 'Sirajganj'];
  var DOFF = { Bogura: 0, Gaibandha: -.04, Joypurhat: -.02, Rangpur: -.05, Sirajganj: .03 };
  var LALSHAK = { 'Bogura Sadar': .5, Shibganj: .4, Sherpur: .35, Gabtali: .3, Kahaloo: .25 };
  function h(str) { var x = 2166136261; for (var i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 16777619); } return ((x >>> 0) % 1000) / 1000; }
  function aff(u, k) { if (k === 'lalshak') return LALSHAK[u[0]] || .06; return u[2] === k ? 1 : u[3] === k ? .55 : .12; }
  function vol(u, pi, m) { var p = P[pi]; return 34 * aff(u, p.k) * p.s[m] * (.82 + .36 * h(u[0] + p.k + m)) * (u[4] / 75); } // tonnes
  var WEEKS = []; (function () { var d = new Date(2026, 10, 13); for (var i = 11; i >= 0; i--) { var x = new Date(d - i * 7 * 864e5); WEEKS.push(x.getDate() + ' ' + x.toLocaleString('en', { month: 'short' })); } })();
  function price(pi, w, d, uname) {
    var p = P[pi], t = w / 11, base = p.p0 + (p.p1 - p.p0) * (1 - Math.pow(1 - t, 1.6));
    base *= 1 + .05 * Math.sin(w * 1.3 + pi) + (h(p.k + w) - .5) * .06;
    if (d) base *= 1 + DOFF[d];
    if (uname) base *= 1 + (h(uname + p.k) - .5) * .08;
    return Math.round(base * 10) / 10;
  }
  var SAVED = [620, 540, 410, 380, 700, 1150, 1480, 1320, 990, 760, 1240, 1460];
  var FARMERS = [
    ['Karim Uddin', 'Bogura Sadar', ['tomato', 'potato', 'chili', 'brinjal'], 1], ['Selina Begum', 'Gaibandha Sadar', ['tomato', 'potato', 'chili', 'brinjal'], 1], ['Jalal Mia', 'Pirganj', ['potato', 'cauli'], 1],
    ['Abdul Kader', 'Sherpur', ['brinjal', 'cauli'], 1], ['Nasima Khatun', 'Panchbibi', ['potato'], 1], ['Rahim Sheikh', 'Shibganj', ['potato', 'brinjal'], 1], ['Fatema Akter', 'Shibganj', ['potato', 'lalshak'], 0],
    ['Mofizul Islam', 'Kahaloo', ['potato', 'tomato'], 1], ['Shahana Parvin', 'Gabtali', ['chili', 'lalshak'], 1], ['Habibur Rahman', 'Gobindaganj', ['potato', 'tomato'], 1], ['Rokeya Begum', 'Gobindaganj', ['tomato'], 0],
    ['Anwar Hossain', 'Sariakandi', ['chili'], 1], ['Sufia Khatun', 'Ullapara', ['chili', 'potato'], 1], ['Delwar Hossain', 'Kahaloo', ['brinjal', 'potato'], 0], ['Monowara Begum', 'Shahjadpur', ['brinjal', 'chili'], 1],
    ['Nurul Amin', 'Mithapukur', ['potato'], 1], ['Jahanara Begum', 'Rangpur Sadar', ['cauli', 'tomato'], 1], ['Kamrul Hasan', 'Kalai', ['potato', 'tomato'], 0], ['Azizul Haque', 'Dhunat', ['cauli'], 1],
    ['Rina Akter', 'Bogura Sadar', ['tomato', 'cauli', 'lalshak'], 1], ['Sohel Rana', 'Palashbari', ['tomato'], 1], ['Bablu Mia', 'Kahaloo', ['cauli', 'potato'], 0], ['Taslima Begum', 'Saghata', ['brinjal'], 1],
    ['Harunur Rashid', 'Sirajganj Sadar', ['cauli'], 0], ['Mostafa Kamal', 'Akkelpur', ['potato'], 1], ['Shirin Akter', 'Sundarganj', ['chili'], 1], ['Lutfor Rahman', 'Badarganj', ['potato', 'cauli'], 1], ['Rubina Khatun', 'Gangachara', ['tomato', 'chili'], 0]
  ];
  var UBY = {}; U.forEach(function (u) { UBY[u[0]] = u; });
  var BUYERS = ['Dhaka', 'Bogura', 'Rangpur', 'Chattogram', 'Gaibandha', 'Sirajganj'];

  /* ---------- filters ---------- */
  var F = { per: 3, dis: '', upa: '', pro: '' }, priceSel = null;
  function months() { return F.per === 1 ? [11] : F.per === 3 ? [9, 10, 11] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]; }
  function inArea(u) { return (!F.dis || u[1] === F.dis) && (!F.upa || u[0] === F.upa); }
  function areaName() { return F.upa ? F.upa + ' upazila' : F.dis ? F.dis + ' district' : 'all 5 districts'; }
  function fillSel(sel, list, all) { sel.innerHTML = '<option value="">' + all + '</option>' + list.map(function (x) { return '<option>' + x + '</option>'; }).join(''); }
  function upasOf(d) { return U.filter(function (u) { return !d || u[1] === d; }).map(function (u) { return u[0]; }); }
  function syncFilters() {
    $('#fPer').value = String(F.per); $('#fDis').value = F.dis;
    fillSel($('#fUpa'), upasOf(F.dis), F.dis ? 'All upazilas in ' + F.dis : 'All upazilas'); $('#fUpa').value = F.upa;
    $('#fPro').value = F.pro;
  }
  fillSel($('#fDis'), DISTS, 'All districts'); fillSel($('#fPro'), P.map(function (p) { return p.n; }), 'All products');
  $$('#fPro option').forEach(function (o, i) { if (i) o.value = P[i - 1].k; });
  $('#fPer').onchange = function () { F.per = +this.value; renderAnalytics(); };
  $('#fDis').onchange = function () { F.dis = this.value; F.upa = ''; renderAnalytics(); };
  $('#fUpa').onchange = function () { F.upa = this.value; if (F.upa) F.dis = UBY[F.upa][1]; renderAnalytics(); };
  $('#fPro').onchange = function () { F.pro = this.value; priceSel = null; renderAnalytics(); };
  $('#fReset').onclick = function () { F = { per: 3, dis: '', upa: '', pro: '' }; priceSel = null; renderAnalytics(); };

  function sumVol(filterU, pi) { var t = 0; U.forEach(function (u) { if (filterU(u)) months().forEach(function (m) { t += vol(u, pi, m); }); }); return t; }
  function areaProducts() { return P.map(function (p, i) { return { i: i, t: sumVol(inArea, i) }; }); }
  function avgPrice(pi) { return price(pi, 11, F.dis, F.upa); }

  /* ---------- SVG helpers ---------- */
  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, parent) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function txt(parent, x, y, s, attrs) { var t = el('text', Object.assign({ x: x, y: y }, attrs || {}), parent); t.textContent = s; return t; }
  function barPath(x, y, w, hgt, r, dir) { // rounded data-end only; dir 'right' or 'up'
    r = Math.min(r, dir === 'right' ? w : hgt, dir === 'right' ? hgt / 2 : w / 2);
    if (dir === 'right') return 'M' + x + ',' + y + 'h' + (w - r) + 'a' + r + ',' + r + ' 0 0 1 ' + r + ',' + r + 'v' + (hgt - 2 * r) + 'a' + r + ',' + r + ' 0 0 1 -' + r + ',' + r + 'h-' + (w - r) + 'z';
    return 'M' + x + ',' + (y + hgt) + 'v-' + (hgt - r) + 'a' + r + ',' + r + ' 0 0 1 ' + r + ',-' + r + 'h' + (w - 2 * r) + 'a' + r + ',' + r + ' 0 0 1 ' + r + ',' + r + 'v' + (hgt - r) + 'z';
  }
  var RAMP = ['#f3f7fd', '#cde2fb', '#b7d3f6', '#9ec5f4', '#86b6ef', '#6da7ec', '#5598e7', '#3987e5', '#2a78d6', '#256abf', '#1c5cab', '#184f95', '#104281'];
  function rampColor(v, max) { if (v <= 0.05) return RAMP[0]; var i = 1 + Math.min(11, Math.floor(Math.sqrt(v / max) * 12)); return RAMP[i]; }

  /* ---------- KPIs ---------- */
  function renderKpis(ap) {
    var sel = F.pro ? [PK[F.pro]] : ap.map(function (a) { return a.i; });
    var tons = 0, val = 0; sel.forEach(function (i) { tons += ap[i].t; val += ap[i].t * 1000 * avgPrice(i); });
    var farmers = 0; U.forEach(function (u) { if (inArea(u)) farmers += u[4]; }); if (F.pro) farmers = Math.round(farmers * .45);
    var savedK = months().reduce(function (s, m) { return s + SAVED[m]; }, 0);
    var k = $('#kpis'); k.style.gridTemplateColumns = 'repeat(5,1fr)';
    k.innerHTML = '<div><span>Sold</span><b class="num">' + fmt(tons) + ' t</b><small>' + (F.pro ? P[PK[F.pro]].n : 'all products') + ' · ' + areaName() + '</small></div>' +
      '<div><span>Trade value</span><b class="num">৳' + (val / 1e7).toFixed(2) + ' cr</b><small>deal value, before transport</small></div>' +
      '<div><span>Farmers selling</span><b class="num">' + fmt(farmers) + '</b><small>active in this period</small></div>' +
      '<div><span>Price now</span><b class="num">' + (F.pro ? '৳' + avgPrice(PK[F.pro]).toFixed(1) : '—') + '</b><small>' + (F.pro ? 'per kg, week of 13 Nov' : 'choose a product to see price') + '</small></div>' +
      '<div><span>Saved by emergency sales</span><b class="num">' + fmt(savedK) + ' kg</b><small>platform-wide in this period</small></div>';
  }

  /* ---------- heatmap: area × product ---------- */
  function renderHeat() {
    var rows = F.dis ? U.filter(function (u) { return u[1] === F.dis; }).map(function (u) { return { n: u[0], f: function (x) { return x[0] === u[0]; }, upa: 1 }; })
      : DISTS.map(function (d) { return { n: d, f: function (x) { return x[1] === d; } }; });
    $('#hmTitle').textContent = 'Where each product sells · ' + (F.dis ? 'upazilas of ' + F.dis : 'by district');
    var M = rows.map(function (r) { return P.map(function (p, i) { return sumVol(r.f, i); }); });
    var max = Math.max.apply(null, M.map(function (r) { return Math.max.apply(null, r); }));
    var html = '<table class="hm"><tr><th>' + (F.dis ? 'Upazila' : 'District') + '</th>' + P.map(function (p) { return '<th' + (F.pro === p.k ? ' style="color:var(--text-primary)"' : '') + '>' + p.n + '</th>'; }).join('') + '</tr>';
    rows.forEach(function (r, ri) {
      var tot = M[ri].reduce(function (a, b) { return a + b; }, 0);
      html += '<tr><td class="rowl" data-row="' + r.n + '" data-upa="' + (r.upa ? 1 : '') + '"' + (F.upa === r.n ? ' style="font-weight:600;color:var(--slate)"' : '') + '>' + r.n + '</td>' + M[ri].map(function (v, ci) {
        var bg = rampColor(v, max), dark = RAMP.indexOf(bg) >= 7;
        return '<td class="cell" style="background:' + bg + ';color:' + (dark ? '#fff' : 'var(--text-primary)') + (F.pro && F.pro !== P[ci].k ? ';opacity:.35' : '') + '" data-tip="<b>' + r.n + ' · ' + P[ci].n + '</b><br>' + fmt(v) + ' t sold · ' + Math.round(100 * v / tot) + '% of ' + r.n + '\'s sales" data-row="' + r.n + '" data-upa="' + (r.upa ? 1 : '') + '">' + (v >= 1 ? fmt(v) : '·') + '</td>';
      }).join('') + '</tr>';
    });
    $('#heat').innerHTML = html + '</table>';
    $$('#heat [data-row]').forEach(function (c) {
      c.onclick = function () { if (c.dataset.upa) { F.upa = c.dataset.row; } else { F.dis = c.dataset.row; F.upa = ''; } renderAnalytics(); };
      if (c.dataset.tip) { c.onmousemove = function (e) { showTip(c.dataset.tip, e); }; c.onmouseleave = hideTip; }
    });
  }

  /* ---------- top products (horizontal bars) ---------- */
  function renderTop(ap) {
    var rows = ap.slice().filter(function (a) { return a.t > .5; }).sort(function (a, b) { return b.t - a.t; });
    var tot = rows.reduce(function (s, a) { return s + a.t; }, 0), max = rows[0] ? rows[0].t : 1;
    $('#topTitle').textContent = 'Top products in ' + areaName();
    var W = 520, rowH = 30, L = 96, R = 104, H = rows.length * rowH + 6;
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Top products' });
    el('line', { x1: L, x2: L, y1: 0, y2: H, stroke: '#cfcdc4', 'stroke-width': 1 }, svg);
    rows.forEach(function (a, i) {
      var p = P[a.i], y = i * rowH + 6, w = Math.max(2, (W - L - R) * a.t / max);
      txt(svg, L - 10, y + 13, p.n, { 'text-anchor': 'end', class: F.pro === p.k ? 'lbl-strong' : '' });
      var bar = el('path', { d: barPath(L, y, w, 18, 4, 'right'), fill: p.c, opacity: F.pro && F.pro !== p.k ? .35 : 1 }, svg);
      txt(svg, L + w + 8, y + 13, fmt(a.t) + ' t · ' + Math.round(100 * a.t / tot) + '%', {});
      var hit = el('rect', { x: 0, y: y - 4, width: W, height: rowH, fill: 'transparent' }, svg);
      hit.onmousemove = function (e) { showTip('<b>' + p.n + '</b> in ' + areaName() + '<br>' + fmt(a.t) + ' t · ' + Math.round(100 * a.t / tot) + '% of sales<br>Price now ৳' + avgPrice(a.i).toFixed(1) + '/kg', e); };
      hit.onmouseleave = hideTip;
      hit.onclick = function () { F.pro = p.k; priceSel = null; renderAnalytics(); };
    });
    $('#topBars').innerHTML = ''; $('#topBars').appendChild(svg);
    if (rows[0]) $('#topNote').innerHTML = '<b>' + P[rows[0].i].n + '</b> is ' + Math.round(100 * rows[0].t / tot) + '% of everything sold in ' + areaName() + '. Click a bar to focus on that product.';
  }

  /* ---------- price line ---------- */
  function renderPrice(ap) {
    if (!priceSel) priceSel = F.pro ? [PK[F.pro]] : ap.slice().sort(function (a, b) { return b.t - a.t; }).slice(0, 3).map(function (a) { return a.i; });
    $('#priceTitle').innerHTML = 'Price ups and downs · ' + areaName() + ' <small>Average deal price, ৳ per kg, by week. Pick up to 4 products.</small>';
    $('#priceChips').innerHTML = P.map(function (p, i) { return '<label><input type="checkbox" value="' + i + '"' + (priceSel.indexOf(i) >= 0 ? ' checked' : '') + '><i style="background:' + p.c + '"></i>' + p.n + '</label>'; }).join('');
    $$('#priceChips input').forEach(function (c) {
      c.onchange = function () {
        var i = +c.value;
        if (c.checked) { if (priceSel.length >= 4) { c.checked = false; toast('Up to 4 products at once keeps the chart readable.'); return; } priceSel.push(i); }
        else priceSel = priceSel.filter(function (x) { return x !== i; });
        renderPrice(ap);
      };
    });
    var series = priceSel.slice().sort(function (a, b) { return a - b; }).map(function (i) { return { i: i, v: WEEKS.map(function (w, wi) { return price(i, wi, F.dis, F.upa); }) }; });
    var W = 1000, H = 280, L = 44, R = 110, T = 12, B = 30;
    var all = []; series.forEach(function (s) { all = all.concat(s.v); });
    var ymax = all.length ? Math.ceil(Math.max.apply(null, all) / 20) * 20 : 100, ymin = 0;
    var X = function (wi) { return L + (W - L - R) * wi / 11; }, Y = function (v) { return T + (H - T - B) * (1 - (v - ymin) / (ymax - ymin)); };
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Weekly price trend' });
    for (var g = 0; g <= ymax; g += ymax > 100 ? 40 : 20) { el('line', { x1: L, x2: W - R, y1: Y(g), y2: Y(g), stroke: 'var(--grid)', 'stroke-width': 1 }, svg); txt(svg, L - 8, Y(g) + 4, '৳' + g, { 'text-anchor': 'end' }); }
    WEEKS.forEach(function (w, wi) { if (wi % 2 === 1 || wi === 11) txt(svg, X(wi), H - 8, w, { 'text-anchor': 'middle' }); });
    var labels = [];
    series.forEach(function (s) {
      var p = P[s.i];
      el('path', { d: s.v.map(function (v, wi) { return (wi ? 'L' : 'M') + X(wi) + ',' + Y(v); }).join(''), fill: 'none', stroke: p.c, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
      labels.push({ y: Y(s.v[11]), t: p.n + ' ৳' + s.v[11], c: p.c });
    });
    labels.sort(function (a, b) { return a.y - b.y; }); for (var li = 1; li < labels.length; li++) if (labels[li].y - labels[li - 1].y < 14) labels[li].y = labels[li - 1].y + 14;
    labels.forEach(function (l) { el('circle', { cx: W - R + 8, cy: l.y - 4, r: 4, fill: l.c }, svg); txt(svg, W - R + 16, l.y, l.t, { class: 'lbl-strong' }); });
    var cross = el('line', { y1: T, y2: H - B, stroke: '#8a8a80', 'stroke-width': 1, opacity: 0 }, svg);
    var dots = series.map(function (s) { return el('circle', { r: 5, fill: P[s.i].c, stroke: 'var(--surface-1)', 'stroke-width': 2, opacity: 0 }, svg); });
    var hit = el('rect', { x: L, y: T, width: W - L - R, height: H - T - B, fill: 'transparent' }, svg);
    hit.onmousemove = function (e) {
      var r = svg.getBoundingClientRect(), x = (e.clientX - r.left) * W / r.width, wi = Math.max(0, Math.min(11, Math.round((x - L) / ((W - L - R) / 11))));
      cross.setAttribute('x1', X(wi)); cross.setAttribute('x2', X(wi)); cross.setAttribute('opacity', 1);
      series.forEach(function (s, k) { dots[k].setAttribute('cx', X(wi)); dots[k].setAttribute('cy', Y(s.v[wi])); dots[k].setAttribute('opacity', 1); });
      showTip('<b>Week of ' + WEEKS[wi] + '</b><br>' + series.map(function (s) { var ch = wi ? s.v[wi] - s.v[wi - 1] : 0; return P[s.i].n + ': ৳' + s.v[wi] + '/kg' + (wi ? ' (' + (ch >= 0 ? '+' : '') + ch.toFixed(1) + ')' : ''); }).join('<br>'), e);
    };
    hit.onmouseleave = function () { cross.setAttribute('opacity', 0); dots.forEach(function (d) { d.setAttribute('opacity', 0); }); hideTip(); };
    $('#priceLine').innerHTML = ''; $('#priceLine').appendChild(svg);
  }

  /* ---------- farmers by quantity ---------- */
  function farmerKg(f) {
    var u = UBY[f[1]]; if (!u) return 0;
    var crops = F.pro ? f[2].filter(function (k) { return k === F.pro; }) : f[2];
    var t = 0; crops.forEach(function (k) { months().forEach(function (m) { t += vol(u, PK[k], m) * 1000 / u[4] * (1.6 + 2.4 * h(f[0] + k)); }); });
    return t;
  }
  function renderFarmers() {
    var rows = FARMERS.filter(function (f) { var u = UBY[f[1]]; return inArea(u) && (!F.pro || f[2].indexOf(F.pro) >= 0); })
      .map(function (f) { return { f: f, kg: farmerKg(f) }; }).filter(function (r) { return r.kg > 0; }).sort(function (a, b) { return b.kg - a.kg; }).slice(0, 10);
    $('#farmTitle').innerHTML = 'Farmers by quantity sold <small>' + areaName() + (F.pro ? ' · ' + P[PK[F.pro]].n : '') + '</small>';
    var max = rows[0] ? rows[0].kg : 1;
    $('#farmTable').innerHTML = '<tr><th>#</th><th>Farmer</th><th>Crops</th><th>Sold</th><th class="right">Deals</th><th class="right">Avg ৳/kg</th><th>Company contact</th></tr>' +
      (rows.length ? rows.map(function (r, i) {
        var f = r.f, crops = (F.pro ? [F.pro] : f[2]), ap = crops.reduce(function (s, k) { return s + price(PK[k], 11, UBY[f[1]][1], f[1]); }, 0) / crops.length;
        return '<tr><td class="muted">' + (i + 1) + '</td><td><b>' + f[0] + '</b><br><span class="muted small">' + f[1] + ', ' + UBY[f[1]][1] + '</span></td><td>' + f[2].map(function (k) { return '<i title="' + P[PK[k]].n + '" style="display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:3px;background:' + P[PK[k]].c + '"></i>'; }).join('') + '<br><span class="muted small">' + f[2].map(function (k) { return P[PK[k]].n; }).join(', ') + '</span></td>' +
          '<td style="white-space:nowrap"><span class="minibar" style="width:' + Math.round(60 * r.kg / max) + 'px"></span><span class="num">' + fmt(r.kg) + ' kg</span></td><td class="right num">' + Math.max(1, Math.round(r.kg / 650)) + '</td><td class="right num">৳' + ap.toFixed(1) + '</td><td>' + (f[3] ? '<span class="tag green">Allowed</span>' : '<span class="tag plain">Not allowed</span>') + '</td></tr>';
      }).join('') : '<tr><td colspan="7" class="muted">No farmers in the sample data for this filter.</td></tr>');
  }

  /* ---------- coming supply (vertical bars) ---------- */
  function renderSupply() {
    $('#supTitle').innerHTML = 'Coming supply · next 30 days <small>' + areaName() + ' · from listings with a future harvest date</small>';
    var vals = P.map(function (p, i) { var t = 0; U.forEach(function (u) { if (inArea(u)) t += 34 * aff(u, p.k) * p.s[0] * (u[4] / 75) * .55; }); return t; });
    var W = 520, H = 200, L = 10, B = 40, T = 22, bw = 52, gap = (W - L * 2 - bw * 6) / 5, max = Math.max.apply(null, vals) || 1;
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Coming supply' });
    el('line', { x1: 0, x2: W, y1: H - B, y2: H - B, stroke: '#cfcdc4' }, svg);
    vals.forEach(function (v, i) {
      var x = L + i * (bw + gap), hh = Math.max(2, (H - B - T) * v / max), p = P[i];
      el('path', { d: barPath(x, H - B - hh, bw, hh, 4, 'up'), fill: p.c, opacity: F.pro && F.pro !== p.k ? .35 : 1 }, svg);
      txt(svg, x + bw / 2, H - B - hh - 6, fmt(v) + ' t', { 'text-anchor': 'middle' });
      txt(svg, x + bw / 2, H - B + 16, p.n, { 'text-anchor': 'middle' });
      var hit = el('rect', { x: x - gap / 2, y: 0, width: bw + gap, height: H, fill: 'transparent' }, svg);
      hit.onmousemove = function (e) { showTip('<b>' + p.n + '</b><br>About ' + fmt(v) + ' t expected to be harvested in ' + areaName() + ' by mid-December', e); };
      hit.onmouseleave = hideTip;
    });
    $('#supply').innerHTML = ''; $('#supply').appendChild(svg);
  }

  /* ---------- trade flows ---------- */
  function renderFlows() {
    var rows = [];
    U.filter(inArea).forEach(function (u) {
      var t = 0; P.forEach(function (p, i) { if (!F.pro || F.pro === p.k) months().forEach(function (m) { t += vol(u, i, m); }); });
      var shares = BUYERS.map(function (b) { return b === u[1] ? .3 : b === 'Dhaka' ? .45 + .2 * h(u[0]) : .08 * h(u[0] + b); });
      var s = shares.reduce(function (a, b) { return a + b; }, 0);
      BUYERS.forEach(function (b, bi) { rows.push({ from: u[0], d: u[1], to: b, t: t * shares[bi] / s }); });
    });
    rows.sort(function (a, b) { return b.t - a.t; }); rows = rows.slice(0, 7);
    var max = rows[0] ? rows[0].t : 1;
    $('#flows').innerHTML = '<tr><th>From (upazila)</th><th>To (buyer district)</th><th>Tonnes</th></tr>' + rows.map(function (r) {
      return '<tr><td><b>' + r.from + '</b> <span class="muted small">' + r.d + '</span></td><td>' + (r.to === r.d ? r.to + ' <span class="muted small">(local)</span>' : r.to) + '</td><td style="white-space:nowrap"><span class="minibar" style="width:' + Math.round(70 * r.t / max) + 'px"></span><span class="num">' + fmt(r.t) + ' t</span></td></tr>';
    }).join('');
  }

  /* ---------- seasonality heatmap (product × month) ---------- */
  function renderSeason() {
    $('#seasTitle').innerHTML = 'Seasonality · ' + areaName() + ' <small>Tonnes by month, last 12 months</small>';
    var M = P.map(function (p, i) { return MONTHS.map(function (mm, m) { var t = 0; U.forEach(function (u) { if (inArea(u)) t += vol(u, i, m); }); return t; }); });
    var max = Math.max.apply(null, M.map(function (r) { return Math.max.apply(null, r); }));
    $('#seas').innerHTML = '<table class="hm"><tr><th>Product</th>' + MONTHS.map(function (m) { return '<th>' + m + '</th>'; }).join('') + '</tr>' + M.map(function (r, i) {
      return '<tr><td class="rowl" style="cursor:default">' + P[i].n + '</td>' + r.map(function (v, m) { var bg = rampColor(v, max); return '<td class="cell" style="padding:6px 2px;font-size:10.5px;background:' + bg + ';color:' + (RAMP.indexOf(bg) >= 7 ? '#fff' : 'var(--text-primary)') + '" data-tip="<b>' + P[i].n + ' · ' + MONTHS[m] + '</b><br>' + fmt(v) + ' t in ' + areaName() + '">' + (v >= 1 ? fmt(v) : '') + '</td>'; }).join('') + '</tr>';
    }).join('') + '</table><p class="small muted" style="margin-top:6px">Lal shak was added to the product list in October, so it has no earlier data.</p>';
    $$('#seas [data-tip]').forEach(function (c) { c.onmousemove = function (e) { showTip(c.dataset.tip, e); }; c.onmouseleave = hideTip; });
  }

  /* ---------- saved by emergency sales ---------- */
  function renderSaved() {
    var W = 520, H = 170, B = 26, T = 18, bw = 30, gap = (W - bw * 12) / 11, max = Math.max.apply(null, SAVED);
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Produce saved per month' });
    el('line', { x1: 0, x2: W, y1: H - B, y2: H - B, stroke: '#cfcdc4' }, svg);
    SAVED.forEach(function (v, m) {
      var x = m * (bw + gap), hh = (H - B - T) * v / max;
      el('path', { d: barPath(x, H - B - hh, bw, hh, 4, 'up'), fill: '#2a78d6' }, svg);
      txt(svg, x + bw / 2, H - 8, MONTHS[m], { 'text-anchor': 'middle' });
      if (m === 11) txt(svg, x + bw / 2, H - B - hh - 5, fmt(v), { 'text-anchor': 'middle', class: 'lbl-strong' });
      var hit = el('rect', { x: x - gap / 2, y: 0, width: bw + gap, height: H, fill: 'transparent' }, svg);
      hit.onmousemove = function (e) { showTip('<b>' + MONTHS[m] + '</b><br>' + fmt(v) + ' kg sold in emergency sales<br>About ৳' + fmt(v * 35.6) + ' that would have been wasted', e); };
      hit.onmouseleave = hideTip;
    });
    $('#saved').innerHTML = ''; $('#saved').appendChild(svg);
  }

  /* ---------- insights for companies ---------- */
  function topUpa(pi, filterU) { var best = null, bt = 0; U.forEach(function (u) { if (!filterU(u)) return; var t = 0; months().forEach(function (m) { t += vol(u, pi, m); }); if (t > bt) { bt = t; best = u; } }); return best ? { u: best, t: bt } : null; }
  function insightList(n, onlyArea) {
    var area = onlyArea ? inArea : function (u) { return !F.dis || u[1] === F.dis; };
    var list = (F.pro ? [PK[F.pro]] : P.map(function (p, i) { return i; })).map(function (i) { return { i: i, b: topUpa(i, area) }; }).filter(function (x) { return x.b && x.b.t > 1; })
      .sort(function (a, b) { return b.b.t - a.b.t; }).slice(0, n);
    return list.map(function (x) {
      var p = P[x.i], ch = Math.round(100 * (price(x.i, 11, x.b.u[1], x.b.u[0]) - price(x.i, 0, x.b.u[1], x.b.u[0])) / price(x.i, 0, x.b.u[1], x.b.u[0]));
      return '<div class="insight"><b>' + p.n + ':</b> ' + x.b.u[0] + ' (' + x.b.u[1] + ') sells the most, ' + fmt(x.b.t) + ' t. Price ' + (ch < 0 ? 'fell ' + (-ch) : 'rose ' + ch) + '% in 12 weeks. <span class="muted">Target here: ' + p.co + '.</span></div>';
    }).join('');
  }
  function renderInsights() {
    $('#insights').innerHTML = insightList(4, false) + '<p class="small muted" style="margin-top:10px">Companies receive upazila totals and prices. Farmer names only for farmers who allowed it.</p>';
  }

  $('#csv').onclick = function () {
    var lines = ['upazila,district,product,tonnes,price_now_tk_per_kg,period_months'];
    U.filter(inArea).forEach(function (u) { P.forEach(function (p, i) { if (F.pro && F.pro !== p.k) return; var t = 0; months().forEach(function (m) { t += vol(u, i, m); }); lines.push([u[0], u[1], p.n, t.toFixed(1), price(i, 11, u[1], u[0]), F.per].join(',')); }); });
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' })); a.download = 'freshnest-company-report-' + (F.upa || F.dis || 'all').replace(/\s/g, '-').toLowerCase() + '.csv'; a.click();
    log('Downloaded company report (' + areaName() + ')'); toast('Company report downloaded: ' + (lines.length - 1) + ' rows, upazila level.');
  };

  function renderAnalytics() {
    syncFilters();
    var ap = areaProducts();
    renderKpis(ap); renderHeat(); renderTop(ap); renderPrice(ap); renderFarmers(); renderSupply(); renderFlows(); renderSeason(); renderSaved(); renderInsights();
  }

  /* =====================================================
     A8 PLATFORM & OPERATIONS (sample numbers, platform-wide)
  ===================================================== */
  var C1 = '#2a78d6', C2 = '#eb6834', C3 = '#1baf7a', C4 = '#eda100', C5 = '#e87ba4', C6 = '#008300';
  function legend(id, series) { $('#' + id).innerHTML = series.map(function (s) { return '<span><i style="background:' + s.c + '"></i>' + s.n + '</span>'; }).join(''); }
  function mount(id, svg) { $('#' + id).innerHTML = ''; $('#' + id).appendChild(svg); }
  function nice(max) { var e = Math.pow(10, Math.floor(Math.log10(max))), m = max / e; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * e; }
  // stacked vertical bars; series = [{n, c, v:[]}]
  function vStack(id, labels, series, o) {
    o = o || {}; var W = o.W || 520, H = o.H || 210, L = 34, R = 6, T = 16, B = 24, n = labels.length;
    var tot = labels.map(function (x, i) { return series.reduce(function (s, se) { return s + se.v[i]; }, 0); });
    var max = nice(Math.max.apply(null, tot)), slot = (W - L - R) / n, bw = Math.min(30, slot * .68);
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': o.label || '' });
    var Y = function (v) { return T + (H - T - B) * (1 - v / max); };
    [0, .5, 1].forEach(function (f) { var y = Y(max * f); el('line', { x1: L, x2: W - R, y1: y, y2: y, stroke: f ? 'var(--grid)' : '#cfcdc4' }, svg); txt(svg, L - 6, y + 4, (o.fmt || fmt)(max * f), { 'text-anchor': 'end' }); });
    labels.forEach(function (lb, i) {
      var x = L + slot * i + (slot - bw) / 2, acc = 0;
      series.forEach(function (se, k) {
        var v = se.v[i]; if (v <= 0) { return; }
        var y0 = Y(acc), y1 = Y(acc + v), top = k === series.length - 1 || series.slice(k + 1).every(function (z) { return z.v[i] <= 0; });
        el('path', { d: top ? barPath(x, y1, bw, y0 - y1, 3, 'up') : 'M' + x + ',' + y1 + 'h' + bw + 'V' + y0 + 'h-' + bw + 'z', fill: se.c }, svg);
        if (!top) el('line', { x1: x, x2: x + bw, y1: y1, y2: y1, stroke: 'var(--surface-1)', 'stroke-width': 1 }, svg);
        acc += v;
      });
      if (i % (o.every || 1) === 0 || i === n - 1) txt(svg, x + bw / 2, H - 7, lb, { 'text-anchor': 'middle' });
      if (i === n - 1) txt(svg, x + bw / 2, Y(tot[i]) - 5, (o.fmt || fmt)(tot[i]), { 'text-anchor': 'middle', class: 'lbl-strong' });
      var hit = el('rect', { x: L + slot * i, y: 0, width: slot, height: H, fill: 'transparent' }, svg);
      hit.onmousemove = function (e) { showTip('<b>' + (o.tipHead ? o.tipHead(lb) : lb) + '</b><br>' + series.map(function (se) { return se.n + ': ' + (o.fmt || fmt)(se.v[i]); }).join('<br>') + (series.length > 1 ? '<br>Total: ' + (o.fmt || fmt)(tot[i]) : ''), e); };
      hit.onmouseleave = hideTip;
    });
    mount(id, svg);
  }
  // horizontal bars; rows = [{n, v, c?, note?}]
  function hBars(id, rows, unit) {
    var W = 520, rh = 30, L = 150, R = 60, H = rows.length * rh + 4, max = Math.max.apply(null, rows.map(function (r) { return r.v; }));
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img' }), tot = rows.reduce(function (s, r) { return s + r.v; }, 0);
    rows.forEach(function (r, i) {
      var y = i * rh + 6, w = Math.max(2, (W - L - R) * r.v / max);
      txt(svg, L - 10, y + 13, r.n, { 'text-anchor': 'end' });
      el('path', { d: barPath(L, y, w, 18, 4, 'right'), fill: r.c || 'var(--slate-2)' }, svg);
      txt(svg, L + w + 6, y + 13, fmt(r.v) + (unit || ''), { class: 'lbl-strong' });
      var hit = el('rect', { x: 0, y: y - 4, width: W, height: rh, fill: 'transparent' }, svg);
      hit.onmousemove = function (e) { showTip('<b>' + r.n + '</b><br>' + fmt(r.v) + (unit || '') + ' · ' + Math.round(100 * r.v / tot) + '% of total' + (r.note ? '<br>' + r.note : ''), e); };
      hit.onmouseleave = hideTip;
    });
    mount(id, svg);
  }
  // 100% (or absolute) stacked horizontal bars; rows = [{n, v:[]}]
  function hStack(id, rows, series, pct, W) {
    W = W || 520; var rh = 34, L = 110, R = 50, H = rows.length * rh + 4;
    var max = pct ? 1 : Math.max.apply(null, rows.map(function (r) { return r.v.reduce(function (a, b) { return a + b; }, 0); }));
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img' });
    rows.forEach(function (r, i) {
      var y = i * rh + 6, t = r.v.reduce(function (a, b) { return a + b; }, 0), x = L, scale = (W - L - R) / (pct ? t : max);
      txt(svg, L - 10, y + 14, r.n, { 'text-anchor': 'end' });
      r.v.forEach(function (v, k) {
        var w = v * scale; if (w <= 0) return;
        el('rect', { x: x, y: y, width: Math.max(0, w - 1.5), height: 20, fill: series[k].c, rx: k === r.v.length - 1 || k === 0 ? 3 : 0 }, svg);
        if (pct && w > 34) txt(svg, x + w / 2, y + 14, Math.round(100 * v / t) + '%', { 'text-anchor': 'middle', style: 'fill:#fff;font-weight:600' });
        x += w;
      });
      txt(svg, x + 6, y + 14, pct ? fmt(t) : fmt(t), { class: 'lbl-strong' });
      var hit = el('rect', { x: 0, y: y - 6, width: W, height: rh, fill: 'transparent' }, svg);
      hit.onmousemove = function (e) { showTip('<b>' + r.n + '</b> · ' + fmt(t) + (pct ? ' trips' : '') + '<br>' + series.map(function (se, k) { return se.n + ': ' + fmt(r.v[k]) + (pct ? ' (' + Math.round(100 * r.v[k] / t) + '%)' : ''); }).join('<br>'), e); };
      hit.onmouseleave = hideTip;
    });
    mount(id, svg);
  }
  // small line with its own scale
  function miniLine(box, name, labels, v, c, unit) {
    var W = 300, H = 110, L = 6, R = 40, T = 12, B = 20, max = Math.max.apply(null, v) * 1.1, min = 0;
    var X = function (i) { return L + (W - L - R) * i / (v.length - 1); }, Y = function (x) { return T + (H - T - B) * (1 - (x - min) / (max - min)); };
    var wrap = document.createElement('div'), sum = v.reduce(function (a, b) { return a + b; }, 0);
    wrap.innerHTML = '<div class="small" style="display:flex;justify-content:space-between"><b>' + name + '</b><span class="muted">' + fmt(sum) + ' in 12 months</span></div><div class="chart"></div>';
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img' });
    el('line', { x1: L, x2: W - R, y1: H - B, y2: H - B, stroke: '#cfcdc4' }, svg);
    el('path', { d: v.map(function (x, i) { return (i ? 'L' : 'M') + X(i) + ',' + Y(x); }).join('') + 'L' + X(v.length - 1) + ',' + (H - B) + 'L' + X(0) + ',' + (H - B) + 'z', fill: c, opacity: .1 }, svg);
    el('path', { d: v.map(function (x, i) { return (i ? 'L' : 'M') + X(i) + ',' + Y(x); }).join(''), fill: 'none', stroke: c, 'stroke-width': 2, 'stroke-linejoin': 'round' }, svg);
    el('circle', { cx: X(v.length - 1), cy: Y(v[v.length - 1]), r: 3.5, fill: c }, svg);
    txt(svg, X(v.length - 1) + 7, Y(v[v.length - 1]) + 4, fmt(v[v.length - 1]), { class: 'lbl-strong' });
    [0, 3, 6, 9, 11].forEach(function (i) { txt(svg, X(i), H - 5, labels[i], { 'text-anchor': 'middle' }); });
    var dot = el('circle', { r: 4, fill: c, stroke: 'var(--surface-1)', 'stroke-width': 2, opacity: 0 }, svg);
    var hit = el('rect', { x: 0, y: 0, width: W, height: H, fill: 'transparent' }, svg);
    hit.onmousemove = function (e) { var r = svg.getBoundingClientRect(), i = Math.max(0, Math.min(v.length - 1, Math.round((e.clientX - r.left) / r.width * W / ((W - L - R) / (v.length - 1)) - L / ((W - L - R) / (v.length - 1))))); dot.setAttribute('cx', X(i)); dot.setAttribute('cy', Y(v[i])); dot.setAttribute('opacity', 1); showTip('<b>' + name + ' · ' + labels[i] + '</b><br>' + fmt(v[i]) + ' new ' + unit, e); };
    hit.onmouseleave = function () { dot.setAttribute('opacity', 0); hideTip(); };
    wrap.lastChild.appendChild(svg); box.appendChild(wrap);
  }
  var wk = function (i, base, amp, key) { return Math.round(base * (1 + amp * Math.sin(i / 1.9)) * (.85 + .3 * h(key + i)) * (1 + i * .035)); };
  var OPS = {
    bid: WEEKS.map(function (w, i) { return wk(i, 128, .12, 'b'); }),
    fix: WEEKS.map(function (w, i) { return wk(i, 96, .1, 'f'); }),
    emg: WEEKS.map(function (w, i) { return Math.round(4 + 6 * h('e' + i)); })
  };
  OPS.value = WEEKS.map(function (w, i) { return (OPS.bid[i] + OPS.fix[i]) * (0.39 + .08 * h('v' + i)) + OPS.emg[i] * .18; }); // ৳ lakh
  var SIGN = {
    Farmers: [210, 260, 240, 180, 150, 140, 160, 190, 240, 330, 420, 510],
    Dealers: [38, 44, 40, 31, 26, 22, 25, 30, 41, 55, 70, 86],
    Transporters: [9, 11, 10, 8, 7, 6, 7, 9, 12, 15, 19, 24]
  };
  function renderOps() {
    var deals = OPS.bid.concat(OPS.fix).reduce(function (a, b) { return a + b; }, 0);
    $('#opsKpis').innerHTML =
      '<div><span>Deals completed</span><b class="num">' + fmt(deals) + '</b><small>last 12 weeks · ' + Math.round(100 * OPS.bid.reduce(function (a, b) { return a + b; }, 0) / deals) + '% open bidding</small></div>' +
      '<div><span>Active users</span><b class="num">4,812</b><small>3,920 farmers · 706 dealers · 186 transporters</small></div>' +
      '<div><span>Delivered on time</span><b class="num">91.4%</b><small>last 3 months · up from 88.2%</small></div>' +
      '<div><span>Verification wait</span><b class="num">5.2 h</b><small>average, submit to decision</small></div>' +
      '<div><span>Deals cancelled</span><b class="num">3.1%</b><small>last 30 days, all roles</small></div>';
    var dealS = [{ n: 'Open bidding', c: C1, v: OPS.bid }, { n: 'Farmer price + offers', c: C3, v: OPS.fix }, { n: 'Emergency sale', c: C2, v: OPS.emg }];
    legend('lgDeals', dealS); vStack('cDeals', WEEKS, dealS, { every: 2, tipHead: function (l) { return 'Week of ' + l; } });
    vStack('cValue', WEEKS, [{ n: 'Trade value', c: 'var(--slate-2)', v: OPS.value }], { every: 2, fmt: function (x) { return x ? '৳' + x.toFixed(x >= 100 ? 0 : 1) + 'L' : '0'; }, tipHead: function (l) { return 'Week of ' + l; } });
    var box = $('#cUsers'); box.innerHTML = '';
    miniLine(box, 'Farmers', MONTHS, SIGN.Farmers, C3, 'farmers (no verification needed)');
    miniLine(box, 'Dealers', MONTHS, SIGN.Dealers, C1, 'dealers verified');
    miniLine(box, 'Transporters', MONTHS, SIGN.Transporters, C2, 'transporters verified');
    var outS = [{ n: 'On time', c: C3 }, { n: 'Late', c: C4 }, { n: 'Failed → emergency sale', c: C2 }, { n: 'Failed → cancelled', c: '#8a8a84' }];
    legend('lgOut', outS);
    hStack('cOut', [{ n: 'Normal truck', v: [1640, 118, 22, 6] }, { n: 'Pickup', v: [610, 52, 9, 3] }, { n: 'Ventilated van', v: [520, 30, 5, 1] }, { n: 'Refrigerated', v: [188, 7, 1, 0] }], outS, true);
    hBars('cFailWhy', [
      { n: 'Engine breakdown', v: 17, c: C2, note: 'Most in trucks older than 10 years' }, { n: 'Road blocked / jam', v: 11, c: C2 }, { n: 'Flood or heavy rain', v: 8, c: C2, note: 'Jun–Sep; season warning was shown' },
      { n: 'Accident', v: 3, c: C2 }, { n: 'Produce went bad on the way', v: 2, c: C2, note: 'Both in normal trucks on long trips' }, { n: 'Other', v: 2, c: C2 }
    ], '');
    var verS = [{ n: 'Approved', c: C3, v: WEEKS.map(function (w, i) { return Math.round(14 + 10 * h('va' + i) + i); }) }, { n: 'Asked to re-upload', c: C4, v: WEEKS.map(function (w, i) { return Math.round(2 + 4 * h('vr' + i)); }) }, { n: 'Rejected', c: C2, v: WEEKS.map(function (w, i) { return Math.round(1 + 2 * h('vj' + i)); }) }];
    legend('lgVer', verS); vStack('cVer', WEEKS, verS, { every: 2, tipHead: function (l) { return 'Week of ' + l; } });
    $('#verWait').textContent = 'Average wait fell from 9.8 h to 5.2 h after Tanvir got the verification permission (week of 19 Oct). Most re-uploads: blurry photo (46%), expired licence (28%).';
    var repS = [{ n: 'Warned', c: C4 }, { n: 'Suspended / banned', c: C2 }, { n: 'Dismissed', c: '#8a8a84' }, { n: 'Still open', c: C1 }];
    legend('lgRep', repS);
    hStack('cRep', [{ n: 'Price changed later', v: [9, 3, 4, 1] }, { n: 'No-show / no pickup', v: [6, 2, 3, 1] }, { n: 'Wrong quality', v: [5, 1, 6, 0] }, { n: 'Rude behaviour', v: [4, 1, 3, 1] }, { n: 'Fake review', v: [0, 1, 5, 0] }], repS, false);
    var hrs = [0, 0, 0, 2, 18, 64, 92, 71, 44, 30, 22, 18, 15, 14, 16, 24, 31, 27, 15, 8, 4, 2, 1, 0];
    vStack('cHours', hrs.map(function (x, i) { return i === 0 ? '12a' : i < 12 ? i + 'a' : i === 12 ? '12p' : (i - 12) + 'p'; }), [{ n: 'Pickups', c: C1, v: hrs }], { every: 3, tipHead: function (l) { return 'Hour starting ' + l; } });
    var canS = [{ n: 'Dealer', c: C1, v: WEEKS.map(function (w, i) { return Math.round(3 + 4 * h('cd' + i)); }) }, { n: 'Farmer', c: C3, v: WEEKS.map(function (w, i) { return Math.round(2 + 3 * h('cf' + i)); }) }, { n: 'Transporter', c: C2, v: WEEKS.map(function (w, i) { return Math.round(1 + 3 * h('ct' + i)); }) }];
    legend('lgCan', canS); vStack('cCan', WEEKS, canS, { every: 2, tipHead: function (l) { return 'Week of ' + l; } });
    var admS = [{ n: 'Verification', c: C1 }, { n: 'Delivery failures', c: C2 }, { n: 'Cancel requests', c: C4 }, { n: 'Reports & reviews', c: C5 }];
    legend('lgAdm', admS);
    hStack('cAdm', [{ n: 'Nusrat Jahan', v: [12, 6, 4, 9] }, { n: 'Tanvir Ahmed', v: [58, 21, 17, 0] }, { n: 'Mitu Rahman', v: [0, 0, 0, 34] }], admS, false, 1040);
  }
  var opsDone = false;
  function anTab(t) {
    $$('#anTabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.at === t); });
    $('#anMarket').classList.toggle('hidden', t !== 'market'); $('#anOps').classList.toggle('hidden', t !== 'ops');
    if (t === 'ops' && !opsDone) { renderOps(); opsDone = true; }
  }
  $$('#anTabs button').forEach(function (b) { b.onclick = function () { anTab(b.dataset.at); }; });
  $('#toOps').onclick = function () { setTimeout(function () { anTab('ops'); }, 0); };
  (function () { // A1: last 14 days
    var days = [], d = new Date(2026, 10, 13); for (var i = 13; i >= 0; i--) { var x = new Date(d - i * 864e5); days.push(x.getDate() + ''); }
    var s = [{ n: 'Deals completed', c: C1, v: days.map(function (x, i) { return Math.round(26 + 14 * h('hd' + i) + i * .8); }) }, { n: 'Emergency sales', c: C2, v: days.map(function (x, i) { return i === 13 ? 2 : Math.round(1.6 * h('he' + i)); }) }];
    legend('lgHome', s); vStack('cHome', days, s, { W: 700, H: 200, every: 2, tipHead: function (l) { return l + ' Nov'; } });
  })();

  (function () { // company subscriptions
    var SUB = [['GreenSeed Bangladesh', 'Seed', 'Bogura Sadar, Shajahanpur, Gaibandha Sadar, Joypurhat Sadar', 4, 'Active · renews 1 Dec'],
      ['Krishi Sar Ltd.', 'Fertiliser', 'All of Bogura (12 upazilas)', 12, 'Active · renews 1 Dec'],
      ['Agro Cold Chain', 'Cold storage', 'Shibganj, Kahaloo, Panchbibi, Pirganj, Gobindaganj', 5, 'Active · renews 15 Nov'],
      ['FarmTools BD', 'Equipment', 'Ullapara, Shahjadpur', 2, 'Trial · ends 20 Nov']];
    var total = 0;
    $('#subTable').innerHTML = '<tr><th>Company</th><th>Sells</th><th>Upazilas covered</th><th class="right">Monthly fee</th><th>Status</th></tr>' + SUB.map(function (r) {
      var fee = r[4].indexOf('Trial') === 0 ? 0 : r[3] * 1500; total += fee;
      return '<tr><td><b>' + r[0] + '</b></td><td>' + r[1] + '</td><td class="small">' + r[2] + '</td><td class="right num">' + (fee ? '৳' + fmt(fee) : 'free trial') + '</td><td><span class="tag ' + (fee ? 'green' : 'gold') + '">' + r[4] + '</span></td></tr>';
    }).join('') + '<tr><td colspan="3" class="muted">৳1,500 per upazila per month</td><td class="right num"><b>৳' + fmt(total) + '</b></td><td class="muted small">per month</td></tr>';
  })();

  /* =====================================================
     A1 OVERVIEW lists
  ===================================================== */
  $('#urgentList').innerHTML =
    '<tr data-perm="deals"><td><span class="tag red">Escalated</span></td><td><b>Tomato 900 kg stuck in Sherpur upazila, Bogura</b><br><span class="muted small">Waiting 31 min · shelf life 3 days · Swift Carriers (3 failures in 30 days)</span></td><td class="right"><button class="btn sm slate" data-goto2="fail">Open</button></td></tr>' +
    '<tr data-perm="deals"><td><span class="tag gold">Cancel</span></td><td><b>Rangpur Mart wants to cancel FN-1045</b><br><span class="muted small">Transport is booked for tomorrow 5:30 AM</span></td><td class="right"><button class="btn sm ghost" data-goto2="cases">Open</button></td></tr>' +
    '<tr data-perm="verify"><td><span class="tag plain">Verify</span></td><td><b>4 waiting</b>: 2 dealers, 1 transporter, 1 vehicle<br><span class="muted small">Oldest: Padma Movers, since yesterday 6:05 PM</span></td><td class="right"><button class="btn sm ghost" data-goto2="verify">Open</button></td></tr>' +
    '<tr data-perm="reports"><td><span class="tag slate">Report</span></td><td><b>4 reports against Bhuiyan Traders</b><br><span class="muted small">Asked for lower price after the deal · did not receive produce</span></td><td class="right"><button class="btn sm ghost" data-goto2="cases">Open</button></td></tr>';
  $$('[data-goto2]').forEach(function (b) { b.onclick = function () { if (b.dataset.goto2 === 'cases') openCaseTab(can('deals') && /Cancel/.test(b.closest('tr').textContent) ? 'cancel' : 'reports'); go(b.dataset.goto2); }; });
  (function () { var save = F; F = { per: 1, dis: '', upa: '', pro: '' }; $('#weekInsights').innerHTML = insightList(3, false); F = save; })();

  /* =====================================================
     A5 USERS
  ===================================================== */
  var USERS = FARMERS.map(function (f) { return { n: f[0], role: 'Farmer', u: f[1], d: UBY[f[1]][1], st: f[0] === 'Bablu Mia' ? 'Active' : 'Active', rate: (4 + h(f[0]) * .9).toFixed(1), deals: 4 + Math.round(h(f[0] + 'd') * 40), note: f[0] === 'Bablu Mia' ? '3 cancellations in 30 days (alert)' : '' }; })
    .concat([
      { n: 'Hasan Traders', role: 'Dealer', u: 'Bogura Sadar', d: 'Bogura', st: 'Active', rate: '4.7', deals: 41, note: '3 cancellations in 30 days (alert)' },
      { n: 'Joypurhat Fresh', role: 'Dealer', u: 'Joypurhat Sadar', d: 'Joypurhat', st: 'Active', rate: '4.6', deals: 37, note: '' },
      { n: 'Kawran Bazar Agro', role: 'Dealer', u: 'Tejgaon (Dhaka)', d: 'Dhaka', st: 'Active', rate: '4.4', deals: 88, note: '' },
      { n: 'Rangpur Mart', role: 'Dealer', u: 'Rangpur Sadar', d: 'Rangpur', st: 'Active', rate: '4.8', deals: 64, note: '' },
      { n: 'Bhuiyan Traders', role: 'Dealer', u: 'Gobindaganj', d: 'Gaibandha', st: 'Warned', rate: '3.1', deals: 22, note: '4 reports in 30 days' },
      { n: 'Fake Agro BD', role: 'Dealer', u: 'Sherpur', d: 'Bogura', st: 'Banned', rate: '1.8', deals: 6, note: 'Banned 2 Nov by Nusrat' },
      { n: 'Bogura Logistics', role: 'Transporter', u: 'Bogura Sadar', d: 'Bogura', st: 'Active', rate: '4.6', deals: 52, note: '' },
      { n: 'Mintu Pickup', role: 'Transporter', u: 'Bogura Sadar', d: 'Bogura', st: 'Active', rate: '4.5', deals: 30, note: '' },
      { n: 'Cold Line BD', role: 'Transporter', u: 'Shibganj', d: 'Bogura', st: 'Active', rate: '4.9', deals: 40, note: '' },
      { n: 'Swift Carriers', role: 'Transporter', u: 'Gaibandha Sadar', d: 'Gaibandha', st: 'Active', rate: '3.9', deals: 41, note: '3 failures in 30 days (alert)' }
    ]);
  fillSel($('#uDist'), DISTS.concat(['Dhaka']), 'All districts'); fillSel($('#uUpa'), upasOf(''), 'All upazilas');
  $('#uDist').onchange = function () { fillSel($('#uUpa'), upasOf(this.value === 'Dhaka' ? 'x' : this.value), 'All upazilas'); renderUsers(); };
  ['uQ', 'uRole', 'uUpa', 'uStat'].forEach(function (id) { $('#' + id).oninput = renderUsers; $('#' + id).onchange = renderUsers; });
  function renderUsers() {
    var q = $('#uQ').value.toLowerCase(), r = $('#uRole').value, d = $('#uDist').value, u = $('#uUpa').value, s = $('#uStat').value;
    var rows = USERS.filter(function (x) { return (!q || x.n.toLowerCase().indexOf(q) >= 0) && (!r || x.role === r) && (!d || x.d === d) && (!u || x.u === u) && (!s || x.st === s); });
    $('#userTable').innerHTML = '<tr><th>Name</th><th>Role</th><th>Upazila, district</th><th class="right">Rating</th><th class="right">Deals / trips</th><th>Status</th><th>Note</th><th></th></tr>' + rows.map(function (x, i) {
      return '<tr><td><b>' + x.n + '</b></td><td>' + x.role + (x.role !== 'Farmer' ? ' <span class="tag green">Verified</span>' : '') + '</td><td>' + x.u + ', ' + x.d + '</td><td class="right num">' + x.rate + '</td><td class="right num">' + x.deals + '</td><td><span class="tag ' + (x.st === 'Active' ? 'green' : x.st === 'Banned' ? 'red' : 'gold') + '">' + x.st + '</span></td><td class="small muted">' + x.note + '</td><td class="right"><button class="btn sm ghost" data-user="' + USERS.indexOf(x) + '">Open</button></td></tr>';
    }).join('') + (rows.length ? '' : '<tr><td colspan="8" class="muted">No users match.</td></tr>');
    $$('[data-user]').forEach(function (b) { b.onclick = function () { openUser(USERS[+b.dataset.user]); }; });
  }
  function openUser(x) {
    var banned = x.st === 'Banned';
    modal(x.n + ' · ' + x.role, '<dl class="kv"><dt>Location</dt><dd>' + x.u + ', ' + x.d + '</dd><dt>Status</dt><dd>' + x.st + '</dd><dt>Rating</dt><dd>' + x.rate + '</dd><dt>Deals / trips</dt><dd>' + x.deals + '</dd><dt>Alerts</dt><dd>' + (x.note || 'none') + '</dd></dl>' +
      (banned ? '<div class="note bad" style="margin-top:12px">Banned. ' + (can('super') ? 'As Super Admin you can lift the ban.' : 'Only the Super Admin can lift a ban.') + '</div>' : '<div class="btns" style="margin-top:14px"><button class="btn sm ghost" id="uWarn">Warn</button><button class="btn sm warn" id="uSus">Suspend or ban</button></div>'),
      banned && can('super') ? 'Lift ban' : null, function () { x.st = 'Active'; x.note = 'Ban lifted by ' + me.short; log('Lifted ban on ' + x.n); toast('Ban lifted. ' + x.n + ' can use FreshNest again.'); renderUsers(); });
    if (!banned) {
      $('#uWarn').onclick = function () { x.st = 'Warned'; log('Warned ' + x.n); closeModal(); toast(x.n + ' received a warning.'); renderUsers(); };
      $('#uSus').onclick = function () { suspendModal(x.n, '', function (label) { x.st = /Banned/.test(label) ? 'Banned' : 'Suspended'; x.note = label + ' by ' + me.short; log(label + ' · ' + x.n); toast(x.n + ': ' + label.toLowerCase() + '.'); renderUsers(); }); };
    }
  }

  /* =====================================================
     A6 PRODUCTS & SEASONS
  ===================================================== */
  var MASTER = P.filter(function (p) { return !p.isNew; }).map(function (p) { return [p.n, p.bn, p.cat, p.life, p.store]; }).concat([['Strawberry', 'স্ট্রবেরি', 'Fruit', 3, 'Refrigerated'], ['Mango', 'আম', 'Fruit', 7, 'Ventilated']]);
  var SUGG = [['Lal shak', 'লাল শাক', 20, 2, 'Normal', 'Bogura Sadar, Shibganj, Gabtali'], ['Kochur loti', 'কচুর লতি', 3, 3, 'Normal', 'Sherpur']];
  function renderProducts() {
    $('#prodTable').innerHTML = '<tr><th>English</th><th>Bangla</th><th>Category</th><th class="right">Shelf life</th><th>Vehicle needed</th><th></th></tr>' + MASTER.map(function (r, i) { return '<tr><td><b>' + r[0] + '</b></td><td>' + r[1] + '</td><td>' + r[2] + '</td><td class="right num">' + r[3] + ' days</td><td>' + r[4] + '</td><td class="right"><button class="btn sm ghost" data-pe="' + i + '">Edit</button></td></tr>'; }).join('');
    $('#suggTable').innerHTML = '<tr><th>Product</th><th class="right">Farmers who typed it</th><th class="right">Their shelf life</th><th>Vehicle</th><th>Where</th><th></th></tr>' + (SUGG.length ? SUGG.map(function (s, i) { return '<tr><td><b>' + s[0] + '</b> · ' + s[1] + '</td><td class="right num">' + s[2] + '</td><td class="right num">' + s[3] + ' days</td><td>' + s[4] + '</td><td class="small muted">' + s[5] + '</td><td class="right"><button class="btn sm slate" data-sg="' + i + '">Add to list</button></td></tr>'; }).join('') : '<tr><td colspan="6" class="muted">No suggestions right now.</td></tr>');
    $$('[data-sg]').forEach(function (b) { b.onclick = function () { var s = SUGG[+b.dataset.sg]; prodModal('Add to product list · ' + s[0], [s[0], s[1], 'Vegetable', s[3], s[4]], function (r) { MASTER.push(r); SUGG.splice(+b.dataset.sg, 1); log('Added product ' + r[0] + ' (suggested by ' + s[2] + ' farmers)'); toast(r[0] + ' is now in the dropdown for every farmer.'); renderProducts(); }); }; });
    $$('[data-pe]').forEach(function (b) { b.onclick = function () { var i = +b.dataset.pe; prodModal('Edit · ' + MASTER[i][0], MASTER[i], function (r) { MASTER[i] = r; log('Edited product ' + r[0]); toast('Saved.'); renderProducts(); }); }; });
  }
  function prodModal(title, r, done) {
    r = r || ['', '', 'Vegetable', '', 'Normal'];
    modal(title, '<div class="row"><div class="field"><label>Name (English)</label><input type="text" id="pn" value="' + r[0] + '"></div><div class="field"><label>Name (Bangla)</label><input type="text" id="pb" value="' + r[1] + '"></div></div>' +
      '<div class="row"><div class="field"><label>Category</label><select id="pc"><option' + (r[2] === 'Vegetable' ? ' selected' : '') + '>Vegetable</option><option' + (r[2] === 'Fruit' ? ' selected' : '') + '>Fruit</option></select></div><div class="field"><label>Shelf life (days)</label><input type="number" id="pl" value="' + r[3] + '"></div></div>' +
      '<div class="field"><label>Vehicle needed</label><select id="ps">' + ['Normal', 'Ventilated', 'Ventilated for long trips', 'Refrigerated', 'Normal (ventilated for long trips)'].map(function (o) { return '<option' + (o === r[4] ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select></div>', 'Save', function () {
        if (!need($('#pn')) | !need($('#pl'))) return false; done([$('#pn').value, $('#pb').value, $('#pc').value, +$('#pl').value, $('#ps').value]);
      });
  }
  $('#addProd').onclick = function () { prodModal('Add product', null, function (r) { MASTER.push(r); log('Added product ' + r[0]); toast(r[0] + ' added.'); renderProducts(); }); };
  (function () {
    var cls = ['w', 'w', 'w', 's', 's', 's', 'm', 'm', 'm', 'm', 'm', 'w'], mn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    $('#cal').innerHTML = '<div class="rl"></div>' + mn.map(function (m) { return '<div class="rl" style="text-align:center">' + m + '</div>'; }).join('') + '<div class="rl">Season</div>' + cls.map(function (c) { return '<div class="' + c + '">' + ({ w: 'Winter', s: 'Summer', m: 'Monsoon' })[c] + '</div>'; }).join('');
  })();
  $$('[data-seas]').forEach(function (b) { b.onclick = function () { var row = b.closest('tr'); modal('Edit ' + b.dataset.seas, '<div class="field"><label>Months</label><input type="text" value="' + row.children[1].textContent + '"></div><div class="field"><label>Advice shown to users</label><textarea rows="3">' + row.children[2].textContent + '</textarea></div>', 'Save', function () { log('Edited season ' + b.dataset.seas); toast('Season advice saved.'); }); }; });

  /* =====================================================
     A7 ANNOUNCEMENTS (down to upazila)
  ===================================================== */
  function anSync() {
    var w = $('#anWho').value, opts = w === 'role' ? ['Farmers', 'Dealers', 'Transporters'] : w === 'district' ? DISTS : w === 'upazila' ? U.map(function (u) { return u[0] + ', ' + u[1]; }) : [];
    $('#anPickF').style.visibility = w === 'all' ? 'hidden' : 'visible';
    $('#anPickL').textContent = w === 'role' ? 'Role' : w === 'district' ? 'District' : 'Upazila';
    $('#anPick').innerHTML = opts.map(function (o) { return '<option>' + o + '</option>'; }).join('');
    anReach();
  }
  function anReach() {
    var w = $('#anWho').value, v = $('#anPick').value, n = 4812, sp = $('#anSp').checked;
    if (w === 'role') n = v === 'Farmers' ? 3920 : v === 'Dealers' ? 706 : 186;
    if (w === 'district') n = Math.round(U.filter(function (u) { return u[1] === v; }).reduce(function (s, u) { return s + u[4]; }, 0) * 1.6);
    if (w === 'upazila') { var u = UBY[v.split(', ')[0]]; n = Math.round(u[4] * 1.8); }
    if (sp) { n = Math.round((w === 'role' || w === 'all' ? 3920 : n * .8) * .34); }
    $('#anReach').textContent = 'Reaches about ' + fmt(n) + (sp ? ' opted-in farmers' : ' users') + ' in their notification bell.';
    return n;
  }
  $('#anWho').onchange = anSync; $('#anPick').onchange = anReach;
  $('#anSp').onchange = function () {
    $('#anSpF').classList.toggle('hidden', !this.checked);
    var r = $('#anWho option[value=role]'); r.disabled = this.checked; if (this.checked && $('#anWho').value === 'role') { $('#anWho').value = 'upazila'; anSync(); }
    anReach();
  };
  $('#anSend').onclick = function () {
    if (!need($('#anT')) | !need($('#anM'))) return;
    var w = $('#anWho').value, aud = w === 'all' ? 'Everyone' : ($('#anPickL').textContent + ': ' + $('#anPick').value), n = anReach();
    var sp = $('#anSp').checked; if (sp) aud = $('#anCo').value + ' · ' + aud;
    var tr = document.createElement('tr'); tr.innerHTML = '<td>' + (sp ? '<span class="tag gold">Sponsored</span> ' : '') + '<b>' + $('#anT').value + '</b><br><span class="muted small">' + aud + ' · ' + fmt(n) + ' users · just now</span></td>';
    $('#anList').insertBefore(tr, $('#anList').firstChild);
    log('Sent announcement to ' + aud + ': ' + $('#anT').value); toast('Announcement sent to ' + fmt(n) + ' users.'); $('#anT').value = ''; $('#anM').value = '';
  };
  anSync();

  /* =====================================================
     A9 TEAM & SETTINGS
  ===================================================== */
  function renderAdmins() {
    var keys = ['verify', 'deals', 'reports', 'announce', 'analytics'];
    $('#adminTable').innerHTML = '<tr><th>Admin</th><th>Permissions</th><th></th></tr>' + Object.keys(ADMINS).map(function (k) {
      var a = ADMINS[k], sup = a.perms.indexOf('super') >= 0;
      return '<tr><td><b>' + a.name + '</b><br><span class="muted small">' + a.role + '</span></td><td>' + (sup ? '<span class="muted">Everything (Super Admin)</span>' : keys.map(function (p) { return '<label><input type="checkbox" data-pa="' + k + '" value="' + p + '"' + (a.perms.indexOf(p) >= 0 ? ' checked' : '') + '> ' + permNames[p] + '</label>'; }).join('')) + '</td><td class="right">' + (sup ? '' : '<button class="btn sm warn" data-rm="' + k + '">Remove</button>') + '</td></tr>';
    }).join('');
    $$('[data-pa]').forEach(function (c) { c.onchange = function () { var a = ADMINS[c.dataset.pa]; if (c.checked) a.perms.push(c.value); else a.perms = a.perms.filter(function (p) { return p !== c.value; }); log((c.checked ? 'Gave ' : 'Removed ') + permNames[c.value] + (c.checked ? ' to ' : ' from ') + a.name); toast('Permissions updated for ' + a.name + '.'); }; });
    $$('[data-rm]').forEach(function (b) { b.onclick = function () { modal('Remove ' + ADMINS[b.dataset.rm].name + '?', '<p>They lose access to the admin office immediately. Their past actions stay in the activity log.</p>', 'Remove', function () { log('Removed admin ' + ADMINS[b.dataset.rm].name); toast('Admin removed (prototype only).'); }, 'warn'); }; });
  }
  $('#addAdmin').onclick = function () { modal('Add admin', '<div class="row"><div class="field"><label>Name</label><input type="text" id="aN"></div><div class="field"><label>Phone (login)</label><input type="tel" id="aP"></div></div><div class="field perm"><label>Permissions</label>' + ['verify', 'deals', 'reports', 'announce', 'analytics'].map(function (p) { return '<label><input type="checkbox"> ' + permNames[p] + '</label>'; }).join('') + '</div>', 'Add admin', function () { if (!need($('#aN')) | !need($('#aP'))) return false; log('Added admin ' + $('#aN').value); toast('Admin added. They get a login SMS.'); }); };
  $('#saveSet').onclick = function () { log('Changed system settings'); toast('Settings saved (prototype only).'); };

  /* ---------- start ---------- */
  renderLog(); renderVerify(); renderFail(); openCaseTab('cancel'); renderUsers(); renderProducts(); renderAdmins();
  applyPerms();
  show(location.hash.slice(1) || 'home');
})();
