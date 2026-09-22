# Disc

An immersive 3D website where you stand at the exact centre of a 360-degree circle of slender blank vinyl album spines, with dynamic per-album Spotify loading and side-by-side song list playback.

## Features

- **Clean Home Page**: The home page is completely clean—no search bars, headers, or presets. You stand in the centre of a rotunda of slender blank vinyl spines.
- **Search Bar on Empty Albums Only**:
  - Clicking any empty album pulls it forward to the left-hand side.
  - The Spotify search bar pops up inside the right-hand tab, allowing you to paste any Spotify album link.
- **Custom Vinyl Cover & Disc**:
  - Loading an album pulls its high-resolution artwork via Spotify's oEmbed API.
  - The artwork is applied to the square front jacket and the circular center label of the black vinyl disc.
  - The vinyl in the circle is also updated with that album's artwork.
- **Split Layout (Cover + Disc on Left, Song List on Right)**:
  - **Left Hand Side**: The vinyl album jacket and black vinyl disc with matching custom artwork and real-time spinning disc animation.
  - **Right Hand Side**: Full song playback in official album track order without 30-second cutoffs, tracklist with active equalizer, full seek bar, and real-time volume control.
- **Volumetric 3D Spines**: Slender 12" LP cardboard sleeve dimensions (`18px - 26px` width, `10px` thickness) with 48 records around the 360° circle.
- **Continuous 360° Swiping**: Drag, swipe, mouse wheel, or use arrow keys (`←` / `→`) to rotate the circle around you seamlessly.
- **Zero Dependencies**: Pure HTML5, CSS3 3D transforms, vanilla JavaScript, and lightweight Python server.

## How to Run

Open [`index.html`](file:///C:/Users/Joshua/OneDrive/Desktop/work/disc/index.html) directly in any browser, or run the local server:

```powershell
cd "C:\Users\Joshua\OneDrive\Desktop\work\disc"
python server.py 3001
```
Then visit `http://localhost:3001`.
"# Vinyl" 
