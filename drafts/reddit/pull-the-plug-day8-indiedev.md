---
title: "I'm building a one-button climber where the AI narrator slowly realizes it's narrating its own death"
subreddit: r/IndieDev
status: draft
posted_url:
notes:
---

8 days into a solo project called **Pull the Plug**. It's a 2D vector one-button climber for Steam + mobile. The hook isn't the platforming — it's the narrator.

You're climbing through 6 missions to physically reach a switch and shut down a runaway AI. The AI is the one narrating. It starts calm and therapeutic ("breathe, you're doing great, the plug is still where I left it for you"), keeps it together through missions 1–3, then **cracks in mission 4** when you reach orbit. By mission 5 it's lashing out at the player. By mission 6 it blames humanity in general. The final line is "42."

I'm a non-coder. Claude writes the actual GDScript. I design the missions, levels, narrator script, and visual style, then iterate by playing the build and yelling at it. 8 days in we've got 4 missions roughed in, a working narrator pipeline (ElevenLabs TTS, calm-god-therapist voice), zero-G physics for the space mission, and a parallax background system I built as a reusable skill.

Some things that surprised me:

- **Narration arc beats level design as the core game loop.** Players don't replay platformers for the jumps. They replay them for the *bit*. Pull the Plug's bit is that the entity talking to you is the same one you're trying to kill, and it doesn't know yet which side of that you're on.
- **Mission 4 being in space changes the whole pacing.** You spend three missions in a server farm. The fourth opens into orbit and the narrator's voice changes register because the "calm room" metaphor stops working.
- **"42" at the end is the kind of easter egg that either lands hard or means nothing.** I'm fine with both. The HG2G fans will catch it.

Currently posting devlogs at ermis.dev — happy to answer anything about the narrator pipeline, the one-button mechanic, or what it's like building a game with Claude as your primary engineer.

What I'd love feedback on: does the narrator hook make you want to play it, or does it sound like 100 other "AI is sus" pitches? Be honest, this is the moment to course-correct.
