/**
 * Device check for the loading screen. The desk needs a computer-class device: it uploads 4K page
 * stills and 4096px textures to the GPU, plays clips on hover and pages with the wheel/keys. When a
 * visitor's device misses one of those, a short notice sits under the loader saying which, and it
 * goes away with the loader if the desk does load. Plain script (no build step) so it also runs if
 * the scene itself can't start.
 */
;(function () {
  var reasons = []
  var mq = function (q) { return window.matchMedia && window.matchMedia(q).matches }

  if (mq('(pointer: coarse)') && !mq('(any-pointer: fine)'))
    reasons.push('a mouse or trackpad (the pages turn with the scroll wheel and play on hover)')

  if (Math.min(window.innerWidth, window.innerHeight) < 600)
    reasons.push('a larger screen, like a laptop or desktop monitor')

  var mem = navigator.deviceMemory
  if (mem && mem < 4) reasons.push('at least 4 GB of memory (this device reports ' + mem + ' GB)')

  try {
    var c = document.createElement('canvas')
    var gl = c.getContext('webgl2') || c.getContext('webgl')
    if (!gl) reasons.push('WebGL, which this browser has turned off')
    else if (gl.getParameter(gl.MAX_TEXTURE_SIZE) < 4096)
      reasons.push('a graphics chip that handles 4096px textures (this one stops at ' + gl.getParameter(gl.MAX_TEXTURE_SIZE) + 'px)')
    var lose = gl && gl.getExtension('WEBGL_lose_context')
    if (lose) lose.loseContext()
  } catch (e) {}

  // phones and small tablets: the 4K pages need more graphics memory than mobile browsers allow
  var phoneish = reasons.length > 0 && (mq('(pointer: coarse)') || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent))
  if (phoneish) reasons.push('more graphics memory than mobile browsers give a web page (the book holds thirteen 4K pages)')

  if (!reasons.length) return

  var css =
    '.req-note{position:fixed;left:50%;top:max(20px,env(safe-area-inset-top));transform:translateX(-50%);z-index:5;' +
    'width:min(440px,calc(100vw - 32px));box-sizing:border-box;padding:16px 18px;border:1px solid rgba(244,244,242,.14);' +
    'background:rgba(10,10,12,.9);color:rgba(244,244,242,.86);font:400 12.5px/1.5 "Inter Tight",system-ui,sans-serif;' +
    'letter-spacing:.01em;transition:opacity .8s ease}' +
    '.req-note b{display:block;font:italic 400 19px/1.2 "Instrument Serif",Georgia,serif;margin-bottom:6px;color:#f4f4f2;letter-spacing:.02em}' +
    '.req-note ul{margin:6px 0 10px;padding-left:18px}.req-note li{margin:2px 0}' +
    '.req-note a{color:#f4f4f2}.req-note.gone{opacity:0;pointer-events:none}'

  function show() {
    var st = document.createElement('style')
    st.textContent = css
    document.head.appendChild(st)
    var el = document.createElement('div')
    el.className = 'req-note'
    el.setAttribute('role', 'note')
    var items = reasons.map(function (r) { return '<li>' + r + '</li>' }).join('')
    el.innerHTML =
      '<b>Best on a computer</b>This desk needs:<ul>' + items + '</ul>' +
      'It may not load or may run slowly here. <a href="/">Back to Lee Thompson</a>'
    document.body.appendChild(el)

    // fade out with the loading screen if the desk does manage to start
    var obs = new MutationObserver(function () {
      var l = document.querySelector('.loader')
      if (l && !l.classList.contains('show')) { el.classList.add('gone'); obs.disconnect() }
    })
    var start = Date.now()
    var t = setInterval(function () {
      var l = document.querySelector('.loader')
      if (l) { clearInterval(t); obs.observe(l, { attributes: true, attributeFilter: ['class'] }) }
      else if (Date.now() - start > 15000) clearInterval(t)
    }, 200)
  }
  if (document.body) show()
  else document.addEventListener('DOMContentLoaded', show)
})()
