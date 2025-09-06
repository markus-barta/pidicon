const { exec } = require('child_process');
const assert = require('node:assert');
const test = require('node:test');

test('Daemon startup and build number test', async () => {
  const daemonProcess = exec('node daemon.js');
  let output = '';

  return new Promise((resolve, reject) => {
    // Set a timeout to prevent hanging forever
    const timeout = setTimeout(() => {
      daemonProcess.kill('SIGKILL');
      reject(new Error('Test timed out after 5 seconds'));
    }, 5000);

    const onData = (data) => {
      output += data;
      const buildNumberMatch = output.match(/Build: #(\d+)/);

      if (buildNumberMatch) {
        clearTimeout(timeout);
        daemonProcess.kill('SIGKILL');

        try {
          assert(
            buildNumberMatch[1] !== 'unknown' &&
              !isNaN(parseInt(buildNumberMatch[1], 10)),
            `Build number should be a number, not "${buildNumberMatch[1]}"`,
          );
          resolve(); // Success
        } catch (e) {
          reject(e); // Assertion failure
        }
      }
    };

    daemonProcess.stdout.on('data', onData);
    daemonProcess.stderr.on('data', onData);

    daemonProcess.on('exit', (code) => {
      clearTimeout(timeout);
      // Only reject if we haven't found the build number yet
      if (!output.includes('Build: #')) {
        reject(
          new Error(
            `Daemon process exited (code ${code}) without logging a valid build number. Output:\n${output}`,
          ),
        );
      }
    });

    daemonProcess.on('error', (err) => {
      clearTimeout(timeout);
      reject(new Error(`Failed to start daemon process: ${err.message}`));
    });
  });
});

// Ensure the test runner exits after all tests complete
test.after(() => {
  // Give a moment for cleanup then force exit
  setTimeout(() => process.exit(0), 100);
});
