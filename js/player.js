function initPlayer(container, audioUrl, filename) {
  var audio = new Audio();
  audio.preload = "none";
  audio.src = audioUrl;

  var playing = false;
  var dragging = false;
  var speeds = [1, 1.25, 1.5, 1.75, 2];
  var speedIdx = 0;

  container.innerHTML =
    '<div class="player">' +
      '<div class="player-top">' +
        '<button class="player-play" title="Abspielen">' +
          '<svg class="icon-play" viewBox="0 0 24 24"><polygon points="6,3 20,12 6,21"/></svg>' +
          '<svg class="icon-pause" viewBox="0 0 24 24" style="display:none"><rect x="5" y="3" width="4" height="18"/><rect x="15" y="3" width="4" height="18"/></svg>' +
        '</button>' +
        '<div class="player-track">' +
          '<div class="player-bar-wrap">' +
            '<div class="player-bar">' +
              '<div class="player-bar-loaded"></div>' +
              '<div class="player-bar-fill"><div class="player-knob"></div></div>' +
            '</div>' +
          '</div>' +
          '<div class="player-time">' +
            '<span class="player-cur">0:00</span>' +
            '<span class="player-dur">0:00</span>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="player-bottom">' +
        '<button class="player-speed" title="Geschwindigkeit">1x</button>' +
        '<button class="player-dl" title="Herunterladen">' +
          '<svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>' +
          '<span class="player-dl-label">Download</span>' +
        '</button>' +
      '</div>' +
    '</div>';

  var player = container.querySelector(".player");
  var playBtn = container.querySelector(".player-play");
  var iconPlay = container.querySelector(".icon-play");
  var iconPause = container.querySelector(".icon-pause");
  var barWrap = container.querySelector(".player-bar-wrap");
  var fill = container.querySelector(".player-bar-fill");
  var loaded = container.querySelector(".player-bar-loaded");
  var curEl = container.querySelector(".player-cur");
  var durEl = container.querySelector(".player-dur");
  var speedBtn = container.querySelector(".player-speed");
  var dlBtn = container.querySelector(".player-dl");
  var dlLabel = container.querySelector(".player-dl-label");

  function fmt(s) {
    if (isNaN(s) || !isFinite(s)) return "0:00";
    s = Math.floor(s);
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    var sec = s % 60;
    if (h > 0) return h + ":" + String(m).padStart(2, "0") + ":" + String(sec).padStart(2, "0");
    return m + ":" + String(sec).padStart(2, "0");
  }

  function setProgress(pct) {
    fill.style.width = Math.min(100, Math.max(0, pct)) + "%";
  }

  function seekTo(e) {
    var rect = barWrap.getBoundingClientRect();
    var pct = (e.clientX - rect.left) / rect.width;
    pct = Math.min(1, Math.max(0, pct));
    if (audio.duration) {
      audio.currentTime = pct * audio.duration;
      setProgress(pct * 100);
    }
  }

  // Play / Pause
  playBtn.addEventListener("click", function () {
    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
  });

  audio.addEventListener("play", function () {
    playing = true;
    playBtn.classList.add("is-playing");
    playBtn.title = "Pausieren";
    iconPlay.style.display = "none";
    iconPause.style.display = "block";
  });

  audio.addEventListener("pause", function () {
    playing = false;
    playBtn.classList.remove("is-playing");
    playBtn.title = "Abspielen";
    iconPlay.style.display = "block";
    iconPause.style.display = "none";
  });

  // Time update
  audio.addEventListener("timeupdate", function () {
    if (dragging) return;
    curEl.textContent = fmt(audio.currentTime);
    if (audio.duration) {
      setProgress((audio.currentTime / audio.duration) * 100);
    }
  });

  audio.addEventListener("loadedmetadata", function () {
    durEl.textContent = fmt(audio.duration);
  });

  audio.addEventListener("durationchange", function () {
    durEl.textContent = fmt(audio.duration);
  });

  // Buffered progress
  audio.addEventListener("progress", function () {
    if (audio.buffered.length > 0 && audio.duration) {
      var end = audio.buffered.end(audio.buffered.length - 1);
      loaded.style.width = (end / audio.duration) * 100 + "%";
    }
  });

  // Seeking via click
  barWrap.addEventListener("click", seekTo);

  // Drag seeking
  barWrap.addEventListener("mousedown", function (e) {
    dragging = true;
    player.classList.add("is-dragging");
    seekTo(e);
  });

  document.addEventListener("mousemove", function (e) {
    if (!dragging) return;
    seekTo(e);
  });

  document.addEventListener("mouseup", function () {
    if (dragging) {
      dragging = false;
      player.classList.remove("is-dragging");
    }
  });

  // Touch seeking
  barWrap.addEventListener("touchstart", function (e) {
    dragging = true;
    player.classList.add("is-dragging");
    seekTo(e.touches[0]);
  }, { passive: true });

  document.addEventListener("touchmove", function (e) {
    if (!dragging) return;
    seekTo(e.touches[0]);
  }, { passive: true });

  document.addEventListener("touchend", function () {
    if (dragging) {
      dragging = false;
      player.classList.remove("is-dragging");
    }
  });

  // Speed
  speedBtn.addEventListener("click", function () {
    speedIdx = (speedIdx + 1) % speeds.length;
    audio.playbackRate = speeds[speedIdx];
    speedBtn.textContent = speeds[speedIdx] + "x";
  });

  // Download via blob
  var downloading = false;
  dlBtn.addEventListener("click", function () {
    if (downloading) return;
    downloading = true;
    dlLabel.textContent = "Laden\u2026";
    dlBtn.style.opacity = "0.6";

    fetch(audioUrl)
      .then(function (r) {
        if (!r.ok) throw new Error("fetch failed");
        return r.blob();
      })
      .then(function (blob) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = filename || "hertzinfakt.mp3";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
        dlLabel.textContent = "Download";
        dlBtn.style.opacity = "";
        downloading = false;
      })
      .catch(function () {
        // Fallback: open in new tab
        window.open(audioUrl, "_blank");
        dlLabel.textContent = "Download";
        dlBtn.style.opacity = "";
        downloading = false;
      });
  });
}
