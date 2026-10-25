# CW Copy

CW Copy is a one-page Morse code (CW) copying trainer. It plays a word, counts you in, and waits for you to type what you heard.

- **Modes:** Listen solo, Read solo (dots and dashes on screen), and Partner (one person plays, the other answers out loud).
- **What to practice:** words, letters, numbers, call signs, Q codes and ham shorthand (with meanings), prosigns, or a mix.
- **Game loop:** "Here comes your word in 3, 2, 1", the word plays (1 to 5 times, default 2), and a wrong answer replays it. A soft chime says right or wrong, and a fanfare plays when the session is done.
- **Learns your weak letters** and gives you more of them. Also has Send practice with an on-screen key or the spacebar, a code chart, and history.

Everything is in `index.html`. Settings and history are saved in the browser.

## Run

Open `index.html` in a browser, or visit <https://wyattfry.github.io/cwcopy/>.

## Test

```sh
npm test
```

`morse.test.js` runs the app in a fake page with a fake clock (no installs needed, Node 20+).

## GitHub Pages

The [deploy workflow](.github/workflows/deploy-pages.yml) runs the tests on every push to `main` and then publishes `index.html`. In **Settings → Pages**, set **Source** to **GitHub Actions**.
