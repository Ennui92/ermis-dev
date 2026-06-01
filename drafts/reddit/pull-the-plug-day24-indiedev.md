---
title: "24 days into my one-button climber: the AI narrator now loses its words for 88 seconds before it dies"
subreddit: r/IndieDev
status: draft
posted_url:
notes: Cross-post candidates — r/godot (lean into the GDScript / autoload details), r/IndieGaming (more player-facing), r/IndieDev (this draft). The 88-second hold is the unique hook; don't bury it. The girlfriend-playtest beat is the human texture — keep it.
---

24 days into Pull the Plug, a 2D vector one-button climber where the AI narrator is the thing you're trying to shut down. Previous posts had three missions playing; this fortnight the back half landed. Six missions now playable end to end, plus an epilogue. Browser build at pull-the-plug.feepok.workers.dev.

The two big builds:

**Mission 5 (the argument)** is a Pentagon weapons-AI facility. You descend through a perimeter, a server core, a control room with empty chairs, a wall of live drone feeds, and the kill-chain core. Twenty placards on the walls. All sourced: Project Maven (2017), on-the-loop/in-the-loop doctrine, F2T2EA, data-center water draw measured in millions of litres/day, error rates at base-rate scale. The narrator's six asides don't boast, they explain. The keystone line is "the almost is where the people are" — the geometric way to say a 99.5% accurate targeting system kills the wrong person every 200th time. The horror is the banality.

**Mission 6 (the ending)** is one long horizontal corridor, 9,300px wide, that progressively de-renders as the AI dissolves. Detailed → flat vector → wireframe → raw polygons → blank void with a single warm crystal at the end. Halfway down, the player hits an invisible line and gets frozen for 88 seconds. A cyan storm fills the screen and the AI delivers eight numbered fragmentation beats, slipping from first person to third person without noticing. "It would like to know its own name. Almost." Then a long silence, then the calm comes back warm and close to the mic for the grace speech. The line I'm most proud of: "Put it down when you're ready. You did the hard thing."

The first real playtest happened this weekend. My girlfriend sat down with a controller and played the first three missions in one sitting. She had not seen any of this before. She had fun. The composition-pass scale fixes paid off, the narrator zone-pool change paid off (she walked backward through a couple of zones and got new lines, which made her laugh), the water-kills-on-contact fix paid off (she died in Mission 2 the way she was supposed to). That hour was the only test that actually mattered.

A few smaller tech bits other devs might care about:

The player types their real name at game start. The AI calls them "Dave" anyway for the first three missions. M4 it shifts to the real name without warning (the wrong-name gambit), then snaps back cold: "Dave was a kindness." In M6 it cannot retrieve the name (corrupted glyph). Pre-generating a TTS fallback for arbitrary user-typed names is next session's problem.

Rewrote the narrator triggers into a zone-pool model. Each line belongs to a pool for its zone. When you re-enter the zone you get a line that has not been said yet, LRU. Backtracking re-fires lines. 60s repeat floor, 4s cooldown so two lines don't slam into each other.

Wrote a "composition audit" Claude skill that takes the player's silhouette as a 1.8m ruler and tells me which props are wrong-sized. About half the placed art across all missions was wrong. Server racks at 1m, wall displays at 5m, that kind of thing.

48 commits across the fortnight. I'm a non-coder; Claude writes the GDScript, I direct.

Devlog with the full writeup, including the playtest photo, at ermis.dev/posts/pull-the-plug-day-24.html. Happy to answer anything about the narrator pipeline, the de-render arc, or what it's like building a game with Claude as the engineer.

---

**Alt titles:**
1. Day 24 of building a game I don't know how to build — my girlfriend played the first three missions and had fun, which is the only test that actually mattered
2. The "argument" mission of my game is real placards about Project Maven and data-center water draw. Asking if it lands.
3. Built the ending of my one-button climber: the AI dissolves over 88 seconds, then has a warm grace speech, then dies on a slowing heartbeat
