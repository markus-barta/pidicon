const { exec } = require('child_process');
const assert = require('node:assert');
const test = require('node:test');

test('Daemon startup and build number test', (t, done) => {
  const daemonProcess = exec('node daemon.js');
  let output = '';

  daemonProcess.stdout.on('data', (data) => {
    output += data;
    // Look for the log message indicating the daemon has started and check the build number.
    if (output.includes('Starting Pixoo Daemon')) {
      const buildNumberMatch = output.match(/Build: #(\d+)/);
      assert(buildNumberMatch, 'Build number should be logged on startup');
      assert(
        buildNumberMatch[1] !== 'unknown' &&
          !isNaN(parseInt(buildNumberMatch[1], 10)),
        `Build number should be a number, not "${buildNumberMatch[1]}"`,
      );
      daemonProcess.kill();
      done();
    }
  });

  daemonProcess.stderr.on('data', (data) => {
    // Fail the test if there are any errors during startup
    assert.fail(`Daemon startup produced an error: ${data}`);
    daemonProcess.kill();
    done();
  });
});
