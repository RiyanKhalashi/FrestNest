// FreshNest prototype — Dealer dashboard behaviour (sample data only, nothing is saved)
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var money = function (n) { return '৳' + Math.round(n).toLocaleString('en-IN'); };

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
  function need(el) { if (!el.value.trim()) { el.style.outline = '2px solid var(--clay)'; return false; } return true; }

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

  /* ---------- page navigation ---------- */
  var views = ['home', 'market', 'buys', 'profile'];
  function show(view) {
    if (views.indexOf(view) < 0) view = 'home';
    $$('[data-view]').forEach(function (s) { s.classList.toggle('hidden', s.dataset.view !== view); });
    $$('[data-nav]').forEach(function (a) { a.classList.toggle('on', a.dataset.nav === view); });
    window.scrollTo(0, 0);
  }
  function go(view) { if (location.hash === '#' + view) show(view); else location.hash = view; }
  window.addEventListener('hashchange', function () { show(location.hash.slice(1)); });

  function openDetail(id) {
    $$('[data-detail]').forEach(function (d) { d.classList.toggle('hidden', d.dataset.detail !== id); });
    $$('.item[data-d]').forEach(function (b) { b.classList.toggle('on', b.dataset.d === id); });
  }
  function openListing(id) {
    $$('[data-mdetail]').forEach(function (d) { d.classList.toggle('hidden', d.dataset.mdetail !== id); });
    $$('.item[data-m]').forEach(function (b) { b.classList.toggle('on', b.dataset.m === id); });
  }
  $$('.item[data-d]').forEach(function (b) { b.onclick = function () { openDetail(b.dataset.d); }; });
  $$('.item[data-m]').forEach(function (b) { b.onclick = function () { openListing(b.dataset.m); }; });
  $$('[data-go]').forEach(function (el) {
    el.addEventListener('click', function () { $('#drop').classList.add('hidden'); openDetail(el.dataset.go); go('buys'); });
  });
  $$('[data-mk]').forEach(function (el) {
    el.addEventListener('click', function () { $('#drop').classList.add('hidden'); openListing(el.dataset.mk); go('market'); });
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
     D2 — Marketplace
  ===================================================== */
  function filter() {
    var f = { prod: $('#fProd').value, dist: $('#fDist').value, upa: $('#fUpa').value, mode: $('#fMode').value, store: $('#fStore').value, harv: $('#fHarv').value };
    var items = $$('.item[data-m]'), list = $('#mkList'), sortBy = $('#fSort').value;
    items.sort(function (a, b) { return sortBy === 'near' ? (+a.dataset.km - +b.dataset.km) || (+a.dataset.ord - +b.dataset.ord) : +a.dataset.ord - +b.dataset.ord; })
      .forEach(function (b) { list.insertBefore(b, $('#mkEmpty')); });
    var n = 0, first = null;
    $$('.item[data-m]').forEach(function (b) {
      var ok = Object.keys(f).every(function (k) { return !f[k] || b.dataset[k] === f[k]; });
      b.classList.toggle('hidden', !ok);
      if (ok) { n++; if (!first) first = b; }
    });
    $('#mkCount').textContent = n;
    $('#mkEmpty').classList.toggle('hidden', n > 0);
    if (first) openListing(first.dataset.m);
  }
  function fillUpa() {
    var d = $('#fDist').value, seen = {}, opts = '<option value="">All upazilas</option>';
    $$('.item[data-m]').forEach(function (b) { if ((!d || b.dataset.dist === d) && !seen[b.dataset.upa]) { seen[b.dataset.upa] = 1; opts += '<option>' + b.dataset.upa + '</option>'; } });
    $('#fUpa').innerHTML = opts;
  }
  fillUpa();
  ['#fProd', '#fUpa', '#fMode', '#fStore', '#fHarv', '#fSort'].forEach(function (s) { $(s).onchange = filter; });
  $('#fDist').onchange = function () { fillUpa(); filter(); };
  filter();

  // Bidding boxes
  $$('.bidbox').forEach(function (box) {
    var qty = +box.dataset.qty, inc = +box.dataset.inc, buy = +box.dataset.buy || 0;
    var amt = $('.amt', box);
    function top() { return +box.dataset.top; }
    function upd() { $('.tot', box).textContent = money((+amt.value || 0) * qty); }
    amt.oninput = upd; upd();

    $('[data-bid]', box).onclick = function () {
      if (!canAct()) return;
      var v = +amt.value, min = top() + inc;
      if (!(v >= min)) { toast('Your bid must be at least ৳' + min.toFixed(2) + '/kg (highest + minimum increase).'); return; }
      if (buy && v >= buy) { toast('That is at or above the Buy Now price. Use Buy Now instead.'); return; }
      modal('Place this bid?', '<p><b>৳' + v.toFixed(2) + '/kg</b> for the whole ' + qty.toLocaleString('en-IN') + ' kg = <b>' + money(v * qty) + '</b>.</p><p class="muted" style="margin-top:8px">If you are still the highest bidder when bidding ends, the primary deal is created automatically. You cannot withdraw a bid.</p>', 'Place bid', function () {
        box.dataset.top = v; box.dataset.mine = '1';
        $('.hi', box).textContent = v.toFixed(2);
        $('.mine', box).textContent = '৳' + v.toFixed(2);
        $('.who-top', box).textContent = 'You';
        var st = $('.state', box); if (st) { st.className = 'tag green state'; st.textContent = 'Leading'; }
        var tbl = $('.bids', box.closest('[data-mdetail]'));
        var row = document.createElement('tr');
        row.innerHTML = '<td><b>You</b></td><td class="right num">৳' + v.toFixed(2) + '</td><td class="small">just now</td>';
        tbl.insertBefore(row, tbl.rows[1]);
        amt.value = (v + inc).toFixed(2); upd();
        if (box.dataset.lot === 'brin') { $('#brinTag').className = 'tag green'; $('#brinTag').textContent = 'You lead'; $('#brinTop').textContent = v.toFixed(2); }
        if (buy && v >= buy) $$('.buywrap, .buybtn', box).forEach(function (e) { e.classList.add('hidden'); });
        toast('Bid placed. You are now the highest bidder.');
      });
    };

    var bb = $('[data-buy]', box);
    if (bb) bb.onclick = function () {
      if (!canAct()) return;
      modal('Buy the whole lot now?', '<p>You buy all <b>' + qty.toLocaleString('en-IN') + ' kg at ৳' + buy.toFixed(2) + '/kg = ' + money(buy * qty) + '</b>.</p><p class="muted" style="margin-top:8px">The deal is created instantly. The farmer does not need to approve it. Bidding closes and the other bidders are notified. If another dealer clicks first, they get it.</p>', 'Confirm Buy Now', function () {
        $$('button, input', box).forEach(function (e) { e.disabled = true; });
        $('.hi', box).textContent = buy.toFixed(2);
        $('.who-top', box).textContent = 'You (Buy Now)';
        box.insertAdjacentHTML('afterbegin', '<div class="note good" style="margin-bottom:12px"><b>Deal created.</b> Transport providers can now send offers. Follow it on My Purchases.</div>');
        toast('Bought with Buy Now. A primary deal was created.');
      }, 'gold');
    };
  });

  // Offer form (Jalal potato)
  function oUpd() { $('#oTotal').textContent = money((+$('#oQty').value || 0) * (+$('#oPrice').value || 0)); }
  $('#oQty').oninput = oUpd; $('#oPrice').oninput = oUpd; oUpd();
  $('#oSend').onclick = function () {
    if (!canAct()) return;
    var q = +$('#oQty').value, p = +$('#oPrice').value;
    if (q < 500) { $('#oErr').textContent = 'The minimum order is 500 kg.'; return; }
    if (q > 3000) { $('#oErr').textContent = 'Only 3,000 kg is available.'; return; }
    if (!(p > 0)) { $('#oErr').textContent = 'Enter your price per kg.'; return; }
    $('#oErr').textContent = '';
    $('#offerForm').classList.add('hidden');
    var n = $('#offerSent');
    n.innerHTML = '<b>Offer sent to Jalal Mia:</b> ' + q.toLocaleString('en-IN') + ' kg × ৳' + p.toFixed(2) + ' = ' + money(q * p) + '. He must reply within ' + $('#oTimer').value + '. You can edit or withdraw it until he accepts.';
    n.classList.remove('hidden');
    toast('Offer sent. The farmer has been notified.');
  };

  // Own offer on Karim's potato: edit / withdraw
  $('[data-editoffer]').onclick = function () {
    if (!canAct()) return;
    modal('Edit your offer', '<div class="row"><div class="field"><label>Quantity (kg)</label><input type="number" id="eQty" value="800" min="200" max="800"><small>200 to 800 kg</small></div><div class="field"><label>Price per kg (৳)</label><input type="number" id="ePrice" value="20" step="0.5"></div></div>', 'Save offer', function () {
      var q = +$('#eQty').value, p = +$('#ePrice').value;
      if (q < 200 || q > 800 || !(p > 0)) { toast('Quantity must be 200–800 kg with a price.'); return false; }
      var o = $('#myPotOffer');
      $('h5', o).innerHTML = q.toLocaleString('en-IN') + ' kg × ৳<span class="p">' + p.toFixed(2) + '</span> = ৳<span class="t">' + Math.round(q * p).toLocaleString('en-IN') + '</span>';
      toast('Offer updated. Karim has been notified.');
    });
  };
  $('[data-withdraw]').onclick = function () {
    modal('Withdraw your offer?', '<p>Your offer to Karim Uddin is removed. You can send a new one later while the listing is open.</p>', 'Withdraw', function () {
      var o = $('#myPotOffer');
      $('.acts', o).innerHTML = '<span class="tag plain">Withdrawn</span>';
      $('.st', o).textContent = 'Withdrawn just now';
      toast('Offer withdrawn.');
    }, 'warn');
  };

  /* =====================================================
     D3 — My Purchases
  ===================================================== */
  // Counter-offer
  $('#chiAcc').onclick = function () {
    if (!canAct()) return;
    modal('Accept ৳52/kg?', '<p>300 kg green chili × ৳52.00 = <b>৳15,600</b>. A primary deal is created and transport providers can send offers.</p>', 'Accept', function () {
      $('#chiState').className = 'tag green'; $('#chiState').textContent = 'Accepted: deal FN-1049';
      $('#chiTime').textContent = 'Waiting for transport offers';
      $('#chiBtns').innerHTML = '<span class="small muted">Deal created just now.</span>';
      toast('Counter-offer accepted. Deal FN-1049 created.');
    });
  };
  $('#chiRej').onclick = function () {
    modal('Reject the counter-offer?', '<p>Your offer closes. The farmer cannot counter again, but you can send a new offer while the listing is open.</p>', 'Reject', function () {
      $('#chiState').className = 'tag plain'; $('#chiState').textContent = 'Rejected';
      $('#chiTime').textContent = '';
      $('#chiBtns').innerHTML = '<span class="small muted">You rejected the counter-offer.</span>';
      toast('Counter-offer rejected. Selina Begum has been notified.');
    }, 'warn');
  };

  // Confirm a transport offer
  $$('[data-pick]').forEach(function (b) {
    b.onclick = function () {
      if (!canAct()) return;
      var who = b.dataset.pick;
      modal('Confirm ' + who + '?', '<p>You pay <b>৳' + b.dataset.price + '</b> for transport. The other providers are told their offers were not chosen, and this vehicle is booked.</p><p class="muted" style="margin-top:8px">After this, cancelling the deal needs admin approval.</p>', 'Confirm transport', function () {
        $$('#t2Offers tr').forEach(function (r, i) {
          if (!i) return;
          var btn = $('[data-pick]', r);
          if (btn === b) { r.classList.add('top-row'); btn.parentNode.innerHTML = '<span class="tag green">Chosen</span>'; }
          else { r.classList.add('off'); if (btn) btn.parentNode.innerHTML = ''; }
        });
        $('#t2s1').className = 'done'; $('#t2s2').className = 'now';
        $('#t2State').textContent = 'Transport confirmed';
        $('#t2Win').textContent = 'Pickup 14 Nov by ' + who;
        $('#t2Extend').classList.add('hidden');
        var c = $('#t2Cancel'); c.dataset.booked = '1'; c.textContent = 'Ask admin to cancel this deal';
        $('#t2CancelNote').textContent = 'Transport is booked, so cancelling needs admin approval.';
        toast(who + ' confirmed. The farmer and the provider have been notified.');
      });
    };
  });
  $('#extendBtn').onclick = function () {
    var b = this;
    modal('Extend the offer window?', '<p>Transport providers get 6 more hours to send offers. You can do this only once for this deal.</p>', 'Extend by 6 hours', function () {
      b.disabled = true; b.textContent = 'Window extended (used)';
      var cd = $('#t2Win [data-cd]'); if (cd) cd.dataset.cd = +cd.dataset.cd + 21600;
      toast('Offer window extended by 6 hours.');
    });
  };

  // Cancel deal (same rule as the farmer)
  var cancelReasons = ['Found the produce cheaper elsewhere', 'My buyer cancelled the order', 'Not enough storage space', 'Farmer changed the terms', 'Transport too costly', 'Other'];
  $$('[data-cancel]').forEach(function (b) {
    b.onclick = function () {
      var id = b.dataset.cancel, booked = b.dataset.booked;
      var intro = booked
        ? '<p>Transport is already booked, so an admin must approve the cancellation. The deal continues until the admin decides.</p>'
        : '<p>No transport is booked yet, so the deal is cancelled immediately. The farmer is notified and can relist the produce in one click.</p>';
      var opts = cancelReasons.map(function (r) { return '<option>' + r + '</option>'; }).join('');
      modal((booked ? 'Ask admin to cancel deal ' : 'Cancel deal ') + id + '?', intro +
        '<div class="field" style="margin-top:12px"><label>Reason</label><select id="whyR">' + opts + '</select><small>The farmer sees this reason. It also counts toward your cancellation number.</small></div>' +
        '<div class="field"><label>' + (booked ? 'Explain to the admin' : 'Details <span class="muted" style="font-weight:400">(needed only for Other)</span>') + '</label><textarea id="why" rows="3"></textarea></div>',
        booked ? 'Send request to admin' : 'Cancel the deal', function () {
          if ((booked || $('#whyR').value === 'Other') && !need($('#why'))) return false;
          b.disabled = true;
          b.textContent = booked ? 'Cancellation requested, waiting for admin' : 'Deal cancelled';
          toast(booked ? 'Request sent. An admin will approve or reject it.' : 'Deal ' + id + ' cancelled. The farmer has been notified.');
        }, 'warn');
    };
  });

  // Confirm receipt with delivery code
  $('#p2Recv').onclick = function () {
    var b = this;
    modal('Confirm receipt', '<p>Check and weigh the produce first. Then the driver enters your code <b>7390</b> in their app.</p><div class="field" style="margin-top:12px"><label>Weight received (kg)</label><input type="number" id="rcvKg" value="1000"></div>', 'Delivered and received', function () {
      $('#p2Track').innerHTML = '<div class="done">Primary deal</div><div class="done">Transport confirmed</div><div class="done">Picked up</div><div class="done">In transit</div><div class="done">Delivered</div><div class="done">Completed</div>';
      $('#p2State').className = 'tag green'; $('#p2State').textContent = 'Completed';
      b.disabled = true; b.textContent = 'Receipt confirmed';
      toast('Delivery completed. You can now rate the farmer.');
    });
  };

  /* ---------- reports: reason dropdown, auto-linked to the deal ---------- */
  var reasons = {
    farmer: ['Cancelled without a valid reason', 'Cancelled after transport was booked', 'Produce quality or quantity not as listed', 'Did not hand over the produce at pickup', 'Asked for a higher price after the deal', 'Rude or abusive behaviour', 'Fake or misleading information', 'Other'],
    transporter: ['Late pickup or delivery', 'Produce damaged in transport', 'Asked for extra money', 'Did not show up', 'False delivery failure report', 'Rude or abusive behaviour', 'Other'],
    review: ['Fake or false review', 'Abusive language', 'Review is about a different deal', 'Other']
  };
  $$('[data-report]').forEach(function (b) {
    b.onclick = function (e) {
      e.preventDefault();
      var list = reasons[b.dataset.role] || reasons.farmer;
      var deal = b.dataset.deal ? '<div class="note" style="margin-bottom:12px"><b>Attached automatically:</b> ' + b.dataset.deal + ', dates, status history and messages. You do not need to describe the deal.</div>' : '';
      modal('Report ' + b.dataset.report, deal +
        '<div class="field"><label>Reason</label><select id="rR">' + list.map(function (r) { return '<option>' + r + '</option>'; }).join('') + '</select></div>' +
        '<div class="field"><label>Comment <span class="muted" style="font-weight:400" id="rHint">(optional)</span></label><textarea id="rT" rows="3"></textarea></div>' +
        '<div class="field"><label>Photo or screenshot <span class="muted" style="font-weight:400">(optional)</span></label><input type="file"></div>' +
        '<p class="small muted">An admin reviews every report.</p>', 'Send report', function () {
          if ($('#rR').value === 'Other' && !need($('#rT'))) return false;
          toast('Report sent to the admin team.');
        });
      $('#rR').onchange = function () { $('#rHint').textContent = this.value === 'Other' ? '(required for Other)' : '(optional)'; };
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

  /* ---------- D4 ---------- */
  $('#saveProfile').onclick = function () { toast('Profile saved (prototype only).'); };
  $('#savePass').onclick = function () { toast('Password updated (prototype only).'); };
  $('#reupload').onclick = function () { toast('The file picker would open here.'); };

  /* ---------- start ---------- */
  openDetail('p-tomato2');
  openListing('m-em');
  show(location.hash.slice(1) || 'home');
})();
