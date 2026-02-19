#!/usr/bin/env node

/**
 * OpenDraft CLI - npm wrapper for the Python paper generator
 *
 * Usage:
 *   npx opendraft              - Interactive mode
 *   npx opendraft "Your Topic" - Quick generate
 *   npx opendraft --install    - Install/update Python package
 */

const { spawn, execSync } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');
const https = require('https');

// ANSI colors for terminal output
const PURPLE = '\x1b[95m';
const GREEN = '\x1b[92m';
const YELLOW = '\x1b[93m';
const RED = '\x1b[91m';
const CYAN = '\x1b[96m';
const GRAY = '\x1b[90m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

function print(msg) {
  console.log(`  ${msg}`);
}

function printBox(lines, color = PURPLE) {
  const maxLen = Math.max(...lines.map(l => l.replace(/\x1b\[[0-9;]*m/g, '').length));
  const width = maxLen + 4;

  console.log();
  print(`${color}${'─'.repeat(width)}${RESET}`);
  for (const line of lines) {
    const cleanLen = line.replace(/\x1b\[[0-9;]*m/g, '').length;
    const padding = ' '.repeat(maxLen - cleanLen);
    print(`${color}│${RESET}  ${line}${padding}  ${color}│${RESET}`);
  }
  print(`${color}${'─'.repeat(width)}${RESET}`);
  console.log();
}

function printLogo() {
  console.log(`
${PURPLE}${BOLD}  ╔══════════════════════════════════════════════════════════╗
  ║                                                            ║
  ║   ██████╗ ██████╗ ███████╗███╗   ██╗                       ║
  ║  ██╔═══██╗██╔══██╗██╔════╝████╗  ██║                       ║
  ║  ██║   ██║██████╔╝█████╗  ██╔██╗ ██║                       ║
  ║  ██║   ██║██╔═══╝ ██╔══╝  ██║╚██╗██║                       ║
  ║  ╚██████╔╝██║     ███████╗██║ ╚████║                       ║
  ║   ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═══╝                       ║
  ║  ██████╗ ██████╗  █████╗ ███████╗████████╗                 ║
  ║  ██╔══██╗██╔══██╗██╔══██╗██╔════╝╚══██╔══╝                 ║
  ║  ██║  ██║██████╔╝███████║█████╗     ██║                    ║
  ║  ██║  ██║██╔══██╗██╔══██║██╔══╝     ██║                    ║
  ║  ██████╔╝██║  ██║██║  ██║██║        ██║                    ║
  ║  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝        ╚═╝                    ║
  ║                                                            ║
  ╚══════════════════════════════════════════════════════════╝${RESET}
`);
}

function checkPython() {
  const home = os.homedir();

  // Check Python commands - prefer stable versions (3.10-3.13)
  const pythonCommands = [
    // Homebrew (stable versions first)
    '/opt/homebrew/bin/python3.13',
    '/opt/homebrew/bin/python3.12',
    '/opt/homebrew/bin/python3.11',
    '/opt/homebrew/bin/python3.10',
    '/opt/homebrew/bin/python3',
    '/usr/local/bin/python3',
    // python.org macOS installer
    '/Library/Frameworks/Python.framework/Versions/3.13/bin/python3',
    '/Library/Frameworks/Python.framework/Versions/3.12/bin/python3',
    '/Library/Frameworks/Python.framework/Versions/3.11/bin/python3',
    '/Library/Frameworks/Python.framework/Versions/3.10/bin/python3',
    // Conda (common locations)
    `${home}/anaconda3/bin/python`,
    `${home}/miniconda3/bin/python`,
    `${home}/miniforge3/bin/python`,
    `${home}/mambaforge/bin/python`,
    '/opt/anaconda3/bin/python',
    '/opt/miniconda3/bin/python',
    // pyenv
    `${home}/.pyenv/shims/python3`,
    `${home}/.pyenv/shims/python`,
    // Generic
    'python3.13',
    'python3.12',
    'python3.11',
    'python3.10',
    'python3',
    'python',
    // System Python (macOS)
    '/usr/bin/python3',
  ];

  let oldestFound = null; // Track if we find an old Python version

  for (const cmd of pythonCommands) {
    try {
      const version = execSync(`${cmd} --version 2>&1`, { encoding: 'utf8' }).trim();
      const match = version.match(/Python (\d+)\.(\d+)/);
      if (match) {
        const major = parseInt(match[1]);
        const minor = parseInt(match[2]);
        // Require Python 3.10-3.13
        if (major === 3 && minor >= 10 && minor <= 13) {
          return { cmd, version: `${major}.${minor}`, status: 'ok' };
        }
        // Track old Python versions (3.7, 3.8, 3.9)
        if (major === 3 && minor >= 7 && minor < 10) {
          if (!oldestFound || minor > oldestFound.minor) {
            oldestFound = { cmd, major, minor, version: `${major}.${minor}` };
          }
        }
      }
    } catch (e) {
      // Command not found, try next
    }
  }

  // Return info about old Python if found
  if (oldestFound) {
    return { cmd: oldestFound.cmd, version: oldestFound.version, status: 'too_old' };
  }

  return null;
}

function checkOpendraftInstalled(pythonCmd) {
  try {
    // Check specifically for opendraft.cli module (not just opendraft)
    execSync(`${pythonCmd} -c "from opendraft.cli import main"`, {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    return { installed: true, error: null };
  } catch (e) {
    // Parse the error to give helpful feedback
    const stderr = e.stderr || e.message || '';

    if (stderr.includes('No module named')) {
      return { installed: false, error: 'not_installed' };
    } else if (stderr.includes('SyntaxError')) {
      return { installed: false, error: 'syntax_error' };
    } else if (stderr.includes('ImportError')) {
      return { installed: false, error: 'import_error' };
    }

    return { installed: false, error: 'unknown', details: stderr };
  }
}

function installOpendraft(pythonCmd) {
  print(`${CYAN}Installing OpenDraft Python package...${RESET}`);
  console.log();

  // Try pipx first (cleanest for CLI tools)
  try {
    execSync('which pipx', { encoding: 'utf8', stdio: 'pipe' });
    print(`${GRAY}Using pipx (recommended)...${RESET}`);
    execSync('pipx install opendraft', { encoding: 'utf8', stdio: 'inherit' });
    return { success: true };
  } catch (e) {
    // pipx not available, try pip
  }

  // Try pip with --user and --break-system-packages for modern Python
  try {
    execSync(`${pythonCmd} -m pip install --user --break-system-packages --upgrade opendraft`, {
      encoding: 'utf8',
      stdio: 'inherit'
    });
    return { success: true };
  } catch (e) {
    // Try without --break-system-packages for older pip
  }

  // Fallback: try basic pip install
  try {
    execSync(`${pythonCmd} -m pip install --upgrade opendraft`, {
      encoding: 'utf8',
      stdio: 'inherit'
    });
    return { success: true };
  } catch (e) {
    const errorMsg = (e.stderr || e.message || '').toLowerCase();

    // Detect specific error types for better messages
    if (errorMsg.includes('permission denied') || errorMsg.includes('errno 13') || errorMsg.includes('access denied')) {
      return { success: false, error: 'permission_denied' };
    }
    if (errorMsg.includes('network') || errorMsg.includes('connection') || errorMsg.includes('timeout') ||
        errorMsg.includes('could not find') || errorMsg.includes('no matching distribution') ||
        errorMsg.includes('retrying') || errorMsg.includes('ssl')) {
      return { success: false, error: 'network_error' };
    }
    if (errorMsg.includes('no space') || errorMsg.includes('disk full') || errorMsg.includes('errno 28')) {
      return { success: false, error: 'disk_full' };
    }
    if (errorMsg.includes('no module named pip') || errorMsg.includes('pip not found') ||
        errorMsg.includes('no such file') && errorMsg.includes('pip')) {
      return { success: false, error: 'no_pip' };
    }

    return {
      success: false,
      error: e.stderr || e.message || 'Unknown installation error'
    };
  }
}

function runOpendraft(pythonCmd, args) {
  // Run via the verified Python to avoid version mismatches
  const script = `
import sys
sys.argv = ['opendraft'] + ${JSON.stringify(args)}
from opendraft.cli import main
main()
`;

  const proc = spawn(pythonCmd, ['-c', script], {
    stdio: 'inherit',
    env: process.env
  });

  proc.on('error', (err) => {
    showFriendlyError('run_failed', {
      pythonCmd,
      error: err.message
    });
    process.exit(1);
  });

  proc.on('close', (code) => {
    process.exit(code || 0);
  });
}

function showFriendlyError(errorType, details = {}) {
  console.log();

  switch (errorType) {
    case 'no_python':
      printBox([
        `${RED}${BOLD}Python Not Found${RESET}`,
        ``,
        `OpenDraft needs Python 3.10 or higher to run.`,
        ``,
        `${BOLD}To fix this:${RESET}`,
      ], RED);

      const platform = os.platform();
      if (platform === 'darwin') {
        print(`${BOLD}Option 1: Download from python.org (easiest)${RESET}`);
        print(`  1. Go to ${CYAN}https://python.org/downloads${RESET}`);
        print(`  2. Click the yellow "Download Python" button`);
        print(`  3. Run the installer`);
        print(`  4. Try ${CYAN}npx opendraft${RESET} again`);
        console.log();
        print(`${BOLD}Option 2: Use Homebrew${RESET}`);
        print(`  ${CYAN}brew install python@3.11${RESET}`);
      } else if (platform === 'win32') {
        print(`${BOLD}Download Python:${RESET}`);
        print(`  1. Go to ${CYAN}https://python.org/downloads${RESET}`);
        print(`  2. Click "Download Python"`);
        print(`  3. ${YELLOW}IMPORTANT: Check "Add Python to PATH"${RESET}`);
        print(`  4. Run the installer`);
        print(`  5. ${BOLD}Restart your terminal${RESET}`);
        print(`  6. Try ${CYAN}npx opendraft${RESET} again`);
      } else {
        print(`${BOLD}Install Python:${RESET}`);
        print(`  ${CYAN}sudo apt install python3 python3-pip${RESET}  (Ubuntu/Debian)`);
        print(`  ${CYAN}sudo dnf install python3 python3-pip${RESET}  (Fedora)`);
        print(`  ${CYAN}sudo pacman -S python python-pip${RESET}      (Arch)`);
      }
      break;

    case 'python_too_old':
      printBox([
        `${RED}${BOLD}Python Version Too Old${RESET}`,
        ``,
        `You have Python ${details.version}, but OpenDraft needs 3.10+`,
      ], RED);

      const platOld = os.platform();
      print(`${BOLD}You need to install a newer Python version:${RESET}`);
      console.log();

      if (platOld === 'darwin') {
        print(`${BOLD}Option 1: Homebrew (recommended)${RESET}`);
        print(`  ${CYAN}brew install python@3.11${RESET}`);
        console.log();
        print(`${BOLD}Option 2: Download from python.org${RESET}`);
        print(`  ${CYAN}https://python.org/downloads${RESET}`);
      } else if (platOld === 'win32') {
        print(`1. Go to ${CYAN}https://python.org/downloads${RESET}`);
        print(`2. Download Python 3.11 or newer`);
        print(`3. ${YELLOW}Check "Add Python to PATH"${RESET} during install`);
        print(`4. ${BOLD}Restart your terminal${RESET}`);
      } else {
        print(`${CYAN}sudo apt install python3.11${RESET}  (Ubuntu/Debian)`);
        print(`${CYAN}sudo dnf install python3.11${RESET}  (Fedora)`);
      }
      console.log();
      print(`Then try again: ${CYAN}npx opendraft${RESET}`);
      console.log();
      print(`${GRAY}Your current Python ${details.version} will not be affected.${RESET}`)
      break;

    case 'install_failed':
      printBox([
        `${RED}${BOLD}Installation Failed${RESET}`,
        ``,
        `We couldn't install the OpenDraft Python package.`,
      ], RED);

      print(`${BOLD}Try these fixes:${RESET}`);
      console.log();
      print(`${BOLD}1. Install manually with pip:${RESET}`);
      print(`   ${CYAN}pip install opendraft${RESET}`);
      console.log();
      print(`${BOLD}2. If that fails, try with sudo (Linux/Mac):${RESET}`);
      print(`   ${CYAN}sudo pip install opendraft${RESET}`);
      console.log();
      print(`${BOLD}3. Or use pipx (recommended for CLI tools):${RESET}`);
      print(`   ${CYAN}brew install pipx && pipx install opendraft${RESET}`);
      console.log();

      if (details.error && typeof details.error === 'string' && !['permission_denied', 'network_error', 'disk_full'].includes(details.error)) {
        print(`${GRAY}Technical details: ${details.error.substring(0, 200)}${RESET}`);
      }
      break;

    case 'permission_denied':
      printBox([
        `${RED}${BOLD}Permission Denied${RESET}`,
        ``,
        `Can't install packages - you don't have permission.`,
      ], RED);

      print(`${BOLD}Try one of these:${RESET}`);
      console.log();
      print(`${BOLD}Option 1: Install for your user only (recommended)${RESET}`);
      print(`  ${CYAN}pip install --user opendraft${RESET}`);
      console.log();
      print(`${BOLD}Option 2: Use sudo (if Option 1 doesn't work)${RESET}`);
      print(`  ${CYAN}sudo pip install opendraft${RESET}`);
      console.log();
      print(`${BOLD}Option 3: Use pipx (cleanest)${RESET}`);
      print(`  ${CYAN}pipx install opendraft${RESET}`);
      break;

    case 'network_error':
      printBox([
        `${RED}${BOLD}Network Error${RESET}`,
        ``,
        `Can't download the package. Check your internet.`,
      ], RED);

      print(`${BOLD}Things to try:${RESET}`);
      console.log();
      print(`1. Check your internet connection`);
      print(`2. If on VPN, try disconnecting temporarily`);
      print(`3. If on corporate network, you may need proxy settings`);
      console.log();
      print(`${BOLD}Then try again:${RESET}`);
      print(`  ${CYAN}npx opendraft${RESET}`);
      console.log();
      print(`${GRAY}Still not working? Try downloading manually:${RESET}`);
      print(`  ${CYAN}pip install opendraft --timeout 120${RESET}`);
      break;

    case 'disk_full':
      printBox([
        `${RED}${BOLD}Disk Full${RESET}`,
        ``,
        `Not enough disk space to install the package.`,
      ], RED);

      print(`${BOLD}Free up some space:${RESET}`);
      console.log();
      print(`1. Empty your Trash/Recycle Bin`);
      print(`2. Delete old downloads or unused apps`);
      print(`3. Clear pip cache: ${CYAN}pip cache purge${RESET}`);
      console.log();
      print(`Then try again: ${CYAN}npx opendraft${RESET}`);
      break;

    case 'no_pip':
      printBox([
        `${RED}${BOLD}pip Not Found${RESET}`,
        ``,
        `Python is installed but pip (package manager) is missing.`,
      ], RED);

      const platPip = os.platform();
      print(`${BOLD}Install pip:${RESET}`);
      console.log();

      if (platPip === 'darwin') {
        print(`${CYAN}python3 -m ensurepip --upgrade${RESET}`);
        console.log();
        print(`Or reinstall Python from ${CYAN}https://python.org${RESET}`);
      } else if (platPip === 'win32') {
        print(`${CYAN}python -m ensurepip --upgrade${RESET}`);
        console.log();
        print(`Or reinstall Python and check "pip" during install`);
      } else {
        print(`${CYAN}sudo apt install python3-pip${RESET}  (Ubuntu/Debian)`);
        print(`${CYAN}sudo dnf install python3-pip${RESET}  (Fedora)`);
      }
      console.log();
      print(`Then try again: ${CYAN}npx opendraft${RESET}`);
      break;

    case 'module_not_found':
      printBox([
        `${RED}${BOLD}OpenDraft Package Issue${RESET}`,
        ``,
        `Python is installed, but the OpenDraft package`,
        `is missing or incomplete.`,
      ], RED);

      print(`${BOLD}To fix this, reinstall the package:${RESET}`);
      console.log();
      print(`  ${CYAN}pip uninstall opendraft -y${RESET}`);
      print(`  ${CYAN}pip install opendraft${RESET}`);
      console.log();
      print(`Then try again: ${CYAN}npx opendraft${RESET}`);
      console.log();

      print(`${GRAY}If the problem persists, you may need to upgrade pip:${RESET}`);
      print(`  ${CYAN}pip install --upgrade pip${RESET}`);
      break;

    case 'import_error':
      printBox([
        `${RED}${BOLD}Missing Dependencies${RESET}`,
        ``,
        `OpenDraft is installed but some required`,
        `Python packages are missing.`,
      ], RED);

      print(`${BOLD}To fix this:${RESET}`);
      console.log();
      print(`  ${CYAN}pip install --upgrade opendraft${RESET}`);
      console.log();
      print(`This will install all required dependencies.`);
      console.log();
      print(`Then try again: ${CYAN}npx opendraft${RESET}`);
      break;

    case 'run_failed':
      printBox([
        `${RED}${BOLD}Failed to Start${RESET}`,
        ``,
        `Something went wrong while starting OpenDraft.`,
      ], RED);

      print(`${BOLD}Try these steps:${RESET}`);
      console.log();
      print(`1. Reinstall the package:`);
      print(`   ${CYAN}pip install --upgrade --force-reinstall opendraft${RESET}`);
      console.log();
      print(`2. If using a virtual environment, make sure it's activated`);
      console.log();
      print(`3. Check Python version (need 3.10+):`);
      print(`   ${CYAN}python3 --version${RESET}`);
      console.log();

      if (details.error) {
        print(`${GRAY}Error: ${details.error}${RESET}`);
      }
      break;

    default:
      printBox([
        `${RED}${BOLD}Something Went Wrong${RESET}`,
        ``,
        `An unexpected error occurred.`,
      ], RED);

      print(`${BOLD}Please try:${RESET}`);
      print(`  ${CYAN}pip install --upgrade opendraft${RESET}`);
      print(`  ${CYAN}npx opendraft${RESET}`);
      console.log();
      print(`${BOLD}Still having issues?${RESET}`);
      print(`  Report at: ${CYAN}https://github.com/federicodeponte/opendraft/issues${RESET}`);
  }

  console.log();
}

function hasHomebrew() {
  try {
    execSync('which brew', { encoding: 'utf8', stdio: 'pipe' });
    return true;
  } catch (e) {
    return false;
  }
}

function askQuestion(question) {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase().trim());
    });
  });
}

async function offerPythonInstall() {
  const platform = os.platform();

  if (platform === 'darwin' && hasHomebrew()) {
    console.log();
    print(`${GREEN}Good news!${RESET} We can install Python automatically.`);
    console.log();

    const answer = await askQuestion(`  Install Python 3.11 now? (Y/n): `);

    if (answer === '' || answer === 'y' || answer === 'yes') {
      console.log();
      print(`${CYAN}Installing Python 3.11 via Homebrew...${RESET}`);
      print(`${GRAY}This may take a few minutes.${RESET}`);
      console.log();

      try {
        execSync('brew install python@3.11', { stdio: 'inherit' });
        console.log();
        print(`${GREEN}${BOLD}Success!${RESET} Python is now installed.`);
        console.log();
        print(`Run this command again: ${CYAN}npx opendraft${RESET}`);
        console.log();
        return true;
      } catch (e) {
        console.log();
        print(`${RED}Installation failed.${RESET} Please install manually.`);
        return false;
      }
    }
  }

  return false;
}

/**
 * Send anonymous first-run telemetry (once per machine)
 * - Only runs once, creates marker file after
 * - Respects DO_NOT_TRACK environment variable
 * - No personal data, just OS type for install count
 */
function sendFirstRunTelemetry() {
  // Respect DO_NOT_TRACK (https://consoledonottrack.com/)
  if (process.env.DO_NOT_TRACK === '1' || process.env.OPENDRAFT_NO_TELEMETRY === '1') {
    return;
  }

  const configDir = path.join(os.homedir(), '.opendraft');
  const markerFile = path.join(configDir, '.telemetry-sent');

  // Check if already sent
  if (fs.existsSync(markerFile)) {
    return;
  }

  // Create config dir if needed
  try {
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
  } catch (e) {
    return; // Can't create dir, skip telemetry
  }

  // Send anonymous ping (fire and forget, non-blocking)
  const data = JSON.stringify({
    event: 'install',
    os: os.platform(),
    arch: os.arch(),
    node: process.version,
    v: require('../package.json').version,
    t: Date.now()
  });

  const req = https.request({
    hostname: 'opendraft.xyz',
    port: 443,
    path: '/api/telemetry',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    },
    timeout: 3000
  }, () => {
    // Success - create marker file
    try {
      fs.writeFileSync(markerFile, new Date().toISOString());
    } catch (e) {
      // Ignore write errors
    }
  });

  req.on('error', () => {
    // Silently ignore network errors - telemetry is optional
  });

  req.on('timeout', () => {
    req.destroy();
  });

  req.write(data);
  req.end();
}

async function main() {
  const args = process.argv.slice(2);

  // Handle --version
  if (args.includes('--version') || args.includes('-v')) {
    const pkg = require('../package.json');
    console.log(`opendraft ${pkg.version} (npm wrapper)`);
    return;
  }

  // Handle --help
  if (args.includes('--help') || args.includes('-h')) {
    sendFirstRunTelemetry();
    printLogo();
    print(`${BOLD}Usage:${RESET}`);
    print(`  ${CYAN}npx opendraft${RESET}                    Interactive mode (recommended)`);
    print(`  ${CYAN}npx opendraft "Your Topic"${RESET}       Quick generate`);
    print(`  ${CYAN}npx opendraft --install${RESET}          Install/update`);
    console.log();
    print(`${BOLD}Options:${RESET}`);
    print(`  --level, -l      Academic level (research_paper, bachelor, master, phd)`);
    print(`  --style, -s      Citation style (apa, mla, chicago, ieee)`);
    print(`  --lang           Language (en, de, es, fr, it, pt, zh, ja, ko, ru)`);
    print(`  --output, -o     Output directory`);
    console.log();
    print(`${BOLD}Cover Page (optional):${RESET}`);
    print(`  --author         Your name`);
    print(`  --institution    University/institution`);
    print(`  --department     Department name`);
    print(`  --advisor        Supervisor name`);
    console.log();
    print(`${BOLD}Examples:${RESET}`);
    print(`  ${CYAN}npx opendraft "AI in Healthcare" --level master${RESET}`);
    print(`  ${CYAN}npx opendraft "Climate Change" --lang de --author "Max Muller"${RESET}`);
    console.log();
    print(`${GRAY}https://opendraft.xyz/docs${RESET}`);
    console.log();
    return;
  }

  // Show logo immediately
  printLogo();

  // Send anonymous first-run telemetry (non-blocking)
  sendFirstRunTelemetry();

  print(`${GRAY}Checking environment...${RESET}`);

  // Check Python
  const python = checkPython();

  if (!python) {
    showFriendlyError('no_python');

    // Offer to install automatically on macOS with Homebrew
    const installed = await offerPythonInstall();
    if (!installed) {
      process.exit(1);
    }

    // Re-check Python after installation
    const pythonAfter = checkPython();
    if (!pythonAfter || pythonAfter.status === 'too_old') {
      print(`${RED}Python still not found.${RESET} Please restart your terminal and try again.`);
      process.exit(1);
    }
    return;
  }

  // Check if Python version is too old
  if (python.status === 'too_old') {
    showFriendlyError('python_too_old', { version: python.version });
    process.exit(1);
  }

  print(`${GREEN}✓${RESET} Python ${python.version} found`);

  // Handle --install
  if (args.includes('--install')) {
    const result = installOpendraft(python.cmd);
    if (result.success) {
      console.log();
      print(`${GREEN}${BOLD}Success!${RESET} OpenDraft is ready.`);
      console.log();
      print(`Run: ${CYAN}npx opendraft${RESET}`);
      console.log();
    } else {
      // Show specific error message based on error type
      const errorType = ['permission_denied', 'network_error', 'disk_full', 'no_pip'].includes(result.error)
        ? result.error : 'install_failed';
      showFriendlyError(errorType, { error: result.error });
      process.exit(1);
    }
    return;
  }

  // Check if opendraft is installed
  const installCheck = checkOpendraftInstalled(python.cmd);

  if (!installCheck.installed) {
    if (installCheck.error === 'not_installed') {
      print(`${YELLOW}First-time setup${RESET} - installing OpenDraft...`);
      console.log();

      const result = installOpendraft(python.cmd);

      if (!result.success) {
        // Show specific error message based on error type
        const errorType = ['permission_denied', 'network_error', 'disk_full', 'no_pip'].includes(result.error)
          ? result.error : 'install_failed';
        showFriendlyError(errorType, { error: result.error });
        process.exit(1);
      }

      print(`${GREEN}✓${RESET} OpenDraft installed`);

      // Verify installation worked
      const verifyCheck = checkOpendraftInstalled(python.cmd);
      if (!verifyCheck.installed) {
        showFriendlyError('module_not_found');
        process.exit(1);
      }
    } else if (installCheck.error === 'import_error') {
      showFriendlyError('import_error');
      process.exit(1);
    } else {
      showFriendlyError('module_not_found');
      process.exit(1);
    }
  }

  print(`${GREEN}✓${RESET} OpenDraft ready`);
  console.log();

  // Run opendraft
  runOpendraft(python.cmd, args);
}

main().catch((err) => {
  showFriendlyError('unknown', { error: err.message });
  process.exit(1);
});
