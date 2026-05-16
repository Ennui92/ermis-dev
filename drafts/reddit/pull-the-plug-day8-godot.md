---
title: "8 days into a Godot 4 project as a non-coder — the dev tools that paid for themselves on day one"
subreddit: r/godot
status: draft
posted_url:
notes:
---

Solo dev building a one-button vertical platformer in Godot 4. I can't write GDScript — Claude does that part — so my whole workflow depends on shortcuts that let me *verify* a change without having to read the code. Eight days in, here are the dev tools that turned out to be worth way more than the hour it took to build each.

**Fly cam autoload (F).** Toggles a camera that's untethered from the player. Press 0 to frame the entire 9000×2200 map at zoom 0.18. 1–5 jump to specific zones. WASD pans, wheel zooms. When you're laying out a 5-zone mission this is the difference between "wait, where does the player even go" and a god-view of the whole level in one keystroke.

**Checkpoint placer (K).** Press K anywhere mid-run and it both spawns a checkpoint at the player's exact position AND writes the node into the .tscn file. So I can playtest, find the spot that *feels* like a checkpoint, hit K, and the file is already updated when I quit. No editor round-trip.

**Numbered screenshot key (P).** P saves `_shots/shot_NNN.png`. Counter persists across runs. I take 4–6 shots through a zone, then drop the whole batch into Claude with "what's wrong with these?" One prompt, six observations, no waiting for tool latency between each.

**Character cycle (C).** Six character variants in the repo (pixel + vector versions). C cycles through them live. Persists to disk. Lets me visually compare on the actual level instead of in a mockup folder.

**Asset palette in the editor.** Every mission scene has a `PROP_PALETTE` Node2D parked off-screen at (-3500, -1500). It holds one of each sprite with a label next to it. To place a prop, I open the scene, frame the palette, duplicate, drag in. No "where's that .png path again" — every prop is one Ctrl+D away.

**The Three Plane Rule.** All decoration goes in `bg_far` (parallax 0.4×, dark + small), `bg_mid` (0.7×, mid-tone), or `bg_near` (0.95×, full saturation). Gameplay sprites are at 1.0×. Anything that doesn't have a plane assigned ends up clipping a platform or floating in nowhere-land. Codifying this killed a whole class of bugs.

**Custom parallax skill.** Wrote up the parallax setup as a reusable Claude skill so I don't re-explain it every session — Claude reads the skill, sets up planes correctly, never asks me again.

**Narrator CMS.** All narrator lines live in a YAML-ish bank organized by mission and trigger. I edit them in a normal editor, run a generator, ElevenLabs caches the audio. The game loads from the cache. Means I can tweak a line without rebuilding anything.

The throughline: every one of these exists because I got burned by a slow loop. "Edit → export → push → play → hate it → repeat" is too slow when you can't even read the code in step one. Each shortcut compresses one step in that loop until the loop fits inside a single playtest session.

Project's called **Pull the Plug** (one-button climber, AI narrator that slowly cracks, mission 4 is in space). Writing devlogs at ermis.dev if anyone's curious about the bigger picture.

Happy to dump the actual GDScript for any of these autoloads if useful. Most are <100 lines.
