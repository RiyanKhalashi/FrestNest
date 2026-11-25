// FreshNest prototype — Farmer dashboard behaviour (sample data only, nothing is saved)
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- toast + modal ---------- */
  var toastTimer;
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.add('hidden'); }, 3200);
  }
  function modal(title, bodyHtml, okLabel, onOk, okClass) {
    $('#mTitle').textContent = title;
    $('#mBody').innerHTML = bodyHtml;
    var foot = $('#mFoot');
    foot.innerHTML = '';
    var cancel = document.createElement('button');
    cancel.className = 'btn ghost'; cancel.textContent = 'Close';
    cancel.onclick = closeModal;
    foot.appendChild(cancel);
    if (okLabel) {
      var ok = document.createElement('button');
      ok.className = 'btn ' + (okClass || ''); ok.textContent = okLabel;
      ok.onclick = function () { if (onOk() !== false) closeModal(); };
      foot.appendChild(ok);
    }
    $('#veil').classList.remove('hidden');
  }
  function closeModal() { $('#veil').classList.add('hidden'); }
  $('#veil').addEventListener('click', function (e) { if (e.target.id === 'veil') closeModal(); });

  /* ---------- page navigation ---------- */
  var views = ['home', 'create', 'sales', 'profile'];
  function show(view) {
    if (views.indexOf(view) < 0) view = 'home';
    $$('[data-view]').forEach(function (s) { s.classList.toggle('hidden', s.dataset.view !== view); });
    $$('[data-nav]').forEach(function (a) { a.classList.toggle('on', a.dataset.nav === view); });
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', function () { show(location.hash.slice(1)); });

  /* ---------- My Sales: list + detail ---------- */
  function openDetail(id) {
    $$('[data-detail]').forEach(function (d) { d.classList.toggle('hidden', d.dataset.detail !== id); });
    $$('.item').forEach(function (b) { b.classList.toggle('on', b.dataset.d === id); });
  }
  $$('.item').forEach(function (b) { b.onclick = function () { openDetail(b.dataset.d); }; });
  $$('[data-go]').forEach(function (el) {
    el.addEventListener('click', function () {
      $('#drop').classList.add('hidden');
      openDetail(el.dataset.go);
      if (location.hash === '#sales') show('sales'); else location.hash = 'sales';
    });
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
    $$('[data-cd]').forEach(function (el) {
      var s = +el.dataset.cd;
      el.textContent = fmt(s);
      if (s > 0) el.dataset.cd = s - 1;
    });
  }
  tick(); setInterval(tick, 1000);

  /* =====================================================
     F2 — Create listing
  ===================================================== */
  var NOW = new Date(2026, 10, 13, 10, 50);
  var products = {
    Vegetable: [
      { n: 'Tomato', shelf: 7, store: 'Ventilated' }, { n: 'Potato', shelf: 60, store: 'Normal' },
      { n: 'Cauliflower', shelf: 6, store: 'Ventilated' }, { n: 'Brinjal', shelf: 7, store: 'Ventilated' },
      { n: 'Green chili', shelf: 5, store: 'Ventilated' }, { n: 'Onion', shelf: 30, store: 'Normal' }
    ],
    Fruit: [
      { n: 'Strawberry', shelf: 3, store: 'Refrigerated' }, { n: 'Litchi', shelf: 3, store: 'Refrigerated' },
      { n: 'Mango', shelf: 6, store: 'Ventilated' }, { n: 'Banana', shelf: 5, store: 'Ventilated' },
      { n: 'Guava', shelf: 8, store: 'Ventilated' }
    ]
  };
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function nice(d) {
    var h = d.getHours(), m = d.getMinutes();
    return d.getDate() + ' ' + MONTHS[d.getMonth()] + ', ' + ((h % 12) || 12) + ':' + (m < 10 ? '0' : '') + m + (h < 12 ? ' AM' : ' PM');
  }
  function toLocal(d) {
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function money(n) { return '৳' + Math.round(n).toLocaleString('en-US'); }

  var rec, safe, dlTouched = false;

  function fillProducts() {
    $('#prod').innerHTML = products[$('#cat').value].map(function (p) { return '<option>' + p.n + '</option>'; }).join('');
  }
  function current() {
    if ($('#custom').checked) {
      var shelf = +$('#cShelf').value;
      if (!shelf || shelf < 1) return null;
      return { n: $('#cName').value.trim() || 'Your product', shelf: shelf, store: $('#cStore').value, custom: true };
    }
    return products[$('#cat').value].filter(function (p) { return p.n === $('#prod').value; })[0];
  }
  function scope() { return $('#sc2').checked ? 'nation' : $('#sc0').checked ? 'upazila' : 'district'; }
  function mode() { return $('#m2').checked ? 'own' : 'bid'; }

  function refresh(fromProduct) {
    var p = current();
    var harvest = new Date($('#harvest').value + 'T06:00');
    var days = Math.round((harvest - NOW) / 86400000);
    $('#harvestHint').textContent = isNaN(days) ? '' : days > 0 ? 'Before harvest: in ' + days + ' day' + (days > 1 ? 's' : '') : days === 0 ? 'Harvest is today' : 'Already harvested: the shelf-life countdown is running';

    // auto info + scope suggestion
    if (!p) {
      $('#autoInfo').innerHTML = '<div class="note warn"><b>Your product is not in the list.</b> Enter its shelf life and the vehicle it needs. Until then, suggestions, the safe deadline and vehicle matching are not available.</div>';
      $('#scopeTip').innerHTML = '';
      $('#sc2hint').textContent = 'Dealers in all 64 districts';
    } else {
      $('#autoInfo').innerHTML = '<div class="note"><b>' + p.n + (p.custom ? ' (your own values)' : '') + ':</b> shelf life about <b>' + p.shelf + ' days</b> after harvest · long-distance storage: <b>' + p.store + '</b> vehicle</div>';
      var tip, want;
      if (p.shelf > 14) { tip = 'It keeps well. <b>Nationwide</b> is suggested, and a normal vehicle is fine.'; want = 'nation'; $('#sc2hint').textContent = 'All 64 districts · normal vehicle is fine'; }
      else { tip = '<b>Within district</b> is suggested (a normal vehicle is enough). Nationwide is possible only with a <b>' + p.store.toLowerCase() + '</b> vehicle.'; want = 'district'; $('#sc2hint').textContent = 'All 64 districts · needs a ' + p.store.toLowerCase() + ' vehicle'; }
      $('#scopeTip').innerHTML = '<div class="note good"><b>Suggestion for ' + p.n + ' (' + p.shelf + ' days):</b> ' + tip + ' You can choose differently.</div>';
      if (fromProduct) { $(want === 'nation' ? '#sc2' : '#sc1').checked = true; }
    }
    $('#nearBox').classList.toggle('hidden', scope() !== 'district');
    $('#upaBox').classList.toggle('hidden', scope() !== 'upazila');

    // season tip (November = winter). Only about normal vehicles.
    var normalOk = !p || scope() === 'district' || p.store === 'Normal';
    $('#weatherTip').innerHTML = normalOk
      ? '<div class="note good"><b>Winter season:</b> good weather for transport. A normal vehicle is enough for this listing and saves cost.</div>'
      : '';

    // deadlines
    $('#bidBox').classList.toggle('hidden', mode() !== 'bid');
    $('#ownBox').classList.toggle('hidden', mode() !== 'own');
    $('#priceHint').textContent = mode() === 'bid' ? 'Base price: bids start here' : 'Asking price: dealers may offer differently';
    var minHours = scope() === 'nation' ? 24 : 12;
    var earliest = new Date(NOW.getTime() + minHours * 3600000);
    rec = new Date(harvest); rec.setDate(rec.getDate() - 1); rec.setHours(20, 0, 0, 0);
    if (rec < earliest) rec = earliest;
    if (p) {
      safe = new Date(harvest.getTime() + (p.shelf * 0.6 - 1.5) * 86400000);
      safe.setMinutes(0, 0, 0);
      if (safe < earliest) safe = earliest;
      if (rec > safe) rec = safe;
      $('#dlSafe').classList.remove('hidden');
      $('#dlSafe').innerHTML = '<b>Latest safe deadline: ' + nice(safe) + '.</b> After this the dealer would receive ' + p.n.toLowerCase() + ' with less than 40% of its shelf life left.';
    } else { safe = null; $('#dlSafe').classList.add('hidden'); }
    $('#dlRec').innerHTML = '<b>Recommended deadline: ' + nice(rec) + '.</b> ' + (days > 0 ? 'Bidding ends before harvest, so the vehicle can collect on harvest day. ' : '') + 'Minimum bidding time is ' + minHours + ' hours for this visibility. <a href="#" id="useRec">Use this</a>';
    $('#useRec').onclick = function (e) { e.preventDefault(); dlTouched = false; refresh(); };
    if (!dlTouched) $('#deadline').value = toLocal(rec);
    var chosen = new Date($('#deadline').value);
    var w = $('#dlWarn');
    if (safe && chosen > safe) { w.classList.remove('hidden'); w.innerHTML = '<b>This deadline is after the safe time.</b> The dealer may receive produce with too little shelf life left, and you may get lower bids. You can still publish.'; }
    else if (chosen < earliest) { w.classList.remove('hidden'); w.innerHTML = '<b>Too short.</b> Bidding must stay open at least ' + minHours + ' hours so dealers have time to bid.'; }
    else w.classList.add('hidden');

    // Buy Now must be above the base price
    var bn = +$('#buynow').value, pr = +$('#price').value;
    $('#buyHint').textContent = bn && bn <= pr ? 'Must be higher than the base price' : 'A dealer paying this gets the deal instantly';
    $('#buyHint').style.color = bn && bn <= pr ? 'var(--clay)' : '';

    // summary
    var near = $$('#near input:checked').map(function (i) { return i.parentNode.textContent; });
    var extra = $$('#targets label').map(function (l) { return l.dataset.name; });
    var where = scope() === 'nation' ? 'Nationwide' : scope() === 'upazila' ? ['Bogura Sadar'].concat($$('#upaNear input:checked').map(function (i) { return i.parentNode.textContent; })).join(', ') + ' (upazilas)' : ['Bogura'].concat(near, extra).join(', ');
    var qty = +$('#qty').value || 0;
    var rows = [
      ['Product', p ? p.n : 'Not from the list'],
      ['Harvest', isNaN(harvest) ? '—' : harvest.getDate() + ' ' + MONTHS[harvest.getMonth()]],
      ['Quantity', qty.toLocaleString('en-US') + ' kg'],
      ['Price', '৳' + pr.toFixed(2) + ' / kg'],
      ['Visible to', where],
      ['Selling', mode() === 'bid' ? 'Bidding (whole lot)' : 'My own price']
    ];
    if (mode() === 'bid') { rows.push(['Deadline', nice(chosen)]); rows.push(['Winner', 'Highest bid']); if (bn) rows.push(['Buy Now', '৳' + bn.toFixed(2) + ' / kg']); }
    else { rows.push(['Min. order', (+$('#minOrder').value || 0) + ' kg']); rows.push(['Response', 'At least ' + $('#minResp').value]); }
    $('#sum').innerHTML = rows.map(function (r) { return '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>'; }).join('');
    $('#sumTotal').textContent = money(qty * pr);
  }

  fillProducts();
  $('#cat').onchange = function () { fillProducts(); refresh(true); };
  $('#prod').onchange = function () { refresh(true); };
  $('#custom').onchange = function () {
    var on = this.checked;
    $('#customBox').classList.toggle('hidden', !on);
    $('#cat').disabled = $('#prod').disabled = on;
    refresh(true);
  };
  $('#cShelf').oninput = $('#cStore').onchange = function () { refresh(true); };
  $('#cName').oninput = function () { refresh(); };
  $('#deadline').oninput = function () { dlTouched = true; refresh(); };
  ['harvest', 'qty', 'price', 'buynow', 'minOrder', 'minResp', 'inc'].forEach(function (id) { $('#' + id).oninput = function () { refresh(); }; });
  $$('input[name=scope], input[name=mode], #near input, #upaNear input').forEach(function (i) { i.onchange = function () { refresh(); }; });
  $('#target').onchange = function () {
    var v = this.value; this.value = '';
    if (!v || $$('#targets label').some(function (l) { return l.dataset.name === v; })) return;
    var l = document.createElement('label');
    l.dataset.name = v; l.textContent = v + '  ×'; l.title = 'Remove';
    l.onclick = function () { l.remove(); refresh(); };
    $('#targets').appendChild(l); refresh();
  };
  var photoN = 0, photoCols = ['#7d8b3c', '#a8672a', '#59703f'];
  $('#addPhoto').onclick = function () {
    var d = document.createElement('div');
    d.style.background = photoCols[photoN % 3]; d.textContent = 'photo-' + (++photoN + 2) + '.jpg';
    $('#photos').insertBefore(d, this);
  };
  $('#publish').onclick = function () {
    var p = current();
    modal('Publish this listing?', '<p>Dealers in the area you chose will see it straight away. You can edit or withdraw it until the first bid or offer arrives.</p>', 'Publish', function () {
      toast((p ? p.n : 'Your product') + ' is listed. In the real site it would now appear in My Sales.');
      location.hash = 'sales';
    });
  };
  $('#draft').onclick = function () { toast('Draft saved (prototype only).'); };
  refresh(true);

  /* =====================================================
     F3 — My Sales interactions
  ===================================================== */
  // Tomato: choose winner after the deadline
  $('#skip').onclick = function () {
    $('#tomLead').textContent = 'Winner';
    $('#tomState').textContent = 'Primary deal made'; $('#tomState').className = 'tag green';
    $('#tomEnds').textContent = 'Closed 14 Nov, 8:00 PM';
    $('#tomNote').className = 'note good';
    $('#tomNote').innerHTML = '<b>Bidding has closed. Hasan Traders won with the highest bid, ৳28.00/kg.</b> The primary deal was created automatically, the other bidders were notified, and the deal is now open for transport offers.';
    this.classList.add('hidden');
    toast('Primary deal created with Hasan Traders (highest bid).');
  };

  // Potato: accept / counter / reject
  var potLeft = 800;
  function potUpdate() {
    $('#potLeft').textContent = potLeft.toLocaleString('en-US');
    $('#potSold').textContent = (2000 - potLeft).toLocaleString('en-US');
    $('#potBar').style.width = ((2000 - potLeft) / 20) + '%';
    $$('.offer[data-qty]').forEach(function (o) {
      if (!o.dataset.done && +o.dataset.qty > potLeft) finish(o, 'Cancelled automatically: not enough quantity left. The dealer has been notified.', 'Cancelled', 'plain', true);
    });
    if (potLeft === 0) { $('#potState').textContent = 'Sold out · listing closed'; $('#potState').className = 'tag plain'; }
  }
  function finish(o, text, tag, colour, dead) {
    o.dataset.done = 1;
    $('.st', o).textContent = text;
    $('.acts', o).innerHTML = '<span class="tag ' + colour + '">' + tag + '</span>';
    $('.counter', o).classList.add('hidden');
    if (dead) o.classList.add('dead');
  }
  $$('.offer[data-qty]').forEach(function (o) {
    var name = $('h5', o).firstChild.textContent.trim();
    $('[data-acc]', o).onclick = function () {
      var q = +o.dataset.qty;
      modal('Accept this offer?', '<p><b>' + name + '</b> buys <b>' + q + ' kg</b> at <b>৳' + $('.p', o).textContent + '/kg</b>.</p><p class="muted" style="margin-top:8px">It becomes a separate deal with its own transport.</p>', 'Accept offer', function () {
        finish(o, 'Accepted just now · became a new deal', 'Accepted', 'green');
        potLeft -= q; potUpdate();
        toast('Offer accepted. ' + potLeft + ' kg left on this listing.');
      });
    };
    $('[data-cnt]', o).onclick = function () { $('.counter', o).classList.toggle('hidden'); };
    $('[data-send]', o).onclick = function () {
      var v = (+$('.counter input', o).value).toFixed(2);
      $('.counter', o).classList.add('hidden');
      $('[data-cnt]', o).disabled = true; $('[data-cnt]', o).textContent = 'Counter sent';
      var st = $('.st', o);
      st.innerHTML = 'You countered at <b class="num">৳' + v + '/kg</b>. Waiting for the dealer · ' + st.innerHTML.replace('Expires in', 'their timer ends in');
      toast('Counter-offer sent to ' + name + '. You can counter only once.');
    };
    $('[data-rej]', o).onclick = function () { finish(o, 'You rejected this offer.', 'Rejected', 'red', true); };
  });

  // Cauliflower suggestions
  $$('[data-sug]').forEach(function (b) {
    b.onclick = function () {
      var k = b.dataset.sug;
      if (k === 'price') { $('#cauPrice').innerHTML = '৳27.00 / kg <span class="muted small">(was ৳30.00)</span>'; toast('Price reduced to ৳27.00/kg. Dealers were notified.'); }
      if (k === 'scope') { $('#cauScope').textContent = 'Bogura, Joypurhat, Gaibandha · normal vehicle is fine'; toast('Listing narrowed to within district.'); }
      if (k === 'dl') { $('#cauDl').textContent = '14 Nov, 12:00 PM (extended once)'; toast('Deadline extended. It cannot be extended again.'); }
      if (k === 'mode') { $('#cauMode').textContent = 'My own price'; $('#cauDl').textContent = 'Open until sold or expired'; toast('Switched to your own price. Dealers can now offer part of the quantity.'); }
      b.disabled = true; b.textContent = 'Done';
    };
  });

  // Emergency sale
  function emPrice() { return (60 * (1 - (+$('#emDrop').value || 0) / 100)).toFixed(2); }
  $('#emDrop').oninput = function () { $('#emStart').textContent = '৳' + emPrice(); };
  $('#emGo').onclick = function () {
    modal('Start the emergency sale?', '<p>380 kg green chili goes to verified dealers in <b>Sirajganj</b>, starting at <b>৳' + emPrice() + '/kg</b> for <b>' + $('#emDur').value + '</b>.</p><p class="muted" style="margin-top:8px">' + 'The highest bid wins automatically.' + '</p>', 'Start now', function () {
      $('#emSetup').classList.add('hidden'); $('#emLive').classList.remove('hidden');
      $('#emStart2').textContent = '৳' + emPrice();
      $('#chStep').textContent = 'Emergency sale live';
      toast('Emergency sale started. Sirajganj dealers were notified.');
    }, 'gold');
  };

  // Cancel deal / report
  $$('[data-cancel]').forEach(function (b) {
    b.onclick = function () {
      var id = b.dataset.cancel, booked = b.dataset.booked;
      var intro = booked
        ? '<p>Transport is already booked for this deal, so an admin must approve the cancellation. The deal continues until the admin decides.</p>'
        : '<p>No transport is booked yet, so the deal is cancelled immediately. The dealer is notified.</p>';
      var label = booked ? 'Why do you need to cancel? (the admin reads this)' : 'Reason (kept for the admin records)';
      modal((booked ? 'Ask admin to cancel deal ' : 'Cancel deal ') + id + '?', intro + '<div class="field" style="margin-top:12px"><label>' + label + '</label><textarea id="why" rows="3" placeholder="e.g. Part of the crop was damaged by rain"></textarea></div>', booked ? 'Send request to admin' : 'Cancel the deal', function () {
        if (!$('#why').value.trim()) { $('#why').style.outline = '2px solid var(--clay)'; return false; }
        b.disabled = true;
        b.textContent = booked ? 'Cancellation requested, waiting for admin' : 'Deal cancelled';
        toast(booked ? 'Request sent. An admin will approve or reject it.' : 'Deal ' + id + ' cancelled. The dealer has been notified.');
      }, 'warn');
    };
  });
  $$('[data-report]').forEach(function (b) {
    b.onclick = function (e) {
      e.preventDefault();
      modal('Report ' + b.dataset.report, '<div class="field"><label>What went wrong?</label><select><option>Did not keep the agreement</option><option>Rude or abusive behaviour</option><option>Suspected fake account</option><option>Unfair or false review</option><option>Other</option></select></div><div class="field"><label>Details</label><textarea rows="3" placeholder="Describe what happened"></textarea></div><p class="small muted">An admin reviews every report.</p>', 'Send report', function () { toast('Report sent to the admin team.'); });
    };
  });

  // Reviews
  $$('.rate').forEach(function (r) {
    var stars = $$('button', r);
    stars.forEach(function (s, i) { s.onclick = function () { r.dataset.v = i + 1; stars.forEach(function (x, j) { x.classList.toggle('on', j <= i); }); }; });
  });
  $$('[data-review]').forEach(function (b) {
    b.onclick = function () {
      var box = b.parentNode, v = $('.rate', box).dataset.v, text = $('textarea', box).value.trim();
      if (!v || !text) { toast('Please give both a star rating and a written comment.'); return; }
      b.disabled = true; b.textContent = 'Review submitted';
      toast('Thank you. Your review is published.');
    };
  });

  /* ---------- F4 ---------- */
  $('#upaAll').onclick = function (e) { e.preventDefault(); $$('#upaNear input').forEach(function (i) { i.checked = true; }); refresh(); };
  $('#partnerOn').onchange = function () {
    var on = this.checked;
    $('#partnerState').textContent = on ? 'On. Verified companies can send you offers in your notifications. Your phone number stays hidden.' : 'Off. Companies see your area only inside upazila totals, without your name.';
    toast(on ? 'Agri partner offers turned on. You can turn them off any time.' : 'Agri partner offers turned off. No more company messages.');
  };
  $('#saveProfile').onclick = function () { toast('Profile saved (prototype only).'); };
  $('#savePass').onclick = function () { toast('Password updated (prototype only).'); };
  $('#photoBtn').onclick = function () { toast('The photo picker would open here.'); };

  /* ---------- start ---------- */
  openDetail('l-tomato');
  show(location.hash.slice(1) || 'home');
})();
