(function () {
  'use strict';

  // =========================================================================
  // 1. UNITY WEBGL BACKGROUND PRELOADER, CACHE TRACKER & MODAL CONTROLLER
  // =========================================================================
  var demoModal = document.getElementById('unity-demo-modal');
  var loadingOverlay = document.getElementById('demo-loading-overlay');
  var unityIframe = document.getElementById('unity-preload-iframe');

  // Progress UI Elements inside Loading Overlay
  var loaderBarFill = document.getElementById('loader-bar-fill');
  var loaderPctText = document.getElementById('loader-pct');
  var loaderPhaseText = document.getElementById('loader-phase');
  var loaderBytesText = document.getElementById('loader-bytes');
  var loaderTipText = document.getElementById('loader-tip');
  var stepPills = [
    document.getElementById('loader-step-1'),
    document.getElementById('loader-step-2'),
    document.getElementById('loader-step-3'),
    document.getElementById('loader-step-4')
  ];

  // Background Cache Indicators on Main Page (Navbar + Player Card)
  var navStatusDot = document.getElementById('nav-status-dot');
  var navCacheText = document.getElementById('nav-cache-text');
  var playerCacheChip = document.getElementById('player-cache-chip');
  var playerMiniBar = document.getElementById('player-mini-bar');
  var playerMiniPct = document.getElementById('player-mini-pct');
  var playerMiniLabel = document.getElementById('player-mini-label');

  var actualProgress = 0;
  var isEngineReady = false;
  var isModalOpen = false;
  var hasRevealedOnce = false;
  var displayProgress = 0;
  var smoothSweepTimer = null;

  var loadingTips = [
    'Tip: DGSelf evaluates avatar style, role, and outfit compatibility at world entry.',
    'Tip: Carry multiple 3D identities in your personal DGSelf Avatar Hub and switch per world.',
    'Tip: When an avatar is blocked, DGSelf’s Explainability Layer tells you why in plain language.',
    'Tip: Developers preserve their world’s creative vision without sacrificing avatar interoperability.'
  ];
  var tipIndex = 0;
  setInterval(function () {
    if (!isModalOpen || !loaderTipText) return;
    tipIndex = (tipIndex + 1) % loadingTips.length;
    loaderTipText.textContent = loadingTips[tipIndex];
  }, 4200);

  function formatMB(bytes) {
    if (!bytes || bytes <= 0) return '0.0 MB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function getPhaseLabel(pct, ready) {
    if (ready || pct >= 100) {
      return 'Experience Ready — Entering 3D Avatar Hub...';
    }
    if (pct < 25) {
      return 'Downloading & Caching Core WebAssembly & SDK Gateway...';
    }
    if (pct < 65) {
      return 'Streaming & Caching 3D Avatar & World Asset Bundles...';
    }
    if (pct < 90) {
      return 'Decompressing Brotli Archives & Mounting Virtual Filesystem...';
    }
    return 'Initializing WebGL 2.0 Renderer & DGSelf AI Identity Hub...';
  }

  function updateStepPills(pct, ready) {
    var thresholds = [15, 55, 85, 100];
    for (var i = 0; i < stepPills.length; i++) {
      var pill = stepPills[i];
      if (!pill) continue;
      pill.classList.remove('active', 'done');
      if (ready || pct >= thresholds[i]) {
        pill.classList.add('done');
      } else if (i === 0 || pct >= thresholds[i - 1]) {
        pill.classList.add('active');
      }
    }
  }

  function renderModalProgress(pct, loadedBytes, totalBytes, ready) {
    var clamped = Math.max(0, Math.min(100, Math.round(pct)));
    if (loaderBarFill) loaderBarFill.style.width = clamped + '%';
    if (loaderPctText) loaderPctText.textContent = clamped + '%';
    if (loaderPhaseText) loaderPhaseText.textContent = getPhaseLabel(clamped, ready);

    if (loaderBytesText) {
      if (ready || clamped >= 100) {
        loaderBytesText.textContent = 'Cached in Browser • WebGL 2.0 Ready';
      } else if (loadedBytes > 0 && totalBytes > 0) {
        loaderBytesText.textContent = formatMB(loadedBytes) + ' / ' + formatMB(totalBytes) + ' cached';
      } else if (loadedBytes > 0) {
        loaderBytesText.textContent = formatMB(loadedBytes) + ' downloaded & cached';
      } else {
        loaderBytesText.textContent = 'Pre-caching WebGL 2.0 assets (' + clamped + '%)';
      }
    }

    updateStepPills(clamped, ready);
  }

  function updateBackgroundIndicators(progress, ready) {
    var pct = ready ? 100 : Math.min(99, Math.max(1, Math.round(progress * 100)));

    if (playerMiniBar) {
      playerMiniBar.style.width = pct + '%';
      if (ready) playerMiniBar.classList.add('ready');
    }
    if (playerMiniPct) {
      playerMiniPct.textContent = pct + '%';
    }

    if (ready) {
      if (navStatusDot) navStatusDot.classList.add('ready');
      if (navCacheText) navCacheText.textContent = 'WebGL Demo Cached & Ready';
      if (playerCacheChip) {
        playerCacheChip.textContent = '✓ Cached & Ready';
        playerCacheChip.classList.add('cached');
      }
      if (playerMiniLabel) {
        playerMiniLabel.textContent = '3D WebGL Demo pre-cached in background (Instant Launch)';
      }
    } else {
      if (navCacheText) navCacheText.textContent = 'Pre-caching Demo: ' + pct + '%';
      if (playerCacheChip) playerCacheChip.textContent = 'Pre-caching • ' + pct + '%';
      if (playerMiniLabel) {
        playerMiniLabel.textContent = 'Background pre-downloading & caching Unity WebGL demo...';
      }
    }
  }

  function revealUnityCanvas() {
    if (!isModalOpen) return;
    hasRevealedOnce = true;
    renderModalProgress(100, 0, 0, true);
    setTimeout(function () {
      if (!isModalOpen) return;
      if (loadingOverlay) {
        loadingOverlay.classList.add('loaded-hidden');
      }
      activateIframeAudioAndFocus(true);
    }, 320);
  }

  function activateIframeAudioAndFocus(active) {
    if (!unityIframe || !unityIframe.contentWindow) return;
    try {
      unityIframe.contentWindow.postMessage({
        type: active ? 'DGSELF_DEMO_SHOW' : 'DGSELF_DEMO_HIDE'
      }, '*');
      if (unityIframe.contentWindow.dgselfUnityState && typeof unityIframe.contentWindow.dgselfUnityState.setActive === 'function') {
        unityIframe.contentWindow.dgselfUnityState.setActive(active);
      }
    } catch (e) {}
  }

  function handleProgressUpdate(progress, loadedBytes, totalBytes, ready) {
    if (typeof progress === 'number' && !isNaN(progress)) {
      actualProgress = Math.max(actualProgress, progress);
    }
    if (ready) {
      isEngineReady = true;
      actualProgress = 1;
    }

    updateBackgroundIndicators(actualProgress, isEngineReady);

    // If modal is currently open and not doing a synthetic cached sweep, update live bar
    if (isModalOpen && !smoothSweepTimer) {
      var livePct = isEngineReady ? 100 : Math.min(99, Math.round(actualProgress * 100));
      displayProgress = Math.max(displayProgress, livePct);
      renderModalProgress(displayProgress, loadedBytes, totalBytes, isEngineReady);
      if (isEngineReady) {
        revealUnityCanvas();
      }
    }
  }

  // Listen for postMessage events from the hidden/active Unity iframe
  window.addEventListener('message', function (event) {
    if (!event || !event.data) return;
    var data = event.data;
    if (data.type === 'DGSELF_UNITY_PROGRESS') {
      handleProgressUpdate(data.progress || 0, data.loadedBytes || 0, data.totalBytes || 0, false);
    } else if (data.type === 'DGSELF_UNITY_READY') {
      handleProgressUpdate(1, data.loadedBytes || 0, data.totalBytes || 0, true);
    } else if (data.type === 'DGSELF_UNITY_ERROR') {
      if (loaderPhaseText) {
        loaderPhaseText.textContent = 'Notice: ' + (data.message || 'Error loading WebGL content');
      }
    }
  });

  // Also poll same-origin iframe state every 250ms so we never miss an update
  setInterval(function () {
    if (!unityIframe || !unityIframe.contentWindow) return;
    try {
      var st = unityIframe.contentWindow.dgselfUnityState;
      if (st) {
        handleProgressUpdate(st.progress || 0, st.loadedBytes || 0, st.totalBytes || 0, !!st.ready);
      }
    } catch (e) {}
  }, 250);

  // Open Player Demo when clicking Player Card or Navbar Launch Button
  function openPlayerDemo() {
    if (!demoModal) return;
    isModalOpen = true;
    document.body.classList.add('modal-open');
    demoModal.classList.add('open');
    demoModal.setAttribute('aria-hidden', 'false');

    if (smoothSweepTimer) {
      clearInterval(smoothSweepTimer);
      smoothSweepTimer = null;
    }

    // If already revealed once in this session and engine is ready, show immediately
    if (hasRevealedOnce && isEngineReady) {
      if (loadingOverlay) loadingOverlay.classList.add('loaded-hidden');
      activateIframeAudioAndFocus(true);
      return;
    }

    // Show the modern loading progress bar overlay
    if (loadingOverlay) {
      loadingOverlay.classList.remove('loaded-hidden');
    }

    if (isEngineReady) {
      // Background download & initialization already completed while user was browsing!
      // Animate the modern loading progress bar smoothly to 100% so user sees the progress bar transition
      var sweepPct = Math.max(12, Math.min(60, Math.round(displayProgress)));
      renderModalProgress(sweepPct, 0, 0, false);
      smoothSweepTimer = setInterval(function () {
        sweepPct += 8;
        if (sweepPct >= 100) {
          sweepPct = 100;
          clearInterval(smoothSweepTimer);
          smoothSweepTimer = null;
          renderModalProgress(100, 0, 0, true);
          revealUnityCanvas();
        } else {
          renderModalProgress(sweepPct, 0, 0, false);
        }
      }, 45);
    } else {
      // Still downloading/initializing in background — hook straight into live progress!
      var currentPct = Math.max(2, Math.min(98, Math.round(actualProgress * 100)));
      displayProgress = currentPct;
      var st = (unityIframe && unityIframe.contentWindow && unityIframe.contentWindow.dgselfUnityState) || {};
      renderModalProgress(currentPct, st.loadedBytes || 0, st.totalBytes || 0, false);
    }
  }

  function closePlayerDemo() {
    if (!demoModal) return;
    isModalOpen = false;
    if (smoothSweepTimer) {
      clearInterval(smoothSweepTimer);
      smoothSweepTimer = null;
    }
    document.body.classList.remove('modal-open');
    demoModal.classList.remove('open');
    demoModal.setAttribute('aria-hidden', 'true');
    activateIframeAudioAndFocus(false);
  }

  function toggleDemoFullscreen() {
    if (unityIframe && unityIframe.contentWindow) {
      try {
        unityIframe.contentWindow.postMessage({ type: 'DGSELF_DEMO_FULLSCREEN' }, '*');
      } catch (e) {}
    }
    if (demoModal && demoModal.requestFullscreen && !document.fullscreenElement) {
      demoModal.requestFullscreen().catch(function () {});
    } else if (document.exitFullscreen && document.fullscreenElement) {
      document.exitFullscreen().catch(function () {});
    }
  }

  // Bind Player Card Button, Navbar Launch Button, and Demo HUD Controls
  var playerCardBtn = document.getElementById('player-card-btn');
  var navLaunchBtn = document.getElementById('nav-launch-demo-btn');
  var footerLaunchBtn = document.getElementById('footer-launch-demo-btn');
  var closeDemoBtn = document.getElementById('close-demo-btn');
  var fullscreenDemoBtn = document.getElementById('fullscreen-demo-btn');

  if (playerCardBtn) playerCardBtn.addEventListener('click', openPlayerDemo);
  if (navLaunchBtn) navLaunchBtn.addEventListener('click', openPlayerDemo);
  if (footerLaunchBtn) footerLaunchBtn.addEventListener('click', openPlayerDemo);
  if (closeDemoBtn) closeDemoBtn.addEventListener('click', closePlayerDemo);
  if (fullscreenDemoBtn) fullscreenDemoBtn.addEventListener('click', toggleDemoFullscreen);

  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isModalOpen && !document.fullscreenElement) {
      closePlayerDemo();
    }
  });

  // =========================================================================
  // 2. INTERACTIVE AI GATEKEEPER SIMULATOR (LIVE ON-PAGE DEMO OF THE CONCEPT)
  // =========================================================================
  var simAvatars = {
    knight: {
      name: 'Aethelgard Vanguard',
      style: 'Realistic',
      era: 'Medieval / Dark Fantasy',
      role: 'Warrior',
      form: 'Humanoid',
      isMeme: false
    },
    cyber: {
      name: 'Nova-7 Operative',
      style: 'Realistic',
      era: 'Sci-Fi / Cyberpunk',
      role: 'Pilot / Mercenary',
      form: 'Humanoid',
      isMeme: false
    },
    anime: {
      name: 'Kiko Starlight',
      style: 'Stylized / Cel-Shaded',
      era: 'Futuristic Social',
      role: 'Explorer',
      form: 'Humanoid',
      isMeme: false
    },
    meme: {
      name: 'Pepe Street Hoodie',
      style: 'Cartoon / Meme',
      era: 'Modern Meme',
      role: 'Casual',
      form: 'Anthropomorphic',
      isMeme: true
    }
  };

  var simWorlds = {
    fantasy: {
      name: 'Kingdom of Eldoria',
      tags: 'Fantasy • Medieval • Lore-Driven RPG',
      requiredStyle: ['Realistic'],
      requiredEra: ['Medieval / Dark Fantasy'],
      allowedRoles: ['Warrior', 'Mage', 'Guard', 'Villager'],
      noMeme: true,
      recommendedAvatar: 'knight'
    },
    scifi: {
      name: 'Orbital Station Helios',
      tags: 'Sci-Fi • High-Fidelity • Tactical Sim',
      requiredStyle: ['Realistic'],
      requiredEra: ['Sci-Fi / Cyberpunk'],
      allowedRoles: ['Pilot / Mercenary', 'Engineer', 'Commander'],
      noMeme: true,
      recommendedAvatar: 'cyber'
    },
    social: {
      name: 'Prism Nexus Plaza',
      tags: 'Social Hub • Stylized & Realistic • Open',
      requiredStyle: ['Stylized / Cel-Shaded', 'Realistic'],
      requiredEra: ['Futuristic Social', 'Medieval / Dark Fantasy', 'Sci-Fi / Cyberpunk'],
      allowedRoles: ['Explorer', 'Warrior', 'Pilot / Mercenary'],
      noMeme: true,
      recommendedAvatar: 'anime'
    }
  };

  var currentAvatarKey = 'meme';
  var currentWorldKey = 'fantasy';

  function evaluateGatekeeper() {
    var avatar = simAvatars[currentAvatarKey];
    var world = simWorlds[currentWorldKey];
    if (!avatar || !world) return;

    var stylePass = world.requiredStyle.indexOf(avatar.style) !== -1;
    var eraPass = world.requiredEra.indexOf(avatar.era) !== -1;
    var rolePass = world.allowedRoles.indexOf(avatar.role) !== -1;
    var memePass = !(world.noMeme && avatar.isMeme);

    var allowed = stylePass && eraPass && rolePass && memePass;

    var verdictEl = document.getElementById('sim-verdict-badge');
    var checksListEl = document.getElementById('sim-checks-list');
    var explainTextEl = document.getElementById('sim-explain-text');
    var switchBtnEl = document.getElementById('sim-auto-switch-btn');

    if (verdictEl) {
      verdictEl.className = 'sim-verdict-badge ' + (allowed ? 'allow' : 'block');
      verdictEl.textContent = allowed
        ? '✓ decision: ALLOW — Enter Experience'
        : '✕ decision: BLOCK — Access Denied at Entry';
    }

    if (checksListEl) {
      var rows = [
        { label: 'Visual Style (' + avatar.style + ')', pass: stylePass },
        { label: 'Era / Theme Fit (' + avatar.era + ')', pass: eraPass },
        { label: 'Role Alignment (' + avatar.role + ')', pass: rolePass },
        { label: 'Anti-Disruption / No-Meme Policy', pass: memePass }
      ];
      checksListEl.innerHTML = rows.map(function (r) {
        return '<li><span>' + r.label + '</span><strong style="color:' + (r.pass ? '#34d399' : '#f87171') + '">' + (r.pass ? 'PASS ✓' : 'MISMATCH ✕') + '</strong></li>';
      }).join('');
    }

    if (explainTextEl) {
      if (allowed) {
        explainTextEl.textContent = 'AI Classification verified that "' + avatar.name + '" matches ' + world.name + '’s visual fidelity, lore era, and role constraints. World integrity preserved.';
      } else {
        var reasons = [];
        if (!memePass) reasons.push('cartoon/meme avatars are restricted');
        if (!stylePass) reasons.push('requires ' + world.requiredStyle.join(' or ') + ' rendering style');
        if (!eraPass) reasons.push('outfit/theme does not match ' + world.requiredEra[0]);
        if (!rolePass) reasons.push('role "' + avatar.role + '" is not in allowed roles');
        explainTextEl.textContent = 'Entry blocked for "' + avatar.name + '" in ' + world.name + ' because ' + reasons.join(', ') + '. Switch to "' + simAvatars[world.recommendedAvatar].name + '" in your DGSelf Avatar Hub to enter.';
      }
    }

    if (switchBtnEl) {
      if (allowed) {
        switchBtnEl.style.display = 'none';
      } else {
        switchBtnEl.style.display = 'inline-flex';
        switchBtnEl.textContent = 'Switch to Compatible Avatar (' + simAvatars[world.recommendedAvatar].name + ') →';
        switchBtnEl.onclick = function () {
          selectSimAvatar(world.recommendedAvatar);
        };
      }
    }
  }

  function selectSimAvatar(key) {
    currentAvatarKey = key;
    document.querySelectorAll('[data-sim-avatar]').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-sim-avatar') === key);
    });
    evaluateGatekeeper();
  }

  function selectSimWorld(key) {
    currentWorldKey = key;
    document.querySelectorAll('[data-sim-world]').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-sim-world') === key);
    });
    evaluateGatekeeper();
  }

  document.querySelectorAll('[data-sim-avatar]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      selectSimAvatar(btn.getAttribute('data-sim-avatar'));
    });
  });

  document.querySelectorAll('[data-sim-world]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      selectSimWorld(btn.getAttribute('data-sim-world'));
    });
  });

  evaluateGatekeeper();

  // =========================================================================
  // 3. OFFICIAL PITCH DECK GALLERY VIEWER (Pitch_Deck/1.webp - 6.webp)
  // =========================================================================
  var deckSlides = [
    {
      src: 'Pitch_Deck/1.webp',
      title: 'Slide 1 / 6 — DGSelf Vision',
      desc: 'AI-powered identity and access layer for interoperable 3D avatars: building governance infrastructure for virtual world identity.'
    },
    {
      src: 'Pitch_Deck/2.webp',
      title: 'Slide 2 / 6 — The Problem: Interoperable Avatars Break World Integrity',
      desc: 'Interoperability exists technically, but fails socially when cartoon or mismatched avatars enter lore-driven realistic worlds.'
    },
    {
      src: 'Pitch_Deck/3.webp',
      title: 'Slide 3 / 6 — The Insight: The Missing Layer is Governance',
      desc: '3D worlds are becoming interoperable, but lack identity constraints. Interoperability needs rules to work.'
    },
    {
      src: 'Pitch_Deck/4.webp',
      title: 'Slide 4 / 6 — The Solution: Enforcing Avatar Compatibility at Entry',
      desc: 'Users store multiple avatars and switch identities per world while Developers define style, role, outfit, and access rules.'
    },
    {
      src: 'Pitch_Deck/5.webp',
      title: 'Slide 5 / 6 — Architecture: The Governance Layer',
      desc: 'SDK Gateway, Rules Engine, AI Classification, and Explainability Layer working together: Evaluate → Allow / Block → Explain.'
    },
    {
      src: 'Pitch_Deck/6.webp',
      title: 'Slide 6 / 6 — Developer Value: Give Creators Control Over Their Worlds',
      desc: 'Preserve immersion, prevent disruptive avatar mismatches, define role-based access rules, and maintain narrative integrity.'
    }
  ];

  var currentSlideIdx = 0;
  var deckMainImg = document.getElementById('deck-main-img');
  var deckSlideTitle = document.getElementById('deck-slide-title');
  var deckSlideDesc = document.getElementById('deck-slide-desc');
  var deckPrevBtn = document.getElementById('deck-prev-btn');
  var deckNextBtn = document.getElementById('deck-next-btn');
  var deckThumbBtns = document.querySelectorAll('[data-deck-idx]');

  function setDeckSlide(idx) {
    currentSlideIdx = (idx + deckSlides.length) % deckSlides.length;
    var slide = deckSlides[currentSlideIdx];
    if (deckMainImg) {
      deckMainImg.src = slide.src;
      deckMainImg.alt = slide.title;
    }
    if (deckSlideTitle) deckSlideTitle.textContent = slide.title;
    if (deckSlideDesc) deckSlideDesc.textContent = slide.desc;

    deckThumbBtns.forEach(function (btn) {
      var bIdx = parseInt(btn.getAttribute('data-deck-idx'), 10);
      btn.classList.toggle('active', bIdx === currentSlideIdx);
    });
  }

  if (deckPrevBtn) {
    deckPrevBtn.addEventListener('click', function () {
      setDeckSlide(currentSlideIdx - 1);
    });
  }
  if (deckNextBtn) {
    deckNextBtn.addEventListener('click', function () {
      setDeckSlide(currentSlideIdx + 1);
    });
  }
  deckThumbBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      setDeckSlide(parseInt(btn.getAttribute('data-deck-idx'), 10));
    });
  });
})();

