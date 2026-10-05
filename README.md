<p align="center">
  <img src="static/favicon.svg" alt="GitPersona Logo" width="80" height="80">
</p>

<h1 align="center">GitPersona</h1>

<p align="center">
  <strong>The local Git identity and GitHub account hub.</strong><br>
  Switch accounts in one click, verify SSH authentication, pin identities to local repositories, and cryptographically sign your commits.
</p>

<p align="center">
  <a href="https://github.com/mkmoiz/githubPersona/blob/main/LICENSE"><img src="https://img.shields.io/github/license/mkmoiz/githubPersona?style=flat-square&color=green" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/python-3.10+-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python 3.10+">
  <img src="https://img.shields.io/badge/dependencies-zero-success?style=flat-square" alt="Zero Dependencies">
  <img src="https://img.shields.io/badge/platform-Linux%20%7C%20macOS-lightgrey?style=flat-square" alt="Platform: Linux and macOS">
  <img src="https://img.shields.io/badge/tests-26%20passed-brightgreen?style=flat-square" alt="Tests: 26 passed">
  <a href="https://github.com/mkmoiz/githubPersona/issues"><img src="https://img.shields.io/github/issues/mkmoiz/githubPersona?style=flat-square" alt="Issues"></a>
  <a href="https://github.com/mkmoiz/githubPersona/stargazers"><img src="https://img.shields.io/github/stars/mkmoiz/githubPersona?style=flat-square" alt="Stars"></a>
</p>

---

## Table of Contents

- [Why GitPersona?](#why-gitpersona)
- [Features](#-features)
- [Quick Start](#-quick-start)
- [How It Works](#-how-it-works)
- [Configuration](#-configuration)
- [API Reference](#-api-reference)
- [Testing](#-testing--verification)
- [Security Architecture](#️-security-architecture)
- [Contributing](#-contributing)
- [FAQ](#-faq)
- [License](#-license)

---

## Why GitPersona?

Managing multiple GitHub accounts (Work, Personal, Open Source, Clients) on a single computer is notoriously error-prone:

- You accidentally push work commits with your personal email, or personal commits with your corporate email.
- Juggling SSH keys often leads to `Permission denied (publickey)` remote errors.
- Your commits show up as **"Unverified"** on GitHub because commit signing isn't configured for each specific identity.
- Global config changes break local project workflows.

**GitPersona** solves this once and for all with a lightweight local web dashboard. It manages your Git author attribution, SSH host aliases, commit signing, and local repository pins with **zero external dependencies** and **zero cloud services**.

---

## 💡 Why I Built This & Why I Use It (Author's Note)

> *"I originally built this tool out of sheer necessity for my own daily engineering work.*
>
> *Like many developers, I manage multiple GitHub accounts on a single workstation—my day job/work repositories, personal open-source projects, and client codebases. Constantly switching between them was an absolute headache:*
> - *I would accidentally push corporate commits with my personal email, or personal commits with my work email.*
> - *Juggling multiple SSH keys inevitably caused `Permission denied (publickey)` errors at the worst possible times.*
> - *Commits would show up as **Unverified** on GitHub because GPG/SSH commit signing wasn't configured per-identity.*
> - *Manually editing global `.gitconfig` or `.ssh/config` was tedious and fragile.*
>
> *I built **GitPersona** to solve these exact problems once and for all. It lets me pin identities directly to repositories so I never commit under the wrong email again, verify SSH connections before pushing, and sign every commit cleanly.*
>
> ***It is 100% free and open source.** Since it completely streamlined my workflow and saved me countless hours of config debugging, I'm publishing it so other developers facing the same multi-account pain can use it too."*
>
> — **Moiz Khan** ([@mkmoiz](https://github.com/mkmoiz))

---

## ✨ Features

| Feature | Description |
|---|---|
| **⚡ 1-Click Identity Switching** | Updates global `user.name`, `user.email`, and `core.sshCommand` together atomically. |
| **🔐 Native SSH Commit Signing** | Configures `gpg.format = ssh`, `user.signingkey`, and `commit.gpgsign` so your commits display GitHub's green **Verified** badge. |
| **📂 Repository Scanner & Pinning** | Detects local repositories, highlights mismatches, and locks identities into `.git/config` with one click. Pinned repos are immune to global account switches. |
| **🔑 Ed25519 Key Generation** | Generates modern Ed25519 keys locally with optional passphrases and owner-only (`0600`) permissions. |
| **✅ Live GitHub Connection Testing** | Runs `ssh -T` through account host aliases to verify the exact GitHub username authenticated before you push. |
| **🛡️ Automated Snapshots & Rollback** | Automatically backs up your Git and SSH configs before every mutation, with instant 1-click restore from the UI. |
| **🚀 Zero Dependencies** | Runs on the Python 3.10+ standard library and vanilla JavaScript/CSS. Under 20 MB RAM, no `pip install` or `node_modules` required. |
| **🔒 Privacy by Design** | Binds to loopback (`127.0.0.1`), enforces per-process mutation tokens, and never transmits or stores private keys. |

---

## 🚀 Quick Start

### Prerequisites

- **Python** 3.10 or newer
- **Git**
- **OpenSSH** (`ssh`, `ssh-keygen`)

### Option A: Install globally (Recommended)

```bash
git clone https://github.com/mkmoiz/githubPersona.git
cd githubPersona
./scripts/install.sh
```

This creates:
- `~/.local/bin/gitpersona` — available anywhere in your terminal
- `~/.local/share/applications/gitpersona.desktop` — launches from your application menu

Now simply run:

```bash
gitpersona
```

### Option B: Run directly

```bash
git clone https://github.com/mkmoiz/githubPersona.git
cd githubPersona
./scripts/start-ui.sh
```

Open **http://127.0.0.1:7463** in your browser. Pass `--port 7464` if port 7463 is in use.

### Option C: Run with Python

```bash
python3 app.py --open
```

---

## 📖 How It Works

```
                     +---------------------------------------+
                     |         GitPersona Dashboard          |
                     |         http://127.0.0.1:7463         |
                     +-------------------+-------------------+
                                         |
            +----------------------------+---------------------------+
            |                            |                           |
            v                            v                           v
  +-------------------+        +--------------------+      +--------------------+
  |   Global Config   |        | Local Repositories |      |    SSH Config      |
  | ~/.config/git/cfg |        | repo/.git/config   |      | ~/.ssh/config      |
  +-------------------+        +--------------------+      +--------------------+
  | user.name         |        | user.name (pinned) |      | Host github-work   |
  | user.email        |        | user.email (pinned)|      |   HostName gh.com  |
  | core.sshCommand   |        | gpg.format = ssh   |      |   IdentityFile ... |
  | commit.gpgsign    |        | user.signingkey    |      | Host github-pers   |
  +-------------------+        +--------------------+      +--------------------+
```

### 1. Linking & Activating Accounts

1. GitPersona scans `~/.ssh` and displays all available private keys and fingerprints.
2. Click **Link account** to associate a key with your Git name, verified GitHub email, and optional commit signing.
3. Click **Activate account**. GitPersona atomically updates your global Git configuration while backing up the previous configuration.

### 2. Pinning Identities to Repositories

1. Open the **Repositories** tab.
2. GitPersona discovers repositories on your computer (e.g. `~/clients`, `~/Projects`, `~/src`).
3. Click **Pin account** on any repository to lock the correct author, email, SSH command, and commit signing into that repo's `.git/config`.
4. Work seamlessly across personal and client projects without worrying about global account state.

### 3. Account-Specific SSH Remotes

GitPersona maintains clean aliases in `~/.ssh/config`:

```ssh-config
# >>> github-operator managed accounts >>>
# Generated by GitPersona. Edit accounts in the app.
Host github-work
    HostName github.com
    HostKeyAlias github.com
    User git
    IdentityFile "/home/user/.ssh/id_work"
    IdentitiesOnly yes
# <<< github-operator managed accounts <<<
```

Use the **Get SSH origin** helper in the app to generate origin URLs:

```bash
git remote add origin git@github-work:organization/repository.git
```

---

## ⚙️ Configuration

### Command-Line Options

| Option | Default | Description |
|---|---|---|
| `--port PORT` | `7463` | HTTP port to listen on |
| `--data-dir DIR` | `.data/` | Directory for profiles and backups |
| `--open` | off | Open the dashboard in your default browser on start |

### Data Directory

All account data is stored in the `--data-dir` directory (default: `.data/` within the project):

```
.data/
├── profiles.json      # Your saved account configurations
└── backups/           # Automatic config snapshots
    ├── global-*.gitconfig
    └── ssh-config-*
```

### Environment Variables

GitPersona respects standard Git environment variables. If any of the following are set, you'll see a warning in the dashboard:

- `GIT_SSH_COMMAND`, `GIT_SSH`
- `GIT_AUTHOR_NAME`, `GIT_AUTHOR_EMAIL`
- `GIT_COMMITTER_NAME`, `GIT_COMMITTER_EMAIL`
- `GIT_CONFIG_COUNT`, `GIT_CONFIG_GLOBAL`
- `XDG_CONFIG_HOME`

---

## 📡 API Reference

GitPersona exposes a local REST API (bound to `127.0.0.1` only):

### GET Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/status` | Returns all profiles, keys, current Git config, and warnings |
| `GET /api/repos` | Scans and lists local repositories |
| `GET /api/backups` | Lists available config backups |

### POST Endpoints

All POST endpoints require the `X-Operator-Token` header (provided by `/api/status`) and a JSON body.

| Endpoint | Description |
|---|---|
| `POST /api/profiles/save` | Create or update an account profile |
| `POST /api/profiles/activate` | Switch the active global identity |
| `POST /api/profiles/verify` | Test SSH connection to GitHub |
| `POST /api/profiles/delete` | Remove an account profile |
| `POST /api/keys/generate` | Generate a new Ed25519 SSH key |
| `POST /api/repos/scan` | Scan a custom directory for repositories |
| `POST /api/repos/pin` | Pin an identity to a repository |
| `POST /api/repos/unpin` | Remove identity pinning from a repository |
| `POST /api/backups/restore` | Restore a configuration backup |

---

## 🧪 Testing & Verification

GitPersona ships with a comprehensive automated test suite covering atomic file operations, lock handling, SSH alias preservation, key generation, and HTTP security headers:

```bash
# Run all tests
python3 -m unittest discover -s tests -v

# Validate JavaScript syntax
node --check static/app.js
```

All tests execute in isolated temporary environments and **never modify** your personal keys or Git configuration.

---

## 🛡️ Security Architecture

| Layer | Protection |
|---|---|
| **Loopback isolation** | Server binds strictly to `127.0.0.1`. Requests with foreign `Host` or `Origin` headers are rejected (HTTP 403). |
| **CSRF token protection** | Every mutation requires a per-process cryptographic token (`X-Operator-Token`). |
| **Atomic updates & locks** | Uses Git's config locking protocol and `os.replace()` to prevent configuration corruption. |
| **Private key protection** | Private key bytes are never read into browser memory or stored in profiles. Key generation communicates with `ssh-keygen` via stdin pipes. |
| **Zero telemetry** | No external CDNs, fonts, tracking, analytics, or cloud connections. |
| **Content Security Policy** | Strict CSP headers prevent XSS and injection attacks. |

---

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Quick steps:

1. **Fork** the repository
2. **Create a feature branch**: `git checkout -b feature/my-feature`
3. **Commit your changes**: `git commit -m 'Add my feature'`
4. **Push to the branch**: `git push origin feature/my-feature`
5. **Open a Pull Request**

Please make sure to:
- Run the test suite before submitting (`python3 -m unittest discover -s tests -v`)
- Follow existing code style
- Update documentation for any changed functionality

---

## ❓ FAQ

<details>
<summary><strong>Does GitPersona store my private keys?</strong></summary>

No. GitPersona only stores the *path* to your SSH key in its profiles. Private key bytes are never read into memory by the application or sent to the browser.
</details>

<details>
<summary><strong>Can I use this with GitLab, Bitbucket, or other Git hosts?</strong></summary>

The SSH host alias management is designed for GitHub. However, the core identity switching (user.name, user.email, core.sshCommand) works with any Git remote. Contributions to support other hosts are welcome!
</details>

<details>
<summary><strong>Is the web server accessible from the network?</strong></summary>

No. The server binds exclusively to `127.0.0.1` (loopback) and actively rejects requests from non-local origins. It is only accessible from your own machine.
</details>

<details>
<summary><strong>What happens if I already have entries in ~/.ssh/config?</strong></summary>

GitPersona only manages a clearly marked block (between `# >>> github-operator managed accounts >>>` and `# <<< github-operator managed accounts <<<`). All your existing SSH config entries outside this block are preserved untouched.
</details>

<details>
<summary><strong>Does it work with SSH agent forwarding?</strong></summary>

Yes. GitPersona uses `IdentitiesOnly yes` in its SSH config entries, which ensures the correct key is used even when an SSH agent is running with multiple keys loaded.
</details>

---

## 📄 License

Distributed under the **[MIT License](LICENSE)**. 100% Free and Open Source.

You are free to use, modify, and distribute this software for any purpose — personal, commercial, or otherwise.

---

<p align="center">
  Created with care by <strong>Moiz Khan</strong> (<a href="https://github.com/mkmoiz">@mkmoiz</a>)<br><br>
  ⭐ If GitPersona helps your workflow, consider giving it a star!
</p>
