# Digital Presenter Track Zone Builder

[![Example Coordinate Capture](/images/ExampleCoordinates.jpg)](#)

The Digital Presenter Track Zone Builder provides a static, browser-based
interface for defining a custom
`xConfiguration Cameras PresenterTrack TriggerZone` polygon.

This tool is specifically for Cisco Digital Presenter Track trigger zones. It
does not apply to Motorized Presenter Track. Supported presenter cameras are
Cisco P60 and Cisco PTZ4K.

Open the hosted tool:

[Digital Presenter Track Zone Builder ->](https://ctg-tme.github.io/Advanced-Presenter-Track-Zoning/)

## Key

The color may differ depending on your color settings.

- Triangle - starting coordinate
- Circle - intermediate coordinate
- Square - ending coordinate

## Instructions

Before starting, position the Digital Presenter Track camera using Cisco's
[normal configuration process](https://help.webex.com/en-us/article/9ur0g6/Set-up-PresenterTrack-for-Board-and-Room-Series)
and save the camera view.

1. Get a screenshot of the P60 or PTZ4K presenter camera view.
   - Join a meeting bridge and capture the camera image.
   - If Remote Monitoring is installed, use the device Web UI image.
2. Upload the screenshot to the canvas.
3. Place coordinate points on the canvas.
   - Left click places a point.
   - Right click deletes a point.
   - Undo Last Point works well on touch devices.
4. Build the custom zone.
   - You do not need to close the shape manually.
   - The first and last points are connected automatically by TriggerZone.
   - Avoid intersecting lines.
5. Copy the coordinates when the zone is complete.
6. Save them under
   [xConfiguration Cameras PresenterTrack TriggerZone](https://roomos.cisco.com/xapi/Configuration.Cameras.PresenterTrack.TriggerZone/).

## Tools

- Image upload and drag-and-drop image loading
- Line color
- Point color
- Line thickness
- Coordinate paste and validation
- Copy coordinates
- Undo last point
- Clear coordinates

## FAQ

### Why does the tool say Digital Presenter Track only?

Cisco also offers Motorized Presenter Track. This coordinate workflow applies to
Digital Presenter Track trigger zones on Cisco P60 and PTZ4K cameras only.

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
