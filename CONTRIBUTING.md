# Contributing to GitPersona

Thank you for considering contributing to GitPersona! Every contribution helps make multi-account Git management easier for developers everywhere.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Code Style](#code-style)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)

---

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). By participating, you are expected to uphold this standard. Please report unacceptable behavior by opening an issue.

---

## How Can I Contribute?

### 🐛 Reporting Bugs

- Check the [existing issues](https://github.com/mkmoiz/githubPersona/issues) to avoid duplicates.
- Include your OS, Python version, and steps to reproduce.
- Paste relevant error messages or terminal output.

### 💡 Suggesting Features

- Open an issue with the **"Feature Request"** label.
- Describe the use case and why it would benefit other users.

### 🔧 Submitting Code

- Bug fixes, new features, documentation improvements, and test additions are all welcome.
- For larger changes, please open an issue first to discuss the approach.

---

## Development Setup

### Prerequisites

- Python 3.10+
- Git
- OpenSSH (`ssh`, `ssh-keygen`)

### Getting Started

```bash
# Clone your fork
git clone https://github.com/<your-username>/githubPersona.git
cd githubPersona

# Run the application
python3 app.py --open

# Run the test suite
python3 -m unittest discover -s tests -v
```

There are **no dependencies** to install — the entire project uses the Python standard library and vanilla JavaScript/CSS.

---

## Code Style

### Python

- Follow [PEP 8](https://peps.python.org/pep-0008/) conventions.
- Use type hints where practical (the codebase targets Python 3.10+).
- Keep functions focused and well-documented.
- Use `AppError` for user-facing error messages.

### JavaScript / CSS

- Vanilla JS only — no frameworks or build tools.
- Follow the existing style in `static/app.js` and `static/style.css`.

### General

- Preserve existing comments and docstrings unrelated to your changes.
- Keep commits atomic — one logical change per commit.
- Write meaningful commit messages (e.g., `fix: prevent crash when SSH key is missing`, `feat: add export profiles functionality`).

---

## Testing

All tests live in the `tests/` directory and use Python's built-in `unittest` framework.

```bash
# Run all tests
python3 -m unittest discover -s tests -v

# Run a specific test file
python3 -m unittest tests.test_app -v

# Validate JavaScript syntax
node --check static/app.js
```

### Testing Guidelines

- All tests run in **isolated temporary directories** — they never touch your real SSH keys or Git configuration.
- New features should include tests.
- Bug fixes should include a regression test when practical.
- Tests must pass before a PR will be reviewed.

---

## Pull Request Process

1. **Fork** the repository and create a feature branch from `main`.
2. **Make your changes** following the code style guidelines above.
3. **Run the full test suite** and ensure all tests pass.
4. **Update documentation** (README, docstrings) for any changed functionality.
5. **Open a Pull Request** with a clear description of what changed and why.

### PR Checklist

- [ ] Tests pass (`python3 -m unittest discover -s tests -v`)
- [ ] JavaScript syntax is valid (`node --check static/app.js`)
- [ ] Documentation is updated (if applicable)
- [ ] Commit messages are clear and descriptive
- [ ] No unnecessary files are included

---

## 📜 License

By contributing to GitPersona, you agree that your contributions will be licensed under the [MIT License](LICENSE).

---

Thank you for helping make GitPersona better! 🎉
