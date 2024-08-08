## Single or Multi-Station Radio Player

This document provides a detailed guide on the structure, configuration, and customization of a single / multi-station radio player built with HTML, CSS, and JavaScript. This player dynamically fetches song information and offers the flexibility to use a local API or a pre-configured web-based API.


## Demo Screenshots

![Demo Screenshot](https://i.imgur.com/oULEMgZ.jpeg)


### 1. Overview

This radio player offers a user-friendly interface for enjoying online radio stations. It allows for the addition of multiple stations, each with its own live stream, song information, social media links, and more. Station configuration is done directly within the HTML, simplifying the customization process.

### 2. File Structure

* **`index.html`:** Contains the main HTML for the player, including:
    * Visual structure and interactive elements.
    * Station configurations within a `<script>` tag.
* **`js/main.js`:** Houses the JavaScript code that powers the player's functionality, including:
    * Audio player management.
    * Dynamic fetching and updating of song information (using local or web API).
    * Rendering the station list.
    * Control of interface elements like buttons, menus, and modals.
* **`api.php`:** (Optional) PHP script acting as a local API to extract metadata from radio streams, providing song information.
* **`css/main.min.css`:**  Defines the visual styling of the player, including layout, colors, and typography.
* **`custom.css`:**  Allows for adding custom styles.
* **`assets/`:**  Folder to store images, icons, and other visual assets.

### 3. Detailed Configuration

#### 3.1. Configuring Stations (`index.html`)

Radio stations are configured within a `<script>` block in the `index.html` file, defining the `window.streams.stations` object. Each station is an object with the following properties:

| Property | Description |
|---|---|
| `name` | Station name displayed on the interface. |
| `hash` | Unique identifier for the station. |
| `description` | Short description of the station. |
| `logo` | Path to the station logo image file. |
| `album` | Path to a default "album" image to display before the actual cover art is loaded. |
| `cover` | Path to the currently playing song's cover art. |
| `api` | **(Optional)** URL of the local API (`api.php`) configured to fetch station information. This should include the `stream_url` as a parameter. If left blank, the script will use the pre-configured web API within `js/main.js`. |
| `stream_url` | URL of the station's audio stream. |
| `tv_url` | URL of the station's live video stream (optional). |
| `server` | Defines the music platform ("spotify" or "itunes") used to fetch additional info (if the corresponding API is in use). |
| `program` | Object containing information about the current program (optional). |
| `social` | Object with links to the station's social media profiles (optional). |
| `apps` | Object with links to download the station's apps (optional). |

**Configuration Example:**

```html
<script>
window.streams = {
    timeRefresh: 10000, // Refresh time in milliseconds
    stations: [
        {
            name: "Example FM",
            hash: "examplefm",
            description: "The best music!",
            logo: "assets/examplefm_logo.png",
            album: "assets/default_album.jpg",
            cover: "assets/default_album.jpg",
            api: "api.php?url=https://example.com/stream", // Local API (optional)
            stream_url: "https://example.com/stream",
            server: "itunes", // Use iTunes API
            social: {
                facebook: "https://facebook.com/examplefm",
                instagram: "https://instagram.com/examplefm"
            }
        },
        // ... more stations
    ]
};
</script>
```

#### 3.2. Local API (Optional)

If you choose to use the local API (`api.php`), follow these instructions to set it up:

* **Configuration:** 
    * In the `api.php` file, the `$allowedUrls` variable should list all allowed stream URLs.
* **Functionality:**
    * `getMp3StreamTitle()`: Extracts the song title from the stream metadata.
    * `extractArtistAndSong()`:  Separates artist and song title.
    * `getAlbumArt()`:  Fetches album art (currently set up to use the iTunes API). 
    * `updateHistory()`:  Maintains a history of played songs. 

**Note:**

If the `api` field is left blank in the station configuration, will default to the pre-configured web API.  Make sure the web API you are using is functioning and correctly set up within the JavaScript code.

### 4. Customization, Interface, Interaction, and Publication

The sections regarding:

* **Customizing visual styles** (`css/main.min.css` and `custom.css`)
* **Using custom images and icons** (`assets/`)
* **User interface elements** (header, station selector, history, etc.)
* **User navigation and interaction** 
* **Publishing the player to a web server** 

#### 4.1. Key Elements

* **Header:** Displays the station logo and buttons for accessing the history, station list, and mobile menu. 
* **Player Section:** Contains the album art, song information (artist and title), playback controls (play/pause, next/previous station), and volume control.
* **Visualizer:** A simple audio visualizer that responds dynamically to the music.
* **Off-Canvas Sidebar:**
    * **Station List:** Displays all available stations with thumbnails.
    * **History:** Shows a history of recently played songs.
* **Lyrics Modal:** Displays the lyrics of the currently playing song (if available through the Vagalume API).

#### 4.2. Navigation

* **Station Selection:** Click on a station in the station list to begin playback.
* **Song History:** Access the history through the button in the header.
* **Song Lyrics:** Click the "Lyrics" button to open the lyrics modal.
* **Mobile Menu:** The menu button in the header provides access to the same functionality on mobile devices.

### 5. Customization

#### 5.1. Visual Styles (`css/main.min.css` and `custom.css`)

* Colors, fonts, spacing, element sizes, and other visual properties can be customized by editing the CSS rules.

#### 5.2.  Images and Icons (`assets/`)

* Replace the default images in the `assets` folder with your own to customize the station logo, album art, and icons.

### 6. Publication

1. Make sure the local API (`api.php`), if used, is configured correctly and accessible on your server.
2. Upload all files and folders (HTML, CSS, JavaScript, PHP, images) to your web server. 

## Free Hosting

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/jailsonsb2/Radioplayer_api)
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/jailsonsb2/Radioplayer_api)

### 7. Additional Considerations

* **Copyright:**  Ensure that you have the rights to use all images, music, and other content used in your radio player.
* **Stream Metadata:** The accuracy of song information is dependent on the quality of the metadata provided by the radio station's stream. 





