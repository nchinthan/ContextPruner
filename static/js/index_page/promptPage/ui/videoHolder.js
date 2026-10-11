// File: static/js/index_page/ui/videoHolder.js

/**
 * <video-holder> Web Component
 * Fetches real-time HLS streams from Flask backend and renders via hls.js.
 */
class VideoHolder extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    this._videoUrl = '';
    this._hlsInstance = null;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex;
          flex-direction: column;
          background-color: var(--video-holder-bg, #111827);
          border: 1px solid var(--video-holder-border, #1f2937);
          border-radius: var(--video-holder-radius, 0.75rem);
          overflow: hidden;
          box-shadow: var(--video-holder-shadow, 0 10px 15px -3px rgba(0,0,0,0.5));
          height: 100%;
          width: 100%;
          box-sizing: border-box;
        }

        .url-bar-container {
          display: flex;
          gap: 0.5rem;
          padding: 0.75rem;
          background-color: var(--video-holder-bar-bg, #1f2937);
          border-bottom: 1px solid var(--video-holder-border, #374151);
          transition: max-height 0.3s ease, opacity 0.3s ease, padding 0.3s ease;
          max-height: 70px;
          opacity: 1;
          overflow: hidden;
          flex-shrink: 0;
        }

        .url-bar-container.hidden {
          max-height: 0;
          opacity: 0;
          padding: 0;
          border-bottom: none;
        }

        .url-input {
          flex: 1;
          background-color: var(--video-holder-input-bg, #030712);
          border: 1px solid var(--video-holder-input-border, #374151);
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: var(--video-holder-input-text, #f3f4f6);
          outline: none;
        }

        .url-input:focus {
          border-color: var(--video-holder-accent, #6366f1);
        }

        .play-btn {
          background-color: var(--video-holder-btn-bg, #4f46e5);
          color: #ffffff;
          font-weight: 500;
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          border: none;
          cursor: pointer;
          transition: background-color 0.2s ease;
          white-space: nowrap;
        }

        .play-btn:hover {
          background-color: var(--video-holder-btn-hover, #4338ca);
        }

        /* Scaled Center-Crop Viewport */
        .player-viewport {
          position: relative;
          flex: 1 1 0%;
          width: 100%;
          background-color: #000000;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        video {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          height: 100%;
          min-width: 177.77%;
          aspect-ratio: 16 / 9;
          border: none;
          object-fit: cover;
        }

        .placeholder {
          position: absolute;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          color: #9ca3af;
          font-size: 0.875rem;
          pointer-events: none;
          text-align: center;
          padding: 1rem;
        }

        .floating-controls {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          z-index: 10;
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .player-viewport:hover .floating-controls {
          opacity: 1;
        }

        .toggle-bar-btn {
          background: rgba(17, 24, 39, 0.85);
          border: 1px solid #374151;
          color: #d1d5db;
          border-radius: 0.375rem;
          padding: 0.35rem 0.65rem;
          font-size: 0.75rem;
          cursor: pointer;
          backdrop-filter: blur(4px);
        }

        .toggle-bar-btn:hover {
          background: rgba(31, 41, 55, 0.95);
          color: #ffffff;
        }
      </style>

      <div part="url-bar" class="url-bar-container" id="url-bar">
        <input 
          part="input"
          type="url" 
          id="url-input" 
          class="url-input" 
          placeholder="Paste YouTube Video URL..." 
        />
        <button part="button" id="load-btn" class="play-btn">Play</button>
      </div>

      <div part="viewport" class="player-viewport">
        <div class="floating-controls">
          <button id="toggle-input-btn" class="toggle-bar-btn" title="Toggle URL Bar">
            🔗 Change URL
          </button>
        </div>
        <div id="placeholder" class="placeholder">
          <svg width="40" height="40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span id="placeholder-text">Enter YouTube URL</span>
        </div>
        <!-- Replaced <iframe> with standard HTML5 <video> tag -->
        <video id="hls-video" controls autoplay muted></video>
      </div>
    `;
  }

  get videoUrl() { return this._videoUrl; }
  set videoUrl(val) {
    this._videoUrl = val;
    this._loadVideo(val);
  }

  connectedCallback() {
    const loadBtn = this.shadowRoot.getElementById('load-btn');
    const urlInput = this.shadowRoot.getElementById('url-input');
    const toggleBtn = this.shadowRoot.getElementById('toggle-input-btn');

    loadBtn.addEventListener('click', () => this._handleLoad());
    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this._handleLoad();
      }
    });

    toggleBtn.addEventListener('click', () => this._toggleUrlBar());

    const cachedUrl = localStorage.getItem('video_holder_last_url');
    if (cachedUrl) {
      urlInput.value = cachedUrl;
      this._loadVideo(cachedUrl);
    }
  }

  // --- Public APIs ---
  setVideoUrl(url) {
    this.videoUrl = url;
  }

  showUrlBar() {
    const urlBar = this.shadowRoot.getElementById('url-bar');
    urlBar.classList.remove('hidden');
  }

  hideUrlBar() {
    const urlBar = this.shadowRoot.getElementById('url-bar');
    urlBar.classList.add('hidden');
  }

  // --- Private Logic ---
  _handleLoad() {
    const inputEl = this.shadowRoot.getElementById('url-input');
    const rawUrl = inputEl.value.trim();

    if (!rawUrl) {
      window.alert("Please enter a valid YouTube URL.");
      return;
    }

    localStorage.setItem('video_holder_last_url', rawUrl);
    this._loadVideo(rawUrl);

    this.dispatchEvent(new CustomEvent('video-loaded', {
      detail: { originalUrl: rawUrl },
      bubbles: true,
      composed: true
    }));
  }

  async _loadVideo(ytUrl) {
    const videoEl = this.shadowRoot.getElementById('hls-video');
    const placeholder = this.shadowRoot.getElementById('placeholder');
    const placeholderText = this.shadowRoot.getElementById('placeholder-text');

    try {
      placeholderText.textContent = "Starting stream background process...";
      placeholder.style.display = 'flex';

      // Call Flask Endpoint to trigger parallel yt-dlp + ffmpeg processing
      const response = await fetch('/api/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: ytUrl })
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to initialize stream.");
      }

      const hlsUrl = data.hls_url;

      // Clean up any old HLS instances
      if (this._hlsInstance) {
        this._hlsInstance.destroy();
      }

      // Initialize HLS.js or native Safari HLS
      if (window.Hls && window.Hls.isSupported()) {
        const hls = new window.Hls();
        this._hlsInstance = hls;

        hls.loadSource(hlsUrl);
        hls.attachMedia(videoEl);
        hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
          placeholder.style.display = 'none';
          videoEl.play().catch(e => console.log("Autoplay blocked:", e));
        });
      } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
        videoEl.src = hlsUrl;
        placeholder.style.display = 'none';
        videoEl.play();
      } else {
        throw new Error("HLS playback is not supported in this browser.");
      }

      this.hideUrlBar();

    } catch (err) {
      console.error("HLS Stream Error:", err);
      placeholderText.textContent = `Error: ${err.message}`;
      placeholder.style.display = 'flex';
    }
  }

  _toggleUrlBar() {
    const urlBar = this.shadowRoot.getElementById('url-bar');
    urlBar.classList.toggle('hidden');
  }
}

customElements.define('video-holder', VideoHolder);