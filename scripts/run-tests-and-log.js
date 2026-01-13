const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const logPath = path.join(process.cwd(), 'test-output.txt');
const logStream = fs.createWriteStream(logPath, { flags: 'w' });

const jestBin = path.join(
  process.cwd(),
  'node_modules',
  'jest-cli',
  'bin',
  'jest.js'
);
const command = process.execPath;
const args = [jestBin];

const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });

child.stdout.on('data', (chunk) => {
  process.stdout.write(chunk);
  logStream.write(chunk);
});

child.stderr.on('data', (chunk) => {
  process.stderr.write(chunk);
  logStream.write(chunk);
});

child.on('close', (code) => {
  logStream.end(() => {
    process.exit(code ?? 1);
  });
});

child.on('error', (error) => {
  const message = `Failed to run tests: ${error.message}\n`;
  process.stderr.write(message);
  logStream.write(message);
  logStream.end(() => {
    process.exit(1);
  });
});
