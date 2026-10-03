# GitPersona

<p align="center">
  <strong>The local Git identity and GitHub account hub.</strong><br>
  Switch accounts in one click, verify SSH authentication, pin identities to local repositories, and cryptographically sign your commits.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/python-3.10+-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python 3.10+">
  <img src="https://img.shields.io/badge/dependencies-zero-success?style=flat-square" alt="Zero Dependencies">
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License: MIT">
  <img src="https://img.shields.io/badge/platform-Linux%20%7C%20macOS-lightgrey?style=flat-square" alt="Platform: Linux and macOS">
  <img src="https://img.shields.io/badge/tests-26%20passed-brightgreen?style=flat-square" alt="Tests: 26 passed">
</p>

---

## Why GitPersona?

Managing multiple GitHub accounts (Work, Personal, Open Source, Clients) on a single computer is notoriously error-prone:
- You accidentally push work commits with your personal email, or personal commits with your corporate email.
- Juggling SSH keys often leads to `Permission denied (publickey)` remote errors.
- Your commits show up as **"Unverified"** on GitHub because commit signing isn't configured for each specific identity.
- Global config changes break local project workflows.

**GitPersona** solves this once and for all with a lightweight local web dashboard and CLI. It manages your Git author attribution, SSH host aliases, commit signing, and local repository pins with zero external dependencies and zero cloud services.

---

## 💡 Why I Built This & Why I Use It (Author's Note)

> *"I originally built this tool out of sheer necessity for my own daily engineering work.
> 
> Like many developers, I manage multiple GitHub accounts on a single workstation—my day job/work repositories, personal open-source projects, and client codebases. Constantly switching between them was an absolute headache:
> - I would accidentally push corporate commits with my personal email, or personal commits with my work email.
> - Juggling multiple SSH keys inevitably caused `Permission denied (publickey)` errors at the worst possible times.
> - Commits would show up as **Unverified** on GitHub because GPG/SSH commit signing wasn't configured per-identity.
> - Manually editing global `.gitconfig` or `.ssh/config` was tedious and fragile.
>
> I built **GitPersona** to solve these exact problems once and for all. It lets me pin identities directly to repositories so I never commit under the wrong email again, verify SSH connections before pushing, and sign every commit cleanly.
>
> **It is 100% free and open source.** Since it completely streamlined my workflow and saved me countless hours of config debugging, I'm publishing it so other developers facing the same multi-account pain can use it too."*
> 
> — **Moiz Khan** ([@mkmoiz](https://github.com/mkmoiz))

---

## ✨ Features

- **⚡ 1-Click Identity Switching**: Updates global `user.name`, `user.email`, and `core.sshCommand` together atomically.
- **🔐 Native SSH Commit Signing**: Configures `gpg.format = ssh`, `user.signingkey`, and `commit.gpgsign` so your commits display GitHub's green **Verified** badge.
- **📂 Local Repository Scanner & Pinning**: Detects local repositories across your machine, highlights mismatches, and locks identities into `.git/config` with one click. Pinned repositories are immune to global account switches.
- **🔑 Ed25519 Key Generation**: Generates modern Ed25519 keys locally with optional passphrases and owner-only (`0600`) permissions.
- **✅ Live GitHub Connection Testing**: Runs `ssh -T` through account host aliases to verify the exact GitHub username authenticated before you push.
- **🛡️ Automated Snapshots & 1-Click Rollback**: Automatically backs up your Git and SSH configs before every mutation, with instant 1-click restore from the UI.
- **🚀 Zero Dependencies**: Runs entirely on the Python 3.10+ standard library and vanilla JavaScript/CSS. Instant startup, under 20MB RAM, no `pip install` or `node_modules` required.
- **🔒 Privacy by Design**: Binds exclusively to loopback (`127.0.0.1`), enforces per-process mutation tokens, and never transmits or stores private keys.

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10 or newer
- Git
- OpenSSH (`ssh`, `ssh-keygen`)

### Option A: Install globally (Recommended)
```sh
git clone https://github.com/mkmoiz/githubPersona.git
cd githubPersona
./scripts/install.sh
```
This creates:
- `~/.local/bin/gitpersona` (available anywhere in your terminal)
- `~/.local/share/applications/gitpersona.desktop` (launches from your application menu)

Now simply run:
```sh
gitpersona
```

### Option B: Run directly
```sh
./scripts/start-ui.sh
```
Open **http://127.0.0.1:7463** in your browser. (Pass `--port 7464` if port 7463 is in use).

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
```sh
git remote add origin git@github-work:organization/repository.git
```

---

## 🧪 Testing & Verification

GitPersona comes with a comprehensive automated test suite testing atomic file operations, lock handling, SSH alias preservation, key generation, and HTTP security headers:

```sh
python3 -m unittest discover -s tests -v
node --check static/app.js
```

All tests execute in isolated temporary environments and never modify your personal keys or Git configuration.

---

## 🛡️ Security Architecture

- **Loopback isolation**: Server binds strictly to `127.0.0.1`. Requests with foreign `Host` or `Origin` headers are immediately rejected (HTTP 403).
- **CSRF Token protection**: Every mutation (saving, switching, pinning, deleting) requires a per-process cryptographic token (`X-Operator-Token`).
- **Atomic updates & locks**: Uses Git's config locking protocol and atomic replacement (`os.replace`) to prevent configuration corruption.
- **Private key protection**: Private key bytes are never read into browser memory or stored in profiles. Key generation communicates with `ssh-keygen` via stdin pipes.
- **Zero telemetry**: No external CDNs, fonts, tracking, analytics, or cloud connections.

---

## 📄 License

Distributed under the [MIT License](LICENSE). 100% Free and Open Source.

Created with care by **Moiz Khan** ([@mkmoiz](https://github.com/mkmoiz)).
