# OpenDraft

AI-powered research paper generator with verified citations.

## Quick Start

```bash
npx opendraft
```

That's it! The CLI will guide you through setup.

## Requirements

- **Node.js 14+** (for npx)
- **Python 3.10+** (must be installed on your system)

## Usage

```bash
# Interactive mode (recommended)
npx opendraft

# Quick generate
npx opendraft "Your Research Topic"

# With options
npx opendraft "AI in Healthcare" --level master --lang en
```

## Options

| Option | Description |
|--------|-------------|
| `--level` | Academic level: `research_paper`, `bachelor`, `master`, `phd` |
| `--style` | Citation style: `apa`, `mla`, `chicago`, `ieee` |
| `--lang` | Language: `en`, `de`, `es`, `fr`, `it`, `pt`, `zh`, `ja`, `ko`, `ru` |
| `--author` | Your name (for cover page) |
| `--institution` | University/institution name |

## Troubleshooting

### Python Not Found

If you see "Python not found", install Python 3.10+:

- **macOS**: `brew install python@3.11` or download from [python.org](https://python.org)
- **Windows**: Download from [python.org](https://python.org) (check "Add to PATH")
- **Linux**: `sudo apt install python3 python3-pip`

### Installation Failed

Try installing the Python package manually:

```bash
pip install opendraft
```

## Links

- Website: https://opendraft.xyz
- Documentation: https://opendraft.xyz/docs
- GitHub: https://github.com/federicodeponte/opendraft
- Issues: https://github.com/federicodeponte/opendraft/issues

## License

MIT
