# Digital Presenter Track Zone Builder

[![Example Coordinate Capture](/images/ExampleCoordinates.jpg)](#)

The Digital Presenter Track Zone Builder is a static, browser-based tool for
building custom trigger-zone coordinates for:

[`xConfiguration Cameras PresenterTrack TriggerZone`](https://roomos.cisco.com/xapi/Configuration.Cameras.PresenterTrack.TriggerZone/)

This tool is specifically for Cisco Digital Presenter Track. It does not apply
to Motorized Presenter Track. Supported presenter cameras are Cisco P60 and
Cisco PTZ4K.

Open the hosted tool:

[Digital Presenter Track Zone Builder](https://ctg-tme.github.io/Advanced-Presenter-Track-Zoning/)

## What It Does

- Uploads a P60 or PTZ4K camera-view screenshot.
- Draws a TriggerZone polygon over the camera image.
- Lets you add points manually or start from a simple shape.
- Lets you drag existing points to refine the zone.
- Provides Undo and Redo history for point adds, moves, shape placement,
  coordinate edits, and clears.
- Validates that points are inside the 1920 x 1080 camera frame.
- Prevents duplicate points and intersecting zone lines.
- Copies coordinates in the compact format expected by TriggerZone.
- Keeps valid coordinates in the URL hash for other apps to scrape.
- Collects lightweight Aptabase analytics for feature usage, copy/export
  outcomes, session summaries, help-guide opens, and explicit feedback.

## Compatibility

Use this tool only for Cisco Digital Presenter Track trigger zones on Cisco P60
and Cisco PTZ4K cameras.

This coordinate workflow is not for Motorized Presenter Track.

## Quick Start

Before starting, position the Digital Presenter Track camera using Cisco's
[normal PresenterTrack configuration process](https://help.webex.com/en-us/article/9ur0g6/Set-up-PresenterTrack-for-Board-and-Room-Series)
and save the camera view.

1. Get a screenshot of the P60 or PTZ4K presenter camera view.
   - Join a meeting bridge and capture the camera image, or
   - Use the device Web UI image if Remote Monitoring is installed.
2. Upload the screenshot.
3. Build the zone.
   - Left click to add manual points.
   - Drag existing points to adjust the zone.
   - Use Add Shape to place a triangle, rectangle, rhombus, trapezoid,
     parallelogram, pentagon, L shape, hexagon, or octagon.
   - Use Undo and Redo to move through edit history.
4. Copy and save under
   [`xConfiguration Cameras PresenterTrack TriggerZone`](https://roomos.cisco.com/xapi/Configuration.Cameras.PresenterTrack.TriggerZone/).

## Tools

### Presenter Camera View

- Upload an image.
- Clear the uploaded image and return to the sample image.
- The sample image is faded and labeled so it is clear that users should upload
  their own camera view.
- Uploaded images are restored on refresh with browser local storage.

### Zone Appearance

- Theme picker with eight presets.
- Line width selector.
- Dim Image toggle, enabled by default, to make the drawn zone easier to see.
- Themes affect only the zone line and point colors. They do not alter the
  uploaded image or grid.

Theme options:

- Evening Fjord
- Poppy Breeze
- Meadow Stone
- Aurora Slate
- Deuteranopia
- Protanopia
- Tritanopia
- Monochrome

### Placement

- Grid spacing selector: 20, 40, 60, 80, or 120 pixels.
- Snap to Grid toggle, enabled by default.
- Add Shape modal with:
  - Triangle
  - Rectangle
  - Rhombus
  - Trapezoid
  - Parallelogram
  - Pentagon
  - L Shape
  - Hexagon
  - Octagon

After a shape is placed, the tool returns to manual mode and the generated
points can be dragged like any manually placed zone.

### Coordinates

- Coordinates can be typed or pasted directly.
- Complete x,y pairs are applied automatically.
- Missing or invalid coordinate values are highlighted without changing the
  typed text.
- Copy, Undo, Redo, and Clear are coordinate actions.
- Status messages describe whether the zone is valid or what needs attention.

### Help Guide

- First-time help opens automatically unless the browser has cached "Don't show
  again."
- The Help button in the header reopens the guide at any time.
- The guide summarizes compatibility, drawing, placement helpers, coordinate
  entry, shortcuts, and where to save the final values.

### Feedback

- The Feedback button opens an in-app survey.
- Feedback submissions are sent to Aptabase only when the user explicitly
  submits the form.
- Bug feedback points users to GitHub Issues so screenshots and reproduction
  steps can be attached.
- Coordinate values, uploaded images, and camera screenshots are not sent.

## Analytics

This static GitHub Pages app uses
[`@aptabase/web`](https://github.com/aptabase/aptabase-js). The committed app
contains only the placeholder `aptabase_api_key_placeholder`. During the GitHub
Pages deployment, `.github/workflows/deploy-pages.yml` replaces that placeholder
with the repository secret `APTABASE_API_KEY`. The workflow now fails the
deployment if the secret is missing or if the placeholder remains in the Pages
artifact.

For hosted analytics, make sure GitHub Pages is configured to build from
GitHub Actions rather than deploying directly from a branch. Otherwise Pages can
serve the committed source files before the workflow has a chance to inject the
key.

Production setup:

1. Add a repository Actions secret named `APTABASE_API_KEY`.
2. In GitHub Pages settings, set the source to `GitHub Actions`.
3. Run the `Deploy static content to Pages` workflow or push to `main`.

The app treats `localhost`, `127.0.0.1`, and `::1` as debug sessions when a key
has been injected. The hosted `ctg-tme.github.io` page is treated as live.
Other `github.io` hosts are treated as forks or mirrors and analytics remains
disabled unless the code is intentionally changed.

For local debugging, create `.env.local` from `.env.local.example`:

```bash
APTABASE_API_KEY=your_aptabase_app_key
```

Then run:

```bash
npm run local-env
```

This generates the ignored file `src/local-env.js`, which the browser imports
only on local debug hosts when the committed config still has the placeholder.
`npm run dev` runs the generator and starts a static server on port 5174.

Tracked events include:

- `session_started`: app/session context, display theme, zone theme, grid,
  snap, dim image, and whether a custom image is present.
- `tool_used`: tool names and small tool-specific properties.
- `coordinates_copied`: point count and valid-zone context at copy time.
- `session_summary`: point count and aggregated tool counts when the page is
  hidden or exited.
- `feedback_submitted`: survey rating, use case, outcome, and requested
  improvement.

The app intentionally avoids sending raw coordinate values, image data, or
uploaded file names.

Because this is a static browser app, the injected Aptabase key is visible in
the deployed page source. The workflow keeps the key out of the repository and
prevents accidental fork reuse, but it is not a replacement for a server-side
proxy if the key ever needs to be truly secret.

## Keyboard Shortcuts

- Cmd/Ctrl+C copies valid coordinates.
- Cmd/Ctrl+V pastes coordinates into the coordinate editor.
- Cmd/Ctrl+Z undoes the last zone action.
- Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y redoes the last undone action.

## URL Hash Coordinates

The current valid zone is written to the URL hash as:

```text
#dptCoordinates=x,y,x,y,x,y
```

When no valid zone exists, the hash is:

```text
#dptCoordinates=notSet
```

The `dpt` prefix is shorthand for Digital Presenter Track. This makes the hash
explicit enough to support future features without ambiguity.

Legacy `#coordinates` and `#coords` values are accepted and normalized to
`#dptCoordinates`.

## Point Key

The point markers are:

- Triangle: starting coordinate
- Circle: intermediate coordinates
- Square: ending coordinate

You do not need to repeat the first point at the end. TriggerZone closes the
shape automatically.

## Notes

- Avoid intersecting lines.
- Keep every point inside the 1920 x 1080 frame.
- Do not repeat the first point at the end of the coordinate list.
- Save the copied values under
  [`xConfiguration Cameras PresenterTrack TriggerZone`](https://roomos.cisco.com/xapi/Configuration.Cameras.PresenterTrack.TriggerZone/).

## FAQ

### Why does the tool say Digital Presenter Track only?

Cisco also offers Motorized Presenter Track. This coordinate workflow applies to
Digital Presenter Track trigger zones on Cisco P60 and PTZ4K cameras only.

### Why are Dim Image and Snap to Grid enabled by default?

Dim Image improves contrast between the camera image and the zone overlay. Snap
to Grid makes it easier to place clean, repeatable coordinates.

### What is the line that follows my mouse pointer?

It is the preview line, so you can see where the next line connects.

### What is the dotted line connecting the starting and ending points?

It is the automatic closing line. You do not need to connect the starting and
ending points manually because
[`xConfiguration Cameras PresenterTrack TriggerZone`](https://roomos.cisco.com/xapi/Configuration.Cameras.PresenterTrack.TriggerZone/)
assumes those points are connected.

### Why can't I intersect the lines?

The TriggerZone configuration does not handle intersecting lines well. The canvas
checks for intersecting lines while you draw and before copied or pasted
coordinates are accepted.

### How is the JavaScript organized?

`script.js` is now a small module entry point. The app logic lives in `src/`:

- `src/app.js`: app orchestration, event binding, canvas drawing, and UI state.
- `src/analytics.js`: Aptabase loading and event shaping.
- `src/config.js`: constants, hash names, themes, shape labels, and analytics
  settings.
- `src/coordinates.js`: coordinate parsing, formatting, and inline validation
  highlighting.
- `src/dom.js`: DOM element collection.
- `src/geometry.js`: point math, shape generation, and zone validation.
- `src/history.js`: Undo/Redo state management.
- `src/url-hash.js`: `dptCoordinates` hash read/write behavior.
