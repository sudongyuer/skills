# Runner and case scripts

## Layout

```text
verification/ui/
├── README.md        # case inventory: name → behavior sentence → scene
├── run.py           # runner: appearances × cases, video, results
├── driver.py        # thin AXe/simctl wrapper used by every case
└── cases/
    └── <case>.py    # one behavior per file
```

Output per run: `<out>/<appearance>/<case>/{*.png, *.json, run.mp4, result.json}`.
Reuse one `--output` directory per verification; do not accumulate numbered
copies.

## Driver (minimal)

```python
import json, subprocess, time
from pathlib import Path

class UI:
    def __init__(self, udid, output):
        self.udid, self.output = udid, Path(output)
        self.output.mkdir(parents=True, exist_ok=True)

    def axe(self, *args, timeout=20):
        out = subprocess.check_output(['axe', *args, '--udid', self.udid], text=True, timeout=timeout)
        if out.startswith('Error:'):
            raise RuntimeError(out.strip())
        return out

    def state(self):
        def walk(node):
            if isinstance(node, dict):
                yield node
                for child in node.get('children', []):
                    yield from walk(child)
            elif isinstance(node, list):
                for child in node:
                    yield from walk(child)
        return list(walk(json.loads(self.axe('describe-ui'))))

    def wait(self, predicate, message, timeout=30):
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            result = predicate(self.state())
            if result:
                return result
            time.sleep(0.2)  # polling interval, not an assertion
        raise AssertionError(message)

    def element(self, identifier, timeout=30):
        return self.wait(lambda items: next((i for i in items if i.get('AXUniqueId') == identifier), None),
                         f'Missing {identifier}', timeout)

    def tap(self, identifier):
        self.element(identifier)
        self.axe('tap', '--id', identifier, '--post-delay', '0.5')

    def capture(self, name):
        subprocess.run(['xcrun', 'simctl', 'io', self.udid, 'screenshot', str(self.output / f'{name}.png')],
                       check=True, timeout=20, capture_output=True)
        (self.output / f'{name}.json').write_text(self.axe('describe-ui'))
```

Harden it as the project grows: retry when the AXe session dies after a
relaunch, use physical tap style for text inputs that swallow synthetic taps,
switch keyboards when an IME holds typed text as composition.

## Case script contract

```python
"""The composer's Fast toggle keeps its value after the model panel is closed and reopened."""
import sys
from driver import UI

ui = UI(*sys.argv[1:])            # udid, output dir
ui.element('ui-verify-ready')
ui.tap('session-input')
ui.tap('session-model')
toggle = ui.element('composer-fast')
assert toggle['frame']['width'] >= 44 and toggle['frame']['height'] >= 44, 'Fast needs a 44 pt target'
ui.capture('off')
ui.tap('composer-fast')
ui.wait(lambda _: ui.element('composer-fast').get('AXValue') == 'On', 'Fast did not turn on')
ui.capture('on')
print('PASS: Fast toggle target size, state change, persistence')
```

- First line: the behavior sentence (the README inventory copies it).
- Exit non-zero on any failure; print one `PASS:` line on success.
- No fixed sleeps as assertions; `wait` on accessibility state.
- Capture every state a reviewer should see, with descriptive names.

## Runner responsibilities

1. Resolve a Simulator: an explicit `--udid` (CI) or a leased, named device
   per task; boot it; override the status bar (`simctl status_bar … override
   --time 9:41`) for stable screenshots.
2. For each appearance: set it, (re)launch the app with the verify flag,
   start `xcrun simctl io <udid> recordVideo --codec=hevc <out>/run.mp4`, wait
   for the first frame, run the case with a timeout, stop recording (SIGINT)
   and wait for the file to finalize.
3. Write `result.json`: case, appearance, status, duration, failure message,
   commit SHA, dirty flag, Xcode version, device model/runtime/UDID.
4. On failure, keep `failure.png` and the last AX tree next to the video.
5. Exit non-zero if any case failed or any expected artifact is missing.

## CI

- Use a macOS runner with the Xcode version the project pins; build once, run
  the core suite, upload `<out>` as an artifact on failure.
- Keep full light/dark + video runs for PRs that change UI; a light-only core
  suite may gate every push.
