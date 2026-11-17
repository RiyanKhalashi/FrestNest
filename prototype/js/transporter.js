// FreshNest prototype — Transport Provider dashboard behaviour (sample data only, nothing is saved)
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- toast + modal ---------- */
  var toastTimer;
  function toast(msg) {
    var t = $('#toast'); t.textContent = msg; t.classList.remove('hidden');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.add('hidden'); }, 3400);
  }
  function modal(title, bodyHtml, okLabel, onOk, okClass) {
    $('#mTitle').textContent = title; $('#mBody').innerHTML = bodyHtml;
    var foot = $('#mFoot'); foot.innerHTML = '';
    var cancel = document.createElement('button'); cancel.className = 'btn ghost'; cancel.textContent = 'Close'; cancel.onclick = closeModal; foot.appendChild(cancel);
    if (okLabel) {
      var ok = document.createElement('button'); ok.className = 'btn ' + (okClass || ''); ok.textContent = okLabel;
      ok.onclick = function () { if (onOk() !== false) closeModal(); }; foot.appendChild(ok);
    }
    $('#veil').classList.remove('hidden');
  }
  function closeModal() { $('#veil').classList.add('hidden'); }
  $('#veil').addEventListener('click', function (e) { if (e.target.id === 'veil') closeModal(); });
  function need(el) { if (!el.value.trim()) { el.style.outline = '2px solid var(--clay)'; return false; } el.style.outline = ''; return true; }

  /* ---------- verification (prototype toggle) ---------- */
  var pending = false;
  $('#pendingToggle').onchange = function () {
    pending = this.checked;
    document.body.classList.toggle('locked', pending);
    $('#pendingBanner').classList.toggle('hidden', !pending);
    $('#verOk').classList.toggle('hidden', pending);
    $('#verPending').classList.toggle('hidden', !pending);
  };
  function canAct() {
    if (pending) { toast('Your account is waiting for admin verification. You cannot do this yet.'); return false; }
    return true;
  }

  /* ---------- navigation ---------- */
  var views = ['home', 'deals', 'trips', 'fleet', 'profile'];
  function show(view) {
    if (views.indexOf(view) < 0) view = 'home';
    $$('[data-view]').forEach(function (s) { s.classList.toggle('hidden', s.dataset.view !== view); });
    $$('[data-nav]').forEach(function (a) { a.classList.toggle('on', a.dataset.nav === view); });
    window.scrollTo(0, 0);
  }
  function go(view) { if (location.hash === '#' + view) show(view); else location.hash = view; }
  window.addEventListener('hashchange', function () { show(location.hash.slice(1)); });

  function openTab(t) {
    $$('[data-tpanel]').forEach(function (p) { p.classList.toggle('hidden', p.dataset.tpanel !== t); });
    $$('#tabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.t === t); });
  }
  $$('#tabs button').forEach(function (b) { b.onclick = function () { openTab(b.dataset.t); }; });

  function openDeal(id) {
    $$('[data-mdetail]').forEach(function (d) { d.classList.toggle('hidden', d.dataset.mdetail !== id); });
    $$('.item[data-m]').forEach(function (b) { b.classList.toggle('on', b.dataset.m === id); });
  }
  $$('.item[data-m]').forEach(function (b) { b.onclick = function () { openDeal(b.dataset.m); }; });

  $$('[data-tab]').forEach(function (el) {
    el.addEventListener('click', function () { $('#drop').classList.add('hidden'); openTab(el.dataset.tab); go('trips'); });
  });
  $$('[data-deal]').forEach(function (el) {
    el.addEventListener('click', function () { $('#drop').classList.add('hidden'); openDeal(el.dataset.deal); go('deals'); });
  });
  $$('[data-nav-go]').forEach(function (el) {
    el.addEventListener('click', function () { $('#drop').classList.add('hidden'); go(el.dataset.navGo); });
  });

  /* ---------- notifications ---------- */
  $('#bell').onclick = function (e) { e.stopPropagation(); $('#drop').classList.toggle('hidden'); };
  document.addEventListener('click', function (e) { if (!$('#drop').contains(e.target)) $('#drop').classList.add('hidden'); });

  /* ---------- countdowns ---------- */
  function fmt(s) {
    if (s <= 0) return 'ended';
    var d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
    if (d) return d + 'd ' + h + 'h ' + m + 'm';
    if (h) return h + 'h ' + m + 'm';
    return m + 'm ' + x + 's';
  }
  function tick() {
    $$('[data-cd]').forEach(function (el) { var s = +el.dataset.cd; el.textContent = fmt(s); if (s > 0) el.dataset.cd = s - 1; });
  }
  tick(); setInterval(tick, 1000);

  /* =====================================================
     T2 — filters
  ===================================================== */
  function filter() {
    var dists = $$('#fDist input:checked').map(function (i) { return i.value; });
    var nd = $('#fNeed').value, st = $('#fState').value, up = $('#fUpa').value, n = 0;
    $$('#dlList .item').forEach(function (b) {
      var ok = dists.indexOf(b.dataset.dist) >= 0 && (!up || b.dataset.upa === up) && (!nd || b.dataset.need === nd) && (!st || b.dataset.state === st);
      b.classList.toggle('hidden', !ok); if (ok) n++;
    });
    $('#dlCount').textContent = n;
    $('#dlEmpty').classList.toggle('hidden', n > 0);
  }
  function fillUpa() {
    var dists = $$('#fDist input:checked').map(function (i) { return i.value; }), cur = $('#fUpa').value, seen = {}, o = '<option value="">All upazilas</option>';
    $$('#dlList .item').forEach(function (b) { if (dists.indexOf(b.dataset.dist) >= 0 && !seen[b.dataset.upa]) { seen[b.dataset.upa] = 1; o += '<option' + (b.dataset.upa === cur ? ' selected' : '') + '>' + b.dataset.upa + '</option>'; } });
    $('#fUpa').innerHTML = o;
  }
  fillUpa();
  $('#fUpa').onchange = filter;
  $$('#fDist input').forEach(function (i) { i.onchange = function () { fillUpa(); filter(); }; });
  $('#fNeed').onchange = filter; $('#fState').onchange = filter;

  /* =====================================================
     T2 — send-offer form (built per deal)
  ===================================================== */
  var vehicles = [
    { id: 'Bogura-Ta 14-0932', name: 'Truck 3 t', fac: 'normal', cap: 3000, busy: [['2026-11-13T07:00', '2026-11-13T14:30']] },
    { id: 'Bogura-Ta 14-1177', name: 'Truck 3 t', fac: 'normal', cap: 3000, busy: [] },
    { id: 'Bogura-Ma 11-2245', name: 'Covered van 2 t', fac: 'vent', cap: 2000, busy: [['2026-11-14T05:30', '2026-11-14T11:00']] }
  ];
  var facName = { normal: 'Normal', vent: 'Ventilated' };
  var summer = false;

  function seasonNote(v) {
    if (!v) return '';
    if (v.fac !== 'normal') return '<div class="note good">Ventilated vehicle: safe in any season.</div>';
    if (summer) return '<div class="note warn"><b>Weather risk (summer).</b> Heat can damage produce in a normal vehicle. Travel at night or early morning, or offer a ventilated vehicle. Advice only: you can still send this offer, and the dealer sees a weather-risk tag.</div>';
    return '<div class="note good"><b>Cost-saving.</b> Winter weather is safe for a normal vehicle. The dealer sees a cost-saving tag on your offer.</div>';
  }

  $$('[data-form]').forEach(function (box) {
    var dealId = box.dataset.form, needF = box.dataset.need, qty = +box.dataset.qty;
    var opts = vehicles.map(function (v, i) {
      var why = '';
      if (needF === 'vent' && v.fac !== 'vent') why = ' (no ventilation)';
      else if (v.cap < qty) why = ' (too small)';
      return '<option value="' + i + '"' + (why ? ' disabled' : '') + '>' + v.name + ' · ' + facName[v.fac] + ' · ' + v.id + why + '</option>';
    }).join('');
    box.innerHTML =
      '<h4>Send a transport offer <small>One offer per deal. You can edit or withdraw it until the dealer confirms.</small></h4>' +
      '<div class="row" style="margin-top:10px"><div class="field"><label>Vehicle</label><select data-v>' + opts + '</select></div>' +
      '<div class="field"><label>Your price (total, paid by the dealer)</label><input type="number" data-p placeholder="e.g. 6500"></div></div>' +
      '<div class="row"><div class="field"><label>Pickup date and time</label><input type="datetime-local" data-t value="' + box.dataset.def + '"></div>' +
      '<div class="field"><label>Estimated delivery</label><input type="datetime-local" data-e></div></div>' +
      '<div class="field"><label>Note for the dealer <small>(optional)</small></label><input type="text" data-n placeholder="e.g. Tarpaulin and 2 loaders included"></div>' +
      '<div data-season style="margin-bottom:12px"></div>' +
      '<button class="btn rust" data-offer>Send offer</button>';
    var sel = $('[data-v]', box);
    var first = $$('option', sel).filter(function (o) { return !o.disabled; })[0];
    if (first) sel.value = first.value;
    function upd() { $('[data-season]', box).innerHTML = seasonNote(vehicles[sel.value]); }
    sel.onchange = upd; upd(); box._upd = upd;

    $('[data-offer]', box).onclick = function () {
      if (!canAct()) return;
      var p = $('[data-p]', box), t = $('[data-t]', box), e = $('[data-e]', box);
      if (!need(p) | !need(t) | !need(e)) { toast('Please fill in price, pickup time and estimated delivery.'); return; }
      if (e.value <= t.value) { toast('Delivery must be after pickup.'); return; }
      var v = vehicles[sel.value];
      var clash = v.busy.some(function (r) { return t.value < r[1] && e.value > r[0]; });
      if (clash) { toast(v.id + ' is already booked at that time. Choose another time or vehicle.'); return; }
      var tag = v.fac === 'normal' ? (summer ? '<span class="tag red">Weather risk</span>' : '<span class="tag green">Cost-saving</span>') : '';
      box.innerHTML = '<div class="note good"><b>Offer sent for ' + dealId + '.</b> ' + v.name + ' <span class="plate">' + v.id + '</span> · ৳' + (+p.value).toLocaleString('en-IN') + ' ' + tag +
        '<br>The farmer and the dealer can see it now. The dealer decides and pays. You find it under My trips → Offers.</div>';
      var item = $('.item[data-m="t-' + dealId.slice(3) + '"]');
      if (item) { item.dataset.state = 'mine'; var tg = $('.tag', item); tg.className = 'tag gold'; tg.textContent = 'Your offer'; }
      toast('Offer sent. The dealer has been notified.');
    };
  });

  $('#summerToggle').onchange = function () {
    summer = this.checked;
    $$('[data-form]').forEach(function (b) { if (b._upd && $('[data-season]', b)) b._upd(); });
    toast(summer ? 'Preview: May (summer). Normal-vehicle offers now show a weather warning.' : 'Back to November (winter).');
  };
  $('#emNotify').onclick = function () { this.disabled = true; this.textContent = 'You will be notified'; toast('We will notify you when transport opens for this emergency.'); };

  /* =====================================================
     T3 — offers: edit / withdraw
  ===================================================== */
  $$('[data-edit]').forEach(function (b) {
    b.onclick = function () {
      if (!canAct()) return;
      var wb = b.closest('.waybill'), priceEl = $('[data-price]', wb);
      modal('Edit offer · ' + b.dataset.edit,
        '<div class="field"><label>Your price (total)</label><input type="number" id="ePrice" value="' + priceEl.textContent.replace(/[^\d]/g, '') + '"></div>' +
        '<div class="field"><label>Note for the dealer <small>(optional)</small></label><input type="text" id="eNote"></div>' +
        '<p class="small muted">You can edit until the dealer confirms a provider. After that the offer is locked.</p>',
        'Save changes', function () {
          var v = $('#ePrice'); if (!need(v)) return false;
          priceEl.textContent = '৳' + (+v.value).toLocaleString('en-IN');
          toast('Offer updated. The dealer and the farmer can see the new price.');
        });
    };
  });
  $$('[data-withdraw]').forEach(function (b) {
    b.onclick = function () {
      if (!canAct()) return;
      modal('Withdraw your offer?', '<p>Your offer for ' + b.dataset.withdraw + ' is removed and the vehicle is free for that time again. You can send a new offer while the window is open.</p>', 'Withdraw', function () {
        var wb = b.closest('.waybill'); wb.style.opacity = '.55';
        var tg = $('.wb-top .tag', wb); tg.className = 'tag plain'; tg.textContent = 'Withdrawn';
        $('.wb-stub .btns', wb).remove();
        toast('Offer withdrawn.');
      }, 'warn');
    };
  });

  /* =====================================================
     T3 — confirmed trip: pickup code + cancel
  ===================================================== */
  function setTrack(el, labels, doneUpTo, nowIdx, failIdx) {
    $$('div', el).forEach(function (d, i) {
      d.className = i < doneUpTo ? 'done' : (i === nowIdx ? 'now' : (i === failIdx ? 'fail' : ''));
      if (labels && labels[i]) d.textContent = labels[i];
    });
  }
  $('[data-pickup]').onclick = function () {
    if (!canAct()) return;
    var c = $('#c45Code');
    if (!/^\d{4}$/.test(c.value)) { c.style.outline = '2px solid var(--clay)'; toast('Enter the 4-digit code the farmer gives you.'); return; }
    setTrack($('#c45Track'), null, 3, 3);
    $('#c45State').textContent = 'In transit'; $('#c45State').className = 'tag rust';
    this.disabled = true; c.disabled = true; this.textContent = 'Picked up';
    $('#c45Cancel').disabled = true;
    toast('Pickup confirmed. The farmer and Rangpur Mart are notified. The trip can no longer be cancelled.');
  };
  $('#c45Cancel').onclick = function () {
    if (!canAct()) return;
    modal('Cancel trip FN-1045?',
      '<p>The deal opens again for transport offers and Rangpur Mart and Abdul Kader are notified. The cancellation is shown on your record.</p>' +
      '<div class="field" style="margin-top:12px"><label>Reason (required)</label><select id="cxR"><option value="">Choose a reason</option><option>Vehicle breakdown before the trip</option><option>Driver not available</option><option>Road closed on the route</option><option>Other</option></select></div>' +
      '<div class="field"><label>Details <small>(optional)</small></label><textarea id="cxD" rows="2"></textarea></div>',
      'Cancel trip', function () {
        if (!need($('#cxR'))) return false;
        $('#c45State').textContent = 'Cancelled by you'; $('#c45State').className = 'tag red';
        setTrack($('#c45Track'), null, 1, -1, 1);
        $('[data-pickup]').disabled = true; $('#c45Cancel').disabled = true;
        toast('Trip cancelled. FN-1045 is open for transport offers again.');
      }, 'warn');
  };

  /* =====================================================
     T3 — on the road: delivery code + failure report
  ===================================================== */
  $('[data-deliver]').onclick = function () {
    if (!canAct()) return;
    var c = $('#r36Code');
    if (c.value !== '7390') { c.style.outline = '2px solid var(--clay)'; toast('The code does not match. Ask Hasan Traders for the code on their screen.'); return; }
    setTrack($('#r36Track'), null, 4, 4);
    $('#r36State').textContent = 'Delivered · waiting for the dealer'; $('#r36State').className = 'tag gold';
    $('#r36Truck').style.left = 'calc(100% - 30px)';
    $('#r36Deliver').innerHTML = '<div class="note good"><b>Delivery recorded.</b> Hasan Traders now confirms receipt, then the trip is completed and Selina Begum can rate you.</div>';
    $('#r36Fail').remove();
    toast('Delivery confirmed with the dealer\'s code.');
  };

  $('#failBtn').onclick = function () {
    if (!canAct()) return;
    modal('Report a delivery failure · FN-1036',
      '<p class="small muted" style="margin-bottom:12px">An admin checks this report. If approved, Selina Begum (the farmer) can sell the potatoes to dealers in your current district. Hasan Traders is told the deal failed.</p>' +
      '<div class="row"><div class="field"><label>Where are you now? (district)</label><select id="fD"><option>Gaibandha</option><option>Bogura</option></select></div>' +
      '<div class="field"><label>What happened?</label><select id="fR"><option value="">Choose</option><option>Breakdown</option><option>Accident</option><option>Road blocked</option><option>Flood</option><option>Strike</option><option>Other</option></select></div></div>' +
      '<div class="row"><div class="field"><label>Product condition</label><select id="fC"><option>Good</option><option>Partly damaged</option><option>Badly damaged</option></select></div>' +
      '<div class="field"><label>Usable quantity (kg)</label><input type="number" id="fQ" value="1000" max="1000"></div></div>' +
      '<div class="field"><label>Can the vehicle still move?</label><div class="checks"><label><input type="radio" name="mv" value="yes" checked> Yes, it can deliver to a new dealer</label><label><input type="radio" name="mv" value="no"> No, a new vehicle is needed</label></div></div>' +
      '<div class="field"><label>Photo proof</label><div class="photos"><div class="add" id="fPh">+ Add photo</div></div></div>' +
      '<p class="small muted">The system adds the remaining shelf life (potato: 40+ days) to your report.</p>',
      'Send to admin', function () {
        if (!need($('#fR'))) return false;
        var q = +$('#fQ').value; if (!(q > 0 && q <= 1000)) { $('#fQ').style.outline = '2px solid var(--clay)'; return false; }
        setTrack($('#r36Track'), ['Transport confirmed', 'Picked up', 'In transit', 'Failure requested', 'Admin check'], 3, 4, 3);
        $('#r36State').textContent = 'Failure requested'; $('#r36State').className = 'tag red';
        $('#r36Deliver').innerHTML = '<div class="note bad"><b>Waiting for an admin.</b> Reason: ' + $('#fR').value + ' in ' + $('#fD').value + ' · ' + q + ' kg usable · vehicle ' + ($('input[name=mv]:checked').value === 'yes' ? 'can still move' : 'cannot move') +
          '. If the admin rejects the report, the trip goes back to In transit and you continue.</div>';
        $('#r36Fail').remove();
        toast('Failure report sent. An admin will check it now.');
      }, 'warn');
    $('#fPh').onclick = function () { toast('The camera or file picker would open here.'); };
  };

  /* =====================================================
     Reports (same dropdown pattern as the other roles)
  ===================================================== */
  var reasons = {
    farmer: ['Not present at pickup', 'Quantity or weight different from the deal', 'Produce not ready or badly packed', 'Rude or abusive behaviour', 'Fake or misleading information', 'Other'],
    dealer: ['Not present at delivery', 'Refused to give the delivery code', 'Refused the produce without a valid reason', 'Rude or abusive behaviour', 'Fake or misleading information', 'Other'],
    review: ['Fake review (trip did not happen like this)', 'Abusive language', 'Other']
  };
  $$('[data-report]').forEach(function (b) {
    b.onclick = function (e) {
      e.preventDefault();
      var role = b.dataset.role, deal = b.dataset.deal;
      modal('Report ' + b.dataset.report,
        (deal ? '<div class="note" style="margin-bottom:12px">Attached automatically: <b>' + deal + '</b>, route, times and codes.</div>' : '') +
        '<div class="field"><label>Reason</label><select id="rR"><option value="">Choose a reason</option>' + reasons[role].map(function (r) { return '<option>' + r + '</option>'; }).join('') + '</select></div>' +
        '<div class="field"><label>Comment <small id="rHint">(optional)</small></label><textarea id="rC" rows="3"></textarea></div>' +
        '<div class="field"><label>Photo or screenshot <small>(optional)</small></label><div class="photos"><div class="add">+ Add</div></div></div>',
        'Send report', function () {
          if (!need($('#rR'))) return false;
          if ($('#rR').value === 'Other' && !need($('#rC'))) return false;
          toast('Report sent to the admin team.');
        });
      $('#rR').onchange = function () { $('#rHint').textContent = this.value === 'Other' ? '(required for Other)' : '(optional)'; };
    };
  });

  /* =====================================================
     T4 — vehicles
  ===================================================== */
  function vehForm(v) {
    v = v || {};
    return '<div class="row"><div class="field"><label>Vehicle type</label><select><option>Pickup</option><option>Mini truck</option><option' + (v.t === 'Truck' ? ' selected' : '') + '>Truck</option><option' + (v.t === 'Covered van' ? ' selected' : '') + '>Covered van</option></select></div>' +
      '<div class="field"><label>Load capacity (kg)</label><input type="number" value="' + (v.cap || '') + '"></div></div>' +
      '<div class="row"><div class="field"><label>Facility</label><select><option' + (v.f === 'Normal' ? ' selected' : '') + '>Normal</option><option' + (v.f === 'Ventilated' ? ' selected' : '') + '>Ventilated</option><option>Refrigerated</option></select></div>' +
      '<div class="field"><label>Registration number</label><input type="text" id="vReg" value="' + (v.reg || '') + '" placeholder="e.g. Bogura-Ta 14-0000"></div></div>' +
      '<div class="field"><label>Operating districts</label><div class="checks"><label><input type="checkbox" checked> Bogura</label><label><input type="checkbox"> Gaibandha</label><label><input type="checkbox"> Joypurhat</label><label><input type="checkbox"> Rangpur</label><label><input type="checkbox"> Sirajganj</label><label><input type="checkbox"> Dhaka</label></div></div>' +
      '<div class="field"><label>Registration papers</label><div class="photos"><div class="add">+ Upload</div></div></div>';
  }
  $$('[data-veh]').forEach(function (b) {
    b.onclick = function () {
      var id = b.dataset.veh, van = id.indexOf('Ma') > 0;
      modal('Edit vehicle · ' + id, vehForm({ t: van ? 'Covered van' : 'Truck', cap: van ? 2000 : 3000, f: van ? 'Ventilated' : 'Normal', reg: id }) +
        '<p class="small muted">Changing type, capacity or facility sends the vehicle to an admin for checking again.</p>', 'Save', function () { toast('Vehicle saved (prototype only).'); });
    };
  });
  $('#addVeh').onclick = function () {
    modal('Add a vehicle', vehForm() + '<p class="small muted">The vehicle can be offered after an admin checks its registration papers.</p>', 'Add vehicle', function () {
      if (!need($('#vReg'))) return false;
      toast('Vehicle added. Waiting for admin check of the papers.');
    });
  };

  /* ---------- T5 ---------- */
  $('#saveProfile').onclick = function () { toast('Profile saved (prototype only).'); };
  $('#savePass').onclick = function () { toast('Password updated (prototype only).'); };
  $('#reupload').onclick = function () { toast('The file picker would open here.'); };

  /* ---------- start ---------- */
  openTab('offers');
  openDeal('t-1050');
  show(location.hash.slice(1) || 'home');
})();
