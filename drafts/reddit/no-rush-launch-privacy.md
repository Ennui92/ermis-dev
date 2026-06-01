---
title: "Built a messenger with no push notifications. The product is the absence of pressure."
subreddit: r/privacy
status: draft
posted_url:
notes: Alt subs — r/degoogle, r/SideProject, r/PrivacyTools. The post keeps it short. Code goes open under a permissive licence when the prototype rolls into v1.
---

Three weeks into a slow encrypted messenger called No Rush. The site is norush.chat. You can install the prototype to your home screen from app.norush.chat right now and have a play.

The whole point of it is what it does not do.

No push notifications. No badge on the icon. No green dot. No "online 2m ago". No read receipt. No typing indicator. None of the levers that turn a friendly thing into a debt. It's not a setting you can flip on — the server has no push infrastructure at all. That's the strongest version of the promise.

Crypto is Signal protocol. The server holds short-lived sealed envelopes addressed to a recipient mailbox, doesn't know who sent them, and deletes them the instant the recipient's device fetches them. You can watch the row appear and disappear in the dashboard during a test conversation. If the server got breached tomorrow what the attacker would find is hashed phone numbers and a queue that drains on a cron.

A few things surprised me about what the product wanted once it was real:

A letter mode where a longer message arrives on coloured paper in a serif font and you flip the phone sideways to sign at the bottom. People use it for the thing the spec calls "I want to write to my friend in a slower way." I did not write the spec.

Voice notes that transcribe to text on the recipient's device, locally, via Whisper. Audio never goes to a transcription server.

"Morning mail" — you write at 1am, you tell it to deliver at 9. Nobody is awake at 1am to read your 1am thought.

Free, no ads, no subscription. The code is going up under an open licence. If you want to spin up your own relay, you can.

Take it for a spin and tell me if it feels calm to use, because that's the only test that matters. Comments here or on ennui92.github.io/ermis-dev/posts/no-rush-day-one.html.

---

**Alt titles:**
1. Built a messenger with no push notifications, no badge, no green dot. Free. Code goes open. Take it for a spin.
2. Three weeks into a calm encrypted messenger. The server has zero push infrastructure. Try it from your home screen.
3. I wanted a messenger that has no read receipts and can't be made to have them. So I built one. It's at app.norush.chat
