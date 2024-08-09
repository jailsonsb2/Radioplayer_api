(function () {
    "use strict";

    // --- [CONFIGURAÇÕES] ----------------------------------------------- 

    const API_KEY_LYRICS = "1637b78dc3b129e6843ed674489a92d0";
    //const API_URL = "https://twj.es/radio_info/?radio_url=";
    const API_URL = "https://api-v2.streamafrica.net/icyv2?url=";
    const TIME_TO_REFRESH = window?.streams?.timeRefresh || 10000;

    // --- [CONSTANTES E VARIÁVEIS] --------------------------------------

    const buttons = document.querySelectorAll("[data-outside]");
    const ACTIVE_CLASS = "is-active";
    const cache = {};

    const playButton = document.querySelector(".player-button-play");
    const visualizerContainer = document.querySelector(".visualizer");
    const songNow = document.querySelector(".song-now");
    const stationsList = document.getElementById("stations");
    const stationName = document.querySelector(".station-name");
    const stationDescription = document.querySelector(".station-description");
    const headerLogoImg = document.querySelector(".header-logo-img");
    const playerArtwork = document.querySelector(".player-artwork img:first-child");
    const playerCoverImg = document.querySelector(".player-cover-image");
    const playerSocial = document.querySelector(".player-social");
    const playerApps = document.querySelector(".footer-app");
    const playerTv = document.querySelector(".footer-tv");
    const playerTvModal = document.getElementById("modal-tv");
    const playerProgram = document.querySelector(".player-program");
    const lyricsContent = document.getElementById("lyrics");
    const history = document.getElementById("history");

    let currentStation;
    let activeButton;
    let currentSongPlaying;
    let timeoutId; 

    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    let hasVisualizer = false;


    // --- [FUNÇÕES UTILITÁRIAS] ----------------------------------------- 

    function createElementFromHTML(htmlString) {
        const div = document.createElement("div");
        div.innerHTML = htmlString.trim();
        return div.firstChild;
    }

    function sanitizeText(text) {
        return text.replace(/^\d+\.\)\s/, "").replace(/<br>$/, "");
    }

    function changeImageSize(url, size) {
        return url.replace(/100x100/, size);
    }

    function createTempImage(src) {
        return new Promise((resolve, reject) => {
            const img = document.createElement("img");
            img.crossOrigin = "Anonymous";
            img.src = `https://images.weserv.nl/?url=${src}`;
            img.onload = () => resolve(img);
            img.onerror = reject;
        });
    }

    // --- [FUNÇÕES DE MANIPULAÇÃO DE ÁUDIO] ----------------------------

    function handlePlayPause() { 
        if (audio.paused) {
            play(audio);
        } else {
            pause(audio);
        }
    }
    
    function play(audio, newSource = null) {
        if (newSource) {
            audio.src = newSource;
        }

        // Adiciona evento 'canplay' para garantir que o áudio pode ser reproduzido
        audio.addEventListener('canplay', () => {
            audio.play();
            playButton.innerHTML = icons.pause;
            playButton.classList.add("is-active");
            document.body.classList.add("is-playing");
        }); 

        if (!hasVisualizer) {
            visualizer(audio, visualizerContainer);
            hasVisualizer = true;
        }

        audio.load();
    }

    function pause(audio) {
        audio.pause();
        playButton.innerHTML = icons.play;
        playButton.classList.remove("is-active");
        document.body.classList.remove("is-playing");
    }

    // --- [ÍCONES] ------------------------------------------------------

    const icons = { 
        play: '<svg class="i i-play" viewBox="0 0 24 24"><path d="m7 3 14 9-14 9z"></path></svg>',
        pause: '<svg class="i i-pause" viewBox="0 0 24 24"><path d="M5 4h4v16H5Zm10 0h4v16h-4Z"></path></svg>',
        facebook: '<svg class="i i-facebook" viewBox="0 0 24 24"><path d="M17 14h-3v8h-4v-8H7v-4h3V7a5 5 0 0 1 5-5h3v4h-3q-1 0-1 1v3h4Z"></path></svg>',
        twitter: '<svg class="i i-x" viewBox="0 0 24 24"><path d="m3 21 7.5-7.5m3-3L21 3M8 3H3l13 18h5Z"></path></svg>',
        instagram: '<svg class="i i-instagram" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"></circle><rect width="20" height="20" x="2" y="2" rx="5"></rect><path d="M17.5 6.5h0"></path></svg>',
        youtube: '<svg class="i i-youtube" viewBox="0 0 24 24"><path d="M1.5 17q-1-5.5 0-10Q1.9 4.8 4 4.5q8-1 16 0 2.1.3 2.5 2.5 1 4.5 0 10-.4 2.2-2.5 2.5-8 1-16 0-2.1-.3-2.5-2.5Zm8-8.5v7l6-3.5Z"></path></svg>',
        tiktok: '<svg class="i i-tiktok" viewBox="0 0 24 24"><path d="M22 6v5q-4 0-6-2v7a7 7 0 1 1-5-6.7m0 6.7a2 2 0 1 0-2 2 2 2 0 0 0 2-2V1h5q2 5 6 5"></path></svg>',
        whatsapp: '<svg class="i i-whatsapp" viewBox="0 0 24 24"><circle cx="9" cy="9" r="1"></circle><circle cx="15" cy="15" r="1"></circle><path d="M8 9a7 7 0 0 0 7 7m-9 5.2A11 11 0 1 0 2.8 18L2 22Z"></path></svg>',
        telegram: '<svg class="i i-telegram" viewBox="0 0 24 24"><path d="M12.5 16 9 19.5 7 13l-5.5-2 21-8-4 18-7.5-7 4-3"></path></svg>',
        tv: '<svg class="i i-tv" viewBox="0 0 24 24"><rect width="22" height="15" x="1" y="3" rx="3"></rect><path d="M7 21h10"></path></svg>',
    };

    function outsideClick(button) {
        if (!button) return;
        const target = document.getElementById(button.dataset.outside);
        if (!target) return;
        button.addEventListener("click", () => {
            button.classList.toggle(ACTIVE_CLASS);
            target.classList.toggle(ACTIVE_CLASS);
        });
        const clickOutside = (event) => {
            if (!target.contains(event.target) && !button.contains(event.target)) {
                button.classList.remove(ACTIVE_CLASS);
                target.classList.remove(ACTIVE_CLASS);
            }
        };
        document.addEventListener("click", clickOutside);
        const close = target.querySelector("[data-close]");
        if (close) {
            close.onclick = function () {
                button.classList.remove(ACTIVE_CLASS);
                target.classList.remove(ACTIVE_CLASS);
            };
        }
    }

    buttons.forEach((button) => {
        outsideClick(button);
    });

    function initCanvas(container) {
        const canvas = document.createElement("canvas");
        canvas.setAttribute("id", "visualizerCanvas");
        canvas.setAttribute("class", "visualizer-item");
        container.appendChild(canvas);
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        return canvas;
    }

    function resizeCanvas(canvas, container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
    }

    const visualizer = (audio, container) => {
        if (!audio || !container) {
            return;
        }
        const options = {
            fftSize: container.dataset.fftSize || 2048,
            numBars: container.dataset.bars || 40,
            maxHeight: container.dataset.maxHeight || 255,
        };
        const ctx = new AudioContext();
        const audioSource = ctx.createMediaElementSource(audio);
        const analyzer = ctx.createAnalyser();
        audioSource.connect(analyzer);
        audioSource.connect(ctx.destination);
        const frequencyData = new Uint8Array(analyzer.frequencyBinCount);
        const canvas = initCanvas(container);
        const canvasCtx = canvas.getContext("2d");

        const renderBars = () => {
            resizeCanvas(canvas, container);
            analyzer.getByteFrequencyData(frequencyData);
            if (options.fftSize) {
                analyzer.fftSize = options.fftSize;
            }
            canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
            for (let i = 0; i < options.numBars; i++) {
                const index = Math.floor((i + 10) * (i < options.numBars / 2 ? 2 : 1));
                const fd = frequencyData[index];
                const barHeight = Math.max(4, fd || 0) + options.maxHeight / 255;
                const barWidth = canvas.width / options.numBars;
                const x = i * barWidth;
                const y = canvas.height - barHeight;
                canvasCtx.fillStyle = "white";
                canvasCtx.fillRect(x, y, barWidth + 1, barHeight);
            }
            requestAnimationFrame(renderBars);
        };
        renderBars();

        // Listener del cambio de espacio en la ventana
        window.addEventListener("resize", () => {
            resizeCanvas(canvas, container);
        });
    };

    const getDataFromStreamAfrica = async (artist, title, defaultArt, defaultCover) => {
        let text;
        if (artist === null || artist === title) {
          text = `${title} - ${title}`;
        } else {
          text = `${artist} - ${title}`;
        }
        const cacheKey = text.toLowerCase();
        if (cache[cacheKey]) {
          return cache[cacheKey];
        }
        const API_URL = `https://api-v2.streamafrica.net/musicsearch?query=${encodeURIComponent(text)}&service=spotify`;
        const response = await fetch(API_URL);
      
        if (title === "Radioplayer Demo" || response.status === 403) {
          const results = {
            title,
            artist,
            art: defaultArt,
            cover: defaultCover,
            stream_url: "#not-found",
          };
          cache[cacheKey] = results;
          return results;
        }
      
        const data = response.ok ? await response.json() : {};
      
        // Modificação para acessar o objeto "results" da resposta da API
        const stream = data.results || {}; 
      
        if (Object.keys(stream).length === 0) {
          const results = {
            title,
            artist,
            art: defaultArt,
            cover: defaultCover,
            stream_url: "#not-found",
          };
          cache[cacheKey] = results;
          return results;
        }
      
        const results = {
          //title: stream.title || title, // Utilizando os dados da nova resposta da API
          //artist: stream.artist || artist,
          title: title,
          artist: artist,
          thumbnail: stream.artwork?.small || defaultArt, // Acessando a URL da imagem pequena
          art: stream.artwork?.medium || defaultArt, // Acessando a URL da imagem média
          cover: stream.artwork?.large || defaultCover, // Acessando a URL da imagem grande
          stream_url: stream.stream || "#not-found", // Ajustado para o novo nome da propriedade "stream"
        };
        cache[cacheKey] = results;
        return results;
    };

    const getDataFromITunes = async (artist, title, defaultArt, defaultCover) => {
        let text;
        if (artist === title) {
            text = `${title}`;
        } else {
            text = `${artist} - ${title}`;
        }
        const cacheKey = text.toLowerCase();
        if (cache[cacheKey]) {
            return cache[cacheKey];
        }

        const response = await fetch(`https://itunes.apple.com/search?limit=1&term=${encodeURIComponent(text)}`);
        if (response.status === 403) {
            const results = {
                title,
                artist,
                art: defaultArt,
                cover: defaultCover,
                stream_url: "#not-found",
            };
            return results;
        }
        const data = response.ok ? await response.json() : {};
        if (!data.results || data.results.length === 0) {
            const results = {
                title,
                artist,
                art: defaultArt,
                cover: defaultCover,
                stream_url: "#not-found",
            };
            return results;
        }
        const itunes = data.results[0];
        const results = {
            //title: itunes.trackName || title,
            //artist: itunes.artistName || artist,
            title: title,
            artist: artist,
            thumbnail: itunes.artworkUrl100 || defaultArt,
            art: itunes.artworkUrl100 ? changeImageSize(itunes.artworkUrl100, "600x600") : defaultArt,
            cover: itunes.artworkUrl100 ? changeImageSize(itunes.artworkUrl100, "1500x1500") : defaultCover,
            stream_url: "#not-found",
        };
        cache[cacheKey] = results;
        return results;
    };

    async function getDataFrom({ artist, title, art, cover, server }) {
        let dataFrom = {};
        if (server.toLowerCase() === "spotify") {
            dataFrom = await getDataFromStreamAfrica(artist, title, art, cover);
        } else {
            dataFrom = await getDataFromITunes(artist, title, art, cover);
        }
        return dataFrom;
    }

    const getLyrics = async (artist, name) => {
        try {
            const response = await fetch(`https://api.vagalume.com.br/search.php?apikey=${API_KEY_LYRICS}&art=${encodeURIComponent(artist)}&mus=${encodeURIComponent(name)}`);
            const data = await response.json();
            if (data.type === "exact" || data.type === "aprox") {
                const lyrics = data.mus[0].text;
                return lyrics;
            } else {
                return "Letra no disponible";
            }
        } catch (error) {
            console.error("Error fetching lyrics:", error);
            return "Letra no disponible";
        }
    };

    function normalizeTitle(api) {
        let title;
        let artist;
      
        // Verifica se a API retorna informações no formato "last_played"
        if (api.last_played) {
          title = api.last_played.song;
          artist = api.last_played.artist;
        // Verifica se a API retorna informações diretamente em "song" e "artist"
        } else if (api.song && api.artist) {
          title = api.song;
          artist = api.artist;
        } else if (api.songtitle && api.songtitle.includes(" - ")) {
          title = api.songtitle.split(" - ")[0];
          artist = api.songtitle.split(" - ")[1];
        } else if (api.now_playing) {
          title = api.now_playing.song.title;
          artist = api.now_playing.song.artist;
        } else if (api.artist && api.title) {
          title = api.title;
          artist = api.artist;
        } else if (api.currenttrack_title) {
          title = api.currenttrack_title;
          artist = api.currenttrack_artist;
        } else if (api.title && api.djprofile && api.djusername) {
          title = api.title.split(" - ")[1];
          artist = api.title.split(" - ")[0];
        } else {
          title = api.currentSong;
          artist = api.currentArtist;
        }
      
        return {
          title,
          artist,
        };
    }


    function normalizeHistory(api) {
        let artist;
        let song;
        let history = api.song_history || api.history || api.songHistory || [];
        history = history.slice(0, 4);
      
        const historyNormalized = history.map((item) => {
          if (api.song_history) {
            artist = item.song.artist;
            song = item.song.title;
          } else if (api.history) {
            artist = sanitizeText(item.artist || "");
            song = sanitizeText(item.song || "");
          } else if (api.songHistory) {
            // Corrigido: Acessando as propriedades dentro do objeto 'song'
            artist = item.song.artist; 
            song = item.song.title;
          }
          return {
            artist,
            song,
          };
        });
      
        return historyNormalized;
    }


    // --- [FUNÇÕES DE MANIPULAÇÃO DA INTERFACE] ------------------------

    function setAccentColor(image, colorThief) {
        const dom = document.documentElement;
        const metaThemeColor = document.querySelector("meta[name=theme-color]");
        if (image.complete) {
            dom.setAttribute("style", `--accent: rgb(${colorThief.getColor(image)})`);
            metaThemeColor.setAttribute("content", `rgb(${colorThief.getColor(image)})`);
        } else {
            console.log("imagen no completa");
            image.addEventListener("load", function () {
                dom.setAttribute("style", `--accent: rgb(${colorThief.getColor(image)})`);
                metaThemeColor.setAttribute("content", `rgb(${colorThief.getColor(image)})`);
            });
        }
    }

    function createOpenTvButton(url) {
        const $button = document.createElement("button");
        $button.classList.add("player-button-tv", "btn");
        $button.innerHTML = icons.tv + "Tv ao vivo";
        $button.addEventListener("click", () => {
            playerTvModal.classList.add("is-active");
            pause(audio);
            const modalBody = playerTvModal.querySelector(".modal-body-video");
            const closeButton = playerTvModal.querySelector("[data-close]");
            const $iframe = document.createElement("iframe");
            $iframe.src = url;
            $iframe.allowFullscreen = true;
            modalBody.appendChild($iframe);
            closeButton.addEventListener("click", () => {
                playerTvModal.classList.remove("is-active");

                // al terminar de cerrar el modal, eliminar el iframe
                $iframe.remove();
            });
        });
        playerTv.appendChild($button);
    }

    function createProgram(program) {
        if (!program) return;
        if (program.time) {
            const $div = document.createElement("div");
            const $span = document.createElement("span");
            $div.classList.add("player-program-time-container");
            $span.classList.add("player-program-badge");
            $span.textContent = "On Air";
            $div.appendChild($span);
            const $time = document.createElement("span");
            $time.classList.add("player-program-time");
            $time.textContent = program.time;
            $div.appendChild($time);
            playerProgram.appendChild($div);
        }
        if (program.name) {
            const $name = document.createElement("span");
            $name.classList.add("player-program-name");
            $name.textContent = program.name;
            playerProgram.appendChild($name);
        }
        if (program.description) {
            const $description = document.createElement("span");
            $description.classList.add("player-program-description");
            $description.textContent = program.description;
            playerProgram.appendChild($description);
        }
    }

    function createSocialItem(url, icon) {
        const $a = document.createElement("a");
        $a.classList.add("player-social-item");
        $a.href = url;
        $a.target = "_blank";
        $a.innerHTML = icons[icon];
        return $a;
    }

    function createAppsItem(url, name) {
        const $a = document.createElement("a");
        $a.classList.add("player-apps-item");
        $a.href = url;
        $a.target = "_blank";
        $a.innerHTML = `<img src="assets/app/${name}.svg" alt="${name}" height="48" width="${name === "ios" ? "143" : "163"}">`;
        return $a;
    }

    function createStreamItem(station, index, currentStation, callback) {
        const $button = document.createElement("button");
        $button.classList.add("station");
        $button.innerHTML = `<img class="station-img" src="${station.album}" alt="station" height="160" width="160">`;
        $button.dataset.index = index;
        $button.dataset.hash = station.hash;
        if (currentStation.stream_url === station.stream_url) {
            $button.classList.add("is-active");
            activeButton = $button;
        }
        $button.addEventListener("click", () => {
            if ($button.classList.contains("is-active")) return;

            // Eliminar la clase "active" del botón activo anterior, si existe
            if (activeButton) {
                activeButton.classList.remove("is-active");
            }

            // Agregar la clase "active" al botón actualmente presionado
            $button.classList.add("is-active");
            activeButton = $button; // Actualizar el botón activo

            setAssetsInPage(station);
            play(audio, station.stream_url);
            if (history) {
                history.innerHTML = "";
            }

            // Llamar a la función de devolución de llamada (callback) si se proporciona
            if (typeof callback === "function") {
                callback(station);
            }
        });
        return $button;
    }

    function createStations(stations, currentStation, callback) {
        if (!stationsList) return;
        stationsList.innerHTML = "";
        stations.forEach(async (station, index) => {
            const $fragment = document.createDocumentFragment();
            const $button = createStreamItem(station, index, currentStation, callback);
            $fragment.appendChild($button);
            stationsList.appendChild($fragment);
        });
    }

    // --- [ATUALIZA ELEMENTOS DA PÁGINA DA ESTAÇÃO] ------------------

    function setAssetsInPage(station) {
        playerSocial.innerHTML = "";
        playerApps.innerHTML = "";
        playerProgram.innerHTML = "";
        playerTv.innerHTML = "";
        headerLogoImg.src = station.logo;
        playerArtwork.src = station.album;
        playerCoverImg.src = station.cover || station.album;
        stationName.textContent = station.name;
        stationDescription.textContent = station.description;
        if (station.social && playerSocial) {
            Object.keys(station.social).forEach((key) => {
                playerSocial.appendChild(createSocialItem(station.social[key], key));
            });
        }
        if (station.apps && playerApps) {
            Object.keys(station.apps).forEach((key) => {
                playerApps.appendChild(createAppsItem(station.apps[key], key));
            });
        }
        if (station.program && playerProgram) {
            createProgram(station.program);
        }
        if (station.tv_url && playerTv) {
            createOpenTvButton(station.tv_url);
        }
    }

    // --- [FUNÇÕES DE ATUALIZAÇÃO DE CONTEÚDO] ----------------------- 

    function mediaSession(data) {
        const { title, artist, album, art } = data;
        if ("mediaSession" in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title,
                artist,
                album,
                artwork: [
                    {
                        src: art,
                        sizes: "512x512",
                        type: "image/png",
                    },
                ],
            });
            navigator.mediaSession.setActionHandler("play", () => {
                play();
            });
            navigator.mediaSession.setActionHandler("pause", () => {
                pause();
            });
        }
    }

    function currentSong(data) {
        const content = songNow;
        content.querySelector(".song-name").textContent = data.title;
        content.querySelector(".song-artist").textContent = data.artist;
        const artwork = content.querySelector(".player-artwork");
        if (artwork) {
            const $img = document.createElement("img");
            $img.src = data.art;
            $img.width = 600;
            $img.height = 600;

            // Cuando la imagen se haya cargado, insertarla en artwork
            $img.addEventListener("load", () => {
                artwork.appendChild($img);

                // eslint-disable-next-line no-undef
                const colorThief = new ColorThief();

                // Ejecutar cada vez que cambie la imagen
                // Crear una imagen temporal para evitar errores de CORS
                createTempImage($img.src).then((img) => {
                    setAccentColor(img, colorThief);
                });

                // Animar la imagen para desplazarla hacia la izquierda con transform
                setTimeout(() => {
                    artwork.querySelectorAll("img").forEach((img) => {
                        // Establecer la transición
                        img.style.transform = `translateX(${-img.width}px)`;

                        // Esperar a que la animación termine
                        img.addEventListener("transitionend", () => {
                            // Eliminar todas las imágenes excepto la última
                            artwork.querySelectorAll("img:not(:last-child)").forEach((img) => {
                                img.remove();
                            });
                            img.style.transition = "none";
                            img.style.transform = "none";
                            setTimeout(() => {
                                img.removeAttribute("style");
                            }, 1000);
                        });
                    });
                }, 100);
            });
        }
        if (playerCoverImg) {
            const tempImg = new Image();
            tempImg.src = data.cover || data.art;
            tempImg.addEventListener("load", () => {
                playerCoverImg.style.opacity = 0;

                // Esperar a que la animación termine
                playerCoverImg.addEventListener("transitionend", () => {
                    playerCoverImg.src = data.cover || data.art;
                    playerCoverImg.style.opacity = 1;
                });
            });
        }
    }

    function setHistory(data, current, server) {
        if (!history) return;
        history.innerHTML = historyTemplate.replace("{{art}}", pixel).replace("{{song}}", "Cargando historial...").replace("{{artist}}", "Artista").replace("{{stream_url}}", "#not-found");
        if (!data) return;

        // max 10 items
        data = data.slice(0, 10);
        const promises = data.map(async (item) => {
            const { artist, song } = item;
            const { album, cover } = current;
            const dataFrom = await getDataFrom({
                artist,
                title: song,
                art: album,
                cover,
                server,
            });
            return historyTemplate
                .replace("{{art}}", dataFrom.thumbnail || dataFrom.art)
                .replace("{{song}}", dataFrom.title)
                .replace("{{artist}}", dataFrom.artist)
                .replace("{{stream_url}}", dataFrom.stream_url);
        });
        Promise.all(promises)
            .then((itemsHTML) => {
                const $fragment = document.createDocumentFragment();
                itemsHTML.forEach((itemHTML) => {
                    $fragment.appendChild(createElementFromHTML(itemHTML));
                });
                history.innerHTML = "";
                history.appendChild($fragment);
            })
            .catch((error) => {
                console.error("Error:", error);
            });
    }

    function setLyrics(artist, title) {
        if (!lyricsContent) return;
        getLyrics(artist, title)
            .then((lyrics) => {
                const $p = document.createElement("p");
                $p.innerHTML = lyrics.replace(/\n/g, "<br>");
                lyricsContent.innerHTML = "";
                lyricsContent.appendChild($p);
            })
            .catch((error) => {
                console.error("Error:", error);
            });
    }

    // --- [INICIALIZAÇÃO DA APLICAÇÃO] -------------------------------

    function initApp() {
        // Variables para almacenar información que se actualizará
        let currentSongPlaying;
        let timeoutId;
        const json = window.streams || {};
        const stations = json.stations;
        currentStation = stations[0];
    
        // Establecer los assets de la página
        setAssetsInPage(currentStation);
    
        // Establecer la fuente de audio
        audio.src = currentStation.stream_url;
    
        // Define o evento de clique para o botão play/pause
        if (playButton !== null) {
            playButton.addEventListener("click", handlePlayPause);
        }
    
        // --- [CONTROLE DE VOLUME] --------------------------------------
    
        const range = document.querySelector(".player-volume");
        const rangeFill = document.querySelector(".player-range-fill");
        const rangeWrapper = document.querySelector(".player-range-wrapper");
        const rangeThumb = document.querySelector(".player-range-thumb");
        let currentVolume = parseInt(localStorage.getItem("volume") || "100", 10) || 100;
    
        // Rango recorrido
        function setRangeWidth(percent) {
            rangeFill.style.width = `${percent}%`;
        }
    
        // Posición del thumb
        function setThumbPosition(percent) {
            const compensatedWidth = rangeWrapper.offsetWidth - rangeThumb.offsetWidth;
            const thumbPosition = (percent / 100) * compensatedWidth;
            rangeThumb.style.left = `${thumbPosition}px`;
        }
    
        // Actualiza el volumen al cambiar el rango
        function updateVolume(value) {
            range.value = value;
            setRangeWidth(value);
            setThumbPosition(value);
            localStorage.setItem("volume", value);
            audio.volume = value / 100;
        }
    
        // Valor inicial
        if (range !== null) {
            updateVolume(currentVolume);
    
            // Escucha el cambio del rango
            range.addEventListener("input", (event) => {
                updateVolume(parseInt(event.target.value, 10));
            });
    
            // Escucha el click en el rango
            rangeWrapper.addEventListener("mousedown", (event) => {
                const rangeRect = range.getBoundingClientRect();
                const clickX = event.clientX - rangeRect.left;
                const percent = (clickX / range.offsetWidth) * 100;
                const value = Math.round((range.max - range.min) * (percent / 100)) + parseInt(range.min);
                updateVolume(value);
            });
    
            // Escucha el movimiento del mouse
            rangeThumb.addEventListener("mousedown", () => {
                document.addEventListener("mousemove", handleThumbDrag);
            });
        }
    
        // Mueve el thumb y actualiza el volumen
        function handleThumbDrag(event) {
            const rangeRect = range.getBoundingClientRect();
            const clickX = event.clientX - rangeRect.left;
            let percent = (clickX / range.offsetWidth) * 100;
            percent = Math.max(0, Math.min(100, percent));
            const value = Math.round((range.max - range.min) * (percent / 100)) + parseInt(range.min);
            updateVolume(value);
        }
    
        // Deja de escuchar el movimiento del mouse
        document.addEventListener("mouseup", () => {
            document.removeEventListener("mousemove", handleThumbDrag);
        });
        
        // --- [FIM DO CONTROLE DE VOLUME] -----------------------------
    
        // Iniciar o stream ( atualizado para evitar valor undefined )
        function init(current) {
            // Cancelar o timeout anterior
            if (timeoutId) clearTimeout(timeoutId);
    
            // Se a url da estação atual for diferente da estação atual, atualiza a informação
            if (currentStation.stream_url !== current.stream_url) {
                currentStation = current;
            }
            const server = currentStation.server || "itunes";
            //const jsonUri = currentStation.api || API_URL + encodeURIComponent(current.stream_url);
            const jsonUri = currentStation.api || API_URL + current.stream_url;
            fetch(jsonUri)
                .then((response) => response.json())
                .then(async (res) => {
                    console.log(res);
                    const current = normalizeTitle(res);
                    console.log(current);
    
                    // Se currentSong for diferente da música atual, atualiza a informação
                    const title = current.title;
                    if (currentSongPlaying !== title) {
                        // Atualizar a música atual
                        currentSongPlaying = title;
                        let artist = current.artist;
                        const art = currentStation.album;
                        const cover = currentStation.cover;
                        const history = normalizeHistory(res);
    
                        // Verificar se o título e o artista não são undefined
                        if (title && artist) {
                            const dataFrom = await getDataFrom({
                                artist,
                                title,
                                art,
                                cover,
                                server,
                            });
    
                            // Estabelecer dados da música atual
                            currentSong(dataFrom);
                            mediaSession(dataFrom);
                            setLyrics(dataFrom.artist, dataFrom.title);
                            setHistory(history, currentStation, server);
                        } else {
                            console.log("Título ou artista undefined, não será feita a busca pela capa do álbum.");
                        }
                    }
                })
                .catch((error) => console.log(error));
            timeoutId = setTimeout(() => {
                init(current);
            }, TIME_TO_REFRESH);
        }
    
    
        init(currentStation);
        createStations(stations, currentStation, (station) => {
            init(station);
        });
        const nextStation = document.querySelector(".player-button-forward-step");
        const prevStation = document.querySelector(".player-button-backward-step");
        if (nextStation) {
            nextStation.addEventListener("click", () => {
                const next = stationsList.querySelector(".is-active").nextElementSibling;
                if (next) {
                    next.click();
                }
            });
        }
        if (prevStation) {
            prevStation.addEventListener("click", () => {
                const prev = stationsList.querySelector(".is-active").previousElementSibling;
                if (prev) {
                    prev.click();
                }
            });
        }
    }

    // --- [POP-UP DE INÍCIO E HANDLERS] --------------------------------

    const pixel = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAA1JREFUGFdj+P//PxcACQYDCF0ysWYAAAAASUVORK5CYII=";
    const historyTemplate = `<div class="history-item flex items-center g-1">
                        <div class="history-image flex-none">
                            <img src="{{art}}" width="80" height="80">
                        </div>
                        <div class="history-meta flex column">
                            <span class="color-title fw-500 truncate-line">{{song}}</span>
                            <span class="color-text">{{artist}}</span>
                        </div>
                        <a href="{{stream_url}}" class="history-spotify" target="_blank" rel="noopener">
                            <svg class="i i-spotify" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="11"></circle>
                                <path d="M6 8q7-2 12 1M7 12q5.5-1.5 10 1m-9 3q4.5-1.5 8 1"></path>
                            </svg>
                        </a>
                        </div>`;


        window.addEventListener("DOMContentLoaded", () => {
            document.body.classList.remove("preload");
            // Adiciona o event listener para iniciar o audio após primeiro click na tela
            let hasClicked = false;
            document.body.addEventListener('click', () => {
                if (!hasClicked && !audio.playing) {
                    handlePlayPause();
                    hasClicked = true;
                }
            });
        });

    // --- [INICIALIZA A APLICAÇÃO] -------------------------------------
    initApp();

})();
