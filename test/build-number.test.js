const { exec } = require('child_process');
const assert = require('node:assert');
const test = require('node:test');

test('Daemon startup and build number test', (t, done) => {
  const daemonProcess = exec('node daemon.js');
  let output = '';

  const onData = (data) => {
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
  };

  daemonProcess.stdout.on('data', onData);
  daemonProcess.stderr.on('data', onData);

  daemonProcess.on('exit', (code) => {
    if (code !== 0 && !output.includes('Starting Pixoo Daemon')) {
      assert.fail(`Daemon process exited with code ${code}. Output: ${output}`);
      done();
    }
  });
});
