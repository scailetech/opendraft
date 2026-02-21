# Contributing to OpenDraft

Thanks for your interest in contributing to OpenDraft!

## Quick Start

```bash
# Clone the repo
git clone https://github.com/federicodeponte/opendraft.git
cd opendraft

# Install dependencies
pip install -e ./engine[dev]

# Run tests
cd engine && pytest tests/ -v
```

## Development Setup

1. **Python 3.10+** required
2. **Gemini API key** - Get free at [aistudio.google.com](https://aistudio.google.com/apikey)
3. Set `GOOGLE_API_KEY` in `.env`

## Code Structure

```
opendraft/
├── engine/           # Main Python package
│   ├── opendraft/    # CLI and entry points
│   ├── phases/       # Pipeline phases (research, structure, compose, etc.)
│   ├── utils/        # Utilities (citations, retry, export, etc.)
│   └── tests/        # Test suite
├── npm/              # npm wrapper package
└── docs/             # Documentation
```

## Making Changes

1. Fork the repo
2. Create a branch (`git checkout -b feature/your-feature`)
3. Make changes
4. Run tests (`pytest tests/ -v`)
5. Commit (`git commit -m "feat: your feature"`)
6. Push and open a PR

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance

## What to Contribute

- Bug fixes
- Documentation improvements
- New citation sources
- New export formats
- Performance improvements
- Test coverage

## Questions?

Open an issue or reach out to [@federicodeponte](https://github.com/federicodeponte).

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
