const { exec } = require('child_process');
const assert = require('node:assert');
const test = require('node:test');

test.after(() => {
  // Force exit after all tests are done to prevent hanging
  process.exit(0);
});

test('Daemon startup and build number test', (t, done) => {
  const daemonProcess = exec('node daemon.js');
  let output = '';
  let isDone = false;

  const finish = (err) => {
    if (isDone) return;
    isDone = true;
    daemonProcess.kill();
    done(err);
    t.end(); // Signal test completion
  };

  const onData = (data) => {
    output += data;
    const buildNumberMatch = output.match(/Build: #(\d+)/);

    if (buildNumberMatch) {
      try {
        assert(
          buildNumberMatch[1] !== 'unknown' &&
            !isNaN(parseInt(buildNumberMatch[1], 10)),
          `Build number should be a number, not "${buildNumberMatch[1]}"`,
        );
        finish(); // Success
      } catch (e) {
        finish(e); // Assertion failure
      }
    }
  };

  daemonProcess.stdout.on('data', onData);
  daemonProcess.stderr.on('data', onData);

  daemonProcess.on('exit', (code) => {
    if (isDone) return;
    // The process exited before the build number was found.
    finish(
      new Error(
        `Daemon process exited (code ${code}) without logging a valid build number. Output:\n${output}`,
      ),
    );
  });
});
