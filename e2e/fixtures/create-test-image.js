#!/usr/bin/env node
const fs = require('fs');
// Minimal 1x1 red PNG (67 bytes)
const pngBuf = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108020000009001' + '2e0000000c4944415408d7636020050000006400017ad2c0de0000000049454e44ae426082', 'hex');
fs.writeFileSync('/home/zkh/Workbench/testbench/svelte-press/e2e/fixtures/test-image.jpg', pngBuf);
console.log('Created test-image.jpg');
