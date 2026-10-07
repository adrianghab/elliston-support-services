(function () {
  var EMAIL = 'admin@ellistonsupport.com';

  // Mobile menu
  var nav = document.getElementById('mainnav');
  var menuBtn = document.querySelector('.menu-btn');
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      menuBtn.textContent = open ? 'Close' : 'Menu';
    });
    nav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        nav.classList.remove('open');
        menuBtn.setAttribute('aria-expanded', 'false');
        menuBtn.textContent = 'Menu';
      });
    });
  }

  // Text size (remembered between pages where the browser allows it)
  var sizeBtns = document.querySelectorAll('.textsize button');
  function setSize(s) {
    var root = document.documentElement;
    root.classList.remove('text-lg', 'text-xl');
    if (s) root.classList.add(s);
    sizeBtns.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-size') === s ? 'true' : 'false'); });
    try { localStorage.setItem('ess-size', s); } catch (e) {}
  }
  sizeBtns.forEach(function (b) { b.addEventListener('click', function () { setSize(b.getAttribute('data-size')); }); });
  try { var saved = localStorage.getItem('ess-size'); if (saved) setSize(saved); } catch (e) {}

  var yr = document.getElementById('yr');
  if (yr) yr.textContent = new Date().getFullYear();

  // Contact form
  var form = document.getElementById('enquiry');
  if (!form) return;

  // Pre-select the topic when arriving from a service's "Get in touch" button
  function pickTopic() {
    var slug = (location.hash || '').slice(1);
    if (!slug) return;
    var r = form.querySelector('input[data-slug="' + slug + '"]');
    if (r) r.checked = true;
  }
  pickTopic();
  window.addEventListener('hashchange', pickTopic);

  var err = document.getElementById('f-err');
  var btn = document.getElementById('f-submit');
  var sent = document.getElementById('f-sent');
  var mailNote = document.getElementById('f-mail');

  function val(id) { return document.getElementById(id).value.trim(); }

  function finish(panel, name) {
    panel.querySelectorAll('.d-name').forEach(function (el) { el.textContent = name.split(' ')[0]; });
    form.hidden = true;
    panel.hidden = false;
    panel.focus();
  }

  function emailFallback(d) {
    var subject = 'Website enquiry' + (d.topic ? ': ' + d.topic : '');
    var body = 'Name: ' + d.name + '\nEmail: ' + d.email + (d.phone ? '\nPhone: ' + d.phone : '') +
      (d.topic ? '\nEnquiry about: ' + d.topic : '') + '\n\n' + d.message;
    location.href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    finish(mailNote, d.name);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var topicEl = form.querySelector('input[name=topic]:checked');
    var d = { name: val('f-name'), email: val('f-email'), phone: val('f-phone'), message: val('f-msg'), topic: topicEl ? topicEl.value : '' };
    var ok = d.name && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email) && d.message;
    err.hidden = !!ok;
    if (!ok) {
      var first = !d.name ? 'f-name' : (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email) ? 'f-email' : 'f-msg');
      document.getElementById(first).focus();
      return;
    }
    btn.disabled = true;
    btn.textContent = 'Sending…';

    // Netlify Forms picks this up when the site is hosted on Netlify.
    // Anywhere else, the enquiry opens in the visitor's email app instead.
    var timer;
    var post = fetch(form.getAttribute('action') || '/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(new FormData(form)).toString()
    }).then(function (r) {
      // Only count it as sent when Netlify itself accepted the form (other hosts may answer 200 without storing anything)
      if (!r.ok || !/netlify/i.test(r.headers.get('server') || '')) throw new Error('not accepted');
      return r;
    });
    var timeout = new Promise(function (_, reject) { timer = setTimeout(function () { reject(new Error('timeout')); }, 8000); });

    Promise.race([post, timeout])
      .then(function () { clearTimeout(timer); finish(sent, d.name); })
      .catch(function () { clearTimeout(timer); emailFallback(d); })
      .then(function () { btn.disabled = false; btn.textContent = 'Send enquiry'; });
  });
})();
