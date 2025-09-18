#!/usr/local/bin/fish
# Simple fish wrapper to run the live test harness against the real device
# Expects env vars MOSQITTO_HOST_MS24, MOSQITTO_USER_MS24, MOSQITTO_PASS_MS24, PIXOO_DEV_IP to be set in the shell

node (realpath (dirname (status -f)))/live_test_harness.js | tee /tmp/live_test_harness.out | cat
