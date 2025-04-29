# Advanced Presenter Track Zone Builder

[![Example Coordinate Capture](/images/ExampleCoordniates.png)](#)

The Advanced Presenter Track Zone Builder (APTZB) provides an interface that allows you to define a custom Presenter Track Trigger Zone.

This doesn't modify the default behavior of the presenter track feature, but it allows for more precise zoning in your area to trigger the presenter track solution.

Gain access to the tool by clicking the link below

[Advanced Presenter Track Zone Builder ->](https://ctg-tme.github.io/Advanced-Presenter-Track-Zoning/)

## Key
The color may differ depending on your color settings above
- 🔺 - The Starting Coordinate Dot
- 🔴 - Intermediate Coordinate Dot
- 🟥 - Ending Coordinate Dot

## Instructions
Before starting, it's recommended you first position your camera for Presentertrack following its [normal configuration process](https://help.webex.com/en-us/article/9ur0g6/Set-up-PresenterTrack-for-Board-and-Room-Series) and save

1. Get a screenshot of your PTZ Camera View
  - Have this system join a Meeting Bridge and grab a Screen Shot of the Camera Image
  - If you have Remote Monitoring Installed, go to the Web UI and copy the image from that interface
2. Upload the Screenshot to this Canvas
3. Place your first Coordinate Dot on the Canvas
  - Left Clicking places a dot
  - Right Clicking deletes a dot
4. Build out your custom Zone
  - You don't need to close the shape
  - The First and Last Dot will Auto Close the shape for you
  - Try to avoid intersecting lines
5. When complete, select the Copy Coordinates button
6. Save these coordinates under [xConfiguration Cameras PresenterTrack TriggerZone](https://roomos.cisco.com/xapi/Configuration.Cameras.PresenterTrack.TriggerZone/)

## Tools
- Image Upload
- Line Color
- Dot Color
- Line Thickness
- Coordinates List with Copy Button

## FAQ

- What's the line that follows my mouse pointer?
  - It's the preview line, so you can see where the next line connects

- What's the dotted line connecting the Starting Dot and Ending Dot?
  - The the Autocomplete Line
    - You don't need to connect the Starting and Endpoint Dot, [xConfiguration Cameras PresenterTrack TriggerZone](https://roomos.cisco.com/xapi/Configuration.Cameras.PresenterTrack.TriggerZone/) assumes those 2 are connected by default

- Why can't I intersect the lines?
  - The [xConfiguration Cameras PresenterTrack TriggerZone](https://roomos.cisco.com/xapi/Configuration.Cameras.PresenterTrack.TriggerZone/) API doesn't handle intersecting lines well. It's best to avoid where possible. The canvas does it's best at preventing you from doing so if it's detected