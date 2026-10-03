import http.client
import json
import os
from pathlib import Path
import shlex
import subprocess
import tempfile
import threading
import unittest
from unittest.mock import patch

from app import AppError, Operator, Server


class OperatorTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="github-operator-test-")
        self.addCleanup(self.temp.cleanup)
        self.home = Path(self.temp.name)
        self.ssh = self.home / ".ssh"
        self.ssh.mkdir(mode=0o700)
        self.key = self.ssh / "work key ' $literal"
        subprocess.run(["ssh-keygen", "-q", "-t", "ed25519", "-N", "", "-f", str(self.key)], check=True)
        self.env = {"PATH": os.environ["PATH"], "HOME": str(self.home), "XDG_CONFIG_HOME": str(self.home / ".config"), "GIT_CONFIG_NOSYSTEM": "1"}
        self.app = Operator(self.home / "data", self.home, self.env)

    def save(self, **overrides):
        return self.app.save({"label": "Work", "name": "Work Developer", "email": "work@example.com", "key": str(self.key), **overrides})

    def test_generate_key_can_be_linked_and_activated_without_changing_git_first(self):
        before = self.app.values()
        key = self.app.generate_key({"filename": "id_github_new", "email": "new@example.com"})
        private = Path(key["path"])
        public = Path(str(private) + ".pub")
        self.assertTrue(key["public_key"].startswith("ssh-ed25519 "))
        self.assertTrue(key["public_key"].endswith("new@example.com"))
        self.assertEqual(key["public_key"], public.read_text().strip())
        self.assertEqual(private.stat().st_mode & 0o777, 0o600)
        self.assertEqual(public.stat().st_mode & 0o777, 0o644)
        self.assertEqual(self.app.values(), before)
        self.assertEqual(self.app.read_profiles(), [])
        self.assertIn(str(private), [k["path"] for k in self.app.status()["keys"]])
        profile = self.save(key=str(private))
        self.app.activate(profile["id"])
        self.assertTrue(self.app.status()["profiles"][0]["active"])

    def test_generated_passphrase_protects_private_key_and_is_not_returned_or_stored(self):
        phrase = "temporary test phrase — only tests"
        key = self.app.generate_key({"filename": "id_encrypted", "email": "new@example.com", "passphrase": phrase})
        self.assertTrue(key["encrypted"])
        denied = subprocess.run(["ssh-keygen", "-y", "-P", "", "-f", key["path"]], capture_output=True)
        self.assertNotEqual(denied.returncode, 0)
        unlocked = subprocess.run(["ssh-keygen", "-y", "-P", phrase, "-f", key["path"]], capture_output=True, text=True)
        self.assertEqual(unlocked.returncode, 0)
        self.assertEqual(unlocked.stdout.split()[:2], key["public_key"].split()[:2])
        self.assertNotIn(phrase, json.dumps(key))
        self.assertNotIn(phrase, json.dumps(self.app.status()))
        self.assertFalse(self.app.profile_file.exists())
        self.assertEqual(list(self.ssh.glob(".operator-key-*")), [])

    def test_generation_refuses_collisions_invalid_names_and_symlinks(self):
        key = self.app.generate_key({"filename": "id_taken", "email": "a@example.com"})
        original = Path(key["path"]).read_bytes()
        with self.assertRaisesRegex(AppError, "already exists"):
            self.app.generate_key({"filename": "id_taken", "email": "b@example.com"})
        self.assertEqual(Path(key["path"]).read_bytes(), original)
        (self.ssh / "id_link").symlink_to(self.home / "missing")
        (self.ssh / "id_public.pub").write_text("existing public key")
        for name in ("id_link", "id_public"):
            with self.assertRaisesRegex(AppError, "already exists"):
                self.app.generate_key({"filename": name, "email": "a@example.com"})
        for name in ("../outside", "id_../../outside", "config", "id_key.pub", "id_$(command)", "id_key\nother"):
            with self.assertRaisesRegex(AppError, "filename"):
                self.app.generate_key({"filename": name, "email": "a@example.com"})
        for phrase in ("bad\ninput", "bad\x00input", "tiny", "é" * 300):
            with self.assertRaisesRegex(AppError, "passphrase"):
                self.app.generate_key({"filename": "id_invalid", "email": "a@example.com", "passphrase": phrase})
        self.assertFalse((self.ssh / "id_invalid").exists())

    def test_generation_handles_a_public_file_race_without_overwriting_it(self):
        real_link = os.link

        def concurrent_public_file(source, target):
            if str(target).endswith(".pub"):
                Path(target).write_text("concurrent file")
            return real_link(source, target)

        with patch("app.os.link", side_effect=concurrent_public_file):
            with self.assertRaisesRegex(AppError, "already exists"):
                self.app.generate_key({"filename": "id_race", "email": "a@example.com"})
        self.assertFalse((self.ssh / "id_race").exists())
        self.assertEqual((self.ssh / "id_race.pub").read_text(), "concurrent file")
        self.assertEqual(list(self.ssh.glob(".operator-key-*")), [])

    def test_private_key_mislabeled_pub_is_never_returned(self):
        Path(str(self.key) + ".pub").write_bytes(self.key.read_bytes())
        key = self.app.key_info(self.key)
        self.assertIsNone(key["public_key"])
        self.assertNotIn("PRIVATE KEY", json.dumps(self.app.status()))

    def test_discovery_only_returns_private_keys_and_public_metadata(self):
        (self.ssh / "config").write_text("Host github.com\n  User git\n")
        state = self.app.status()
        self.assertEqual(len(state["keys"]), 1)
        key = state["keys"][0]
        self.assertTrue(key["available"])
        self.assertEqual(key["algorithm"], "ED25519")
        self.assertTrue(key["fingerprint"].startswith("SHA256:"))
        self.assertTrue(key["public_key"].startswith("ssh-ed25519 "))
        self.assertNotIn("PRIVATE KEY", json.dumps(state))

    def test_accounts_get_distinct_ssh_hosts_and_preserve_existing_config(self):
        ssh_config = self.ssh / "config"
        original = "Host mac\n    HostName 192.168.50.2\n    User tester\n"
        ssh_config.write_text(original)
        first = self.save(label="Work Account")
        second_key = self.ssh / "second"
        subprocess.run(["ssh-keygen", "-q", "-t", "ed25519", "-N", "", "-f", str(second_key)], check=True)
        second = self.save(label="Work Account!", email="second@example.com", key=str(second_key))
        self.assertEqual(first["host"], "github-work-account")
        self.assertEqual(second["host"], "github-work-account-2")
        config = ssh_config.read_text()
        self.assertTrue(config.startswith("# >>> github-operator managed accounts >>>"))
        self.assertIn("Host github-work-account\n", config)
        self.assertIn("Host github-work-account-2\n", config)
        self.assertIn(original, config)
        resolved = subprocess.run(["ssh", "-G", second["host"], "-F", str(ssh_config)], capture_output=True, text=True, check=True).stdout
        self.assertIn("hostname github.com\n", resolved)
        self.assertIn("hostkeyalias github.com\n", resolved)
        self.assertIn(f"identityfile {second_key}\n", resolved)
        backups = list((self.app.data_dir / "backups").glob("ssh-config-*"))
        self.assertTrue(any(path.read_text() == original for path in backups))
        self.app.delete(first["id"])
        config = ssh_config.read_text()
        self.assertNotIn("Host github-work-account\n", config)
        self.assertIn("Host github-work-account-2\n", config)
        self.assertIn(original, config)

    def test_prepare_origins_migrates_an_existing_profile_once(self):
        profile = {"id": "old-profile", "label": "Personal", "name": "Person", "email": "p@example.com", "key": str(self.key)}
        self.app.data_dir.mkdir()
        self.app.profile_file.write_text(json.dumps([profile]))
        self.app.prepare_origins()
        migrated = self.app.read_profiles()[0]
        self.assertEqual(migrated["host"], "github-personal")
        self.assertIn("Host github-personal\n", (self.ssh / "config").read_text())
        backups_before = list((self.app.data_dir / "backups").glob("ssh-config-*"))
        self.app.prepare_origins()
        self.assertEqual(list((self.app.data_dir / "backups").glob("ssh-config-*")), backups_before)

    def test_broken_managed_ssh_markers_do_not_change_profiles(self):
        (self.ssh / "config").write_text("# >>> github-operator managed accounts >>>\nHost broken\n")
        with self.assertRaisesRegex(AppError, "incomplete or duplicated"):
            self.save()
        self.assertFalse(self.app.profile_file.exists())

    def test_verify_profile_reports_authenticated_github_username(self):
        profile = self.save()
        success = subprocess.CompletedProcess(["ssh"], 1, "", "Hi work-user! You've successfully authenticated, but GitHub does not provide shell access.\n")
        with patch("app.run", return_value=success) as command:
            result = self.app.verify_profile(profile["id"])
        self.assertTrue(result["ok"])
        self.assertEqual(result["username"], "work-user")
        self.assertEqual(result["host"], profile["host"])
        args = command.call_args.args[0]
        self.assertEqual(args[0:2], ["ssh", "-T"])
        self.assertIn(f"git@{profile['host']}", args)

    def test_verify_profile_explains_rejected_key(self):
        profile = self.save()
        failure = subprocess.CompletedProcess(["ssh"], 255, "", "git@github.com: Permission denied (publickey).\n")
        with patch("app.run", return_value=failure):
            with self.assertRaisesRegex(AppError, "GitHub rejected this key"):
                self.app.verify_profile(profile["id"])

    def test_switch_two_accounts_and_detect_external_changes(self):
        config = self.home / ".gitconfig"
        original = b"# retain this comment\n[core]\n\teditor = vim\n[user]\n\tname = Before\n\temail = before@example.com\n"
        config.write_bytes(original)
        work = self.save()
        second_key = self.ssh / "personal"
        subprocess.run(["ssh-keygen", "-q", "-t", "ed25519", "-N", "", "-f", str(second_key)], check=True)
        personal = self.save(label="Personal", name="Personal Developer", email="personal@example.com", key=str(second_key))
        self.assertEqual(self.app.values()["user.name"], "Before")
        result = self.app.activate(work["id"])
        self.assertEqual(Path(result["backup"]).read_bytes(), original)
        self.assertEqual(Path(result["backup"]).stat().st_mode & 0o777, 0o600)
        self.assertEqual(self.app.values()["user.name"], "Work Developer")
        self.assertEqual(shlex.split(self.app.values()["core.sshCommand"]), ["ssh", "-i", str(self.key), "-o", "IdentitiesOnly=yes"])
        self.assertIn("# retain this comment", config.read_text())
        self.assertEqual(self.app.git("--global", "--get", "core.editor").stdout.strip(), "vim")
        self.app.activate(personal["id"])
        profiles = self.app.status()["profiles"]
        self.assertEqual([p["label"] for p in profiles if p["active"]], ["Personal"])
        self.assertIn(str(second_key), self.app.values()["core.sshCommand"])
        self.app.git("--global", "user.email", "external@example.com")
        self.assertFalse(any(p["active"] for p in self.app.status()["profiles"]))

    def test_edits_require_activation_and_delete_leaves_key_and_config(self):
        profile = self.save()
        self.app.activate(profile["id"])
        self.save(id=profile["id"], name="Changed Name")
        self.assertEqual(self.app.values()["user.name"], "Work Developer")
        self.assertFalse(self.app.status()["profiles"][0]["active"])
        self.app.activate(profile["id"])
        self.assertEqual(self.app.values()["user.name"], "Changed Name")
        self.app.delete(profile["id"])
        self.assertTrue(self.key.exists())
        self.assertEqual(self.app.values()["user.name"], "Changed Name")
        self.assertEqual(self.app.read_profiles(), [])

    def test_failed_preparation_is_atomic(self):
        profile = self.save()
        config = self.home / ".gitconfig"
        original = b"[user]\n\tname = Original\n"
        config.write_bytes(original)
        real_git = self.app.git

        def fail_email(*args):
            if "--replace-all" in args and "user.email" in args:
                return subprocess.CompletedProcess(args, 1, "", "simulated write failure")
            return real_git(*args)

        with patch.object(self.app, "git", side_effect=fail_email):
            with self.assertRaisesRegex(AppError, "simulated write failure"):
                self.app.activate(profile["id"])
        self.assertEqual(config.read_bytes(), original)
        self.assertFalse(Path(str(config) + ".lock").exists())
        self.assertEqual(list(self.home.glob(".github-operator-*")), [])

    def test_respects_existing_git_lock(self):
        profile = self.save()
        lock = self.home / ".gitconfig.lock"
        lock.write_text("other process")
        with self.assertRaisesRegex(AppError, "locked"):
            self.app.activate(profile["id"])
        self.assertEqual(lock.read_text(), "other process")
        self.assertFalse((self.home / ".gitconfig").exists())

    def test_missing_and_insecure_keys_are_not_activated(self):
        profile = self.save()
        self.key.chmod(0o644)
        with self.assertRaisesRegex(AppError, "chmod 600"):
            self.app.activate(profile["id"])
        self.assertFalse(self.app.status()["keys"][0]["available"])
        self.key.unlink()
        with self.assertRaisesRegex(AppError, "does not exist"):
            self.app.activate(profile["id"])
        self.assertFalse((self.home / ".gitconfig").exists())

    def test_validation_and_corrupt_storage_are_non_destructive(self):
        with self.assertRaisesRegex(AppError, "private SSH key"):
            self.save(key=str(self.key) + ".pub")
        with self.assertRaisesRegex(AppError, "email"):
            self.save(email="bad email")
        self.save()
        with self.assertRaisesRegex(AppError, "already exists"):
            self.save(label="work")
        self.assertEqual(self.app.profile_file.stat().st_mode & 0o777, 0o600)
        self.app.profile_file.write_text("broken json")
        with self.assertRaisesRegex(AppError, "could not be read"):
            self.save(label="Personal")
        self.assertEqual(self.app.profile_file.read_text(), "broken json")

    def test_xdg_global_config_and_symlink_are_preserved(self):
        xdg = self.home / ".config/git/config"
        xdg.parent.mkdir(parents=True)
        xdg.write_text("[core]\n\teditor = nano\n")
        profile = self.save()
        self.app.activate(profile["id"])
        self.assertFalse((self.home / ".gitconfig").exists())
        self.assertEqual(self.app.values()["user.name"], "Work Developer")
        link = self.home / ".gitconfig"
        link.symlink_to(xdg)
        self.app.activate(profile["id"])
        self.assertTrue(link.is_symlink())
        self.assertIn("editor = nano", xdg.read_text())

    def test_custom_global_config_and_conflicting_include(self):
        custom = self.home / "custom-config"
        self.app.env["GIT_CONFIG_GLOBAL"] = str(custom)
        profile = self.save()
        self.app.activate(profile["id"])
        self.assertTrue(custom.exists())
        self.assertFalse((self.home / ".gitconfig").exists())
        included = self.home / "included"
        included.write_text("[user]\n\tname = Included Name\n")
        with custom.open("a") as stream:
            stream.write(f'[include]\n\tpath = {included}\n')
        original = custom.read_bytes()
        with self.assertRaisesRegex(AppError, "included Git config"):
            self.app.activate(profile["id"])
        self.assertEqual(custom.read_bytes(), original)

    def test_ssh_commit_signing_activation(self):
        profile = self.save(signing=True)
        self.app.activate(profile["id"])
        values = self.app.values()
        self.assertEqual(values["gpg.format"], "ssh")
        self.assertEqual(values["user.signingkey"], str(self.key) + ".pub")
        self.assertEqual(values["commit.gpgsign"], "true")
        self.assertTrue(self.app.status()["profiles"][0]["active"])
        # Switch to profile without signing
        second_key = self.ssh / "second_key"
        subprocess.run(["ssh-keygen", "-q", "-t", "ed25519", "-N", "", "-f", str(second_key)], check=True)
        profile_no_sign = self.save(label="NoSign", email="nosign@example.com", key=str(second_key), signing=False)
        self.app.activate(profile_no_sign["id"])
        values_after = self.app.values()
        self.assertEqual(values_after["commit.gpgsign"], "false")
        active = [p for p in self.app.status()["profiles"] if p["active"]]
        self.assertEqual(len(active), 1)
        self.assertEqual(active[0]["label"], "NoSign")

    def test_repository_scanning_and_pinning(self):
        repo_dir = self.home / "Projects" / "test_repo"
        repo_dir.mkdir(parents=True)
        subprocess.run(["git", "init", str(repo_dir)], check=True, capture_output=True)
        profile = self.save(signing=True)
        repos = self.app.scan_repositories()
        self.assertTrue(any(r["name"] == "test_repo" for r in repos))
        target_repo = next(r for r in repos if r["name"] == "test_repo")
        self.assertFalse(target_repo["is_pinned"])
        # Pin repository
        pinned = self.app.pin_repository(str(repo_dir), profile["id"])
        self.assertTrue(pinned["is_pinned"])
        self.assertEqual(pinned["local_name"], profile["name"])
        self.assertEqual(pinned["local_email"], profile["email"])
        self.assertTrue(pinned["signing"])
        # Unpin repository
        unpinned = self.app.unpin_repository(str(repo_dir))
        self.assertFalse(unpinned["is_pinned"])
        self.assertIsNone(unpinned["local_name"])

    def test_backup_listing_and_restoring(self):
        profile = self.save()
        res = self.app.activate(profile["id"])
        backups = self.app.list_backups()
        self.assertTrue(len(backups) >= 1)
        backup_id = Path(res["backup"]).name
        self.assertTrue(any(b["id"] == backup_id for b in backups))
        # Corrupt current config
        self.app.git("--global", "user.name", "Corrupted User")
        self.assertEqual(self.app.values()["user.name"], "Corrupted User")
        # Restore backup
        self.app.restore_backup(backup_id)
        # Verify restored
        self.assertNotEqual(self.app.values()["user.name"], "Corrupted User")


class HTTPTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        home = Path(self.temp.name)
        env = {"PATH": os.environ["PATH"], "HOME": str(home), "GIT_CONFIG_NOSYSTEM": "1", "XDG_CONFIG_HOME": str(home / ".config")}
        self.server = Server(("127.0.0.1", 0), Operator(home / "data", home, env))
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.addCleanup(self.stop)

    def stop(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()

    def request(self, method, path, body=None, headers=None):
        connection = http.client.HTTPConnection("127.0.0.1", self.server.server_port)
        try:
            connection.request(method, path, body, headers or {})
            response = connection.getresponse()
            return response.status, response.read(), dict(response.getheaders())
        finally:
            connection.close()

    def test_serves_ui_and_status_but_no_filesystem_paths(self):
        code, body, headers = self.request("GET", "/")
        self.assertEqual(code, 200)
        self.assertIn(b"GitPersona", body)
        self.assertIn(b"Clone an existing repository", body)
        self.assertEqual(headers["X-Frame-Options"], "DENY")
        code, body, _ = self.request("GET", "/api/status")
        self.assertEqual(code, 200)
        self.assertTrue(json.loads(body)["token"])
        self.assertEqual(self.request("GET", "/../app.py")[0], 404)

    def test_rejects_foreign_hosts_origins_and_missing_tokens(self):
        self.assertEqual(self.request("GET", "/api/status", headers={"Host": "evil.example"})[0], 403)
        self.assertEqual(self.request("GET", "/api/status", headers={"Origin": "https://evil.example"})[0], 403)
        self.assertEqual(self.request("GET", "/api/status", headers={"Sec-Fetch-Site": "cross-site"})[0], 403)
        self.assertEqual(self.request("POST", "/api/profiles/save", "{}", {"Content-Type": "application/json"})[0], 403)
        headers = {"Content-Type": "application/json", "X-Operator-Token": self.server.token}
        self.assertEqual(self.request("POST", "/api/profiles/save", "{}", headers)[0], 400)
        self.assertEqual(self.request("POST", "/api/profiles/save", "broken", headers)[0], 400)
        self.assertEqual(self.request("POST", "/api/profiles/activate", '{"id":"missing"}', headers)[0], 400)

    def test_generate_api_requires_token_and_returns_only_public_material(self):
        payload = json.dumps({"filename": "id_http_test", "email": "test@example.com", "passphrase": "test phrase"})
        headers = {"Content-Type": "application/json"}
        self.assertEqual(self.request("POST", "/api/keys/generate", payload, headers)[0], 403)
        self.assertFalse((self.server.operator.home / ".ssh").exists())
        headers["X-Operator-Token"] = self.server.token
        code, body, _ = self.request("POST", "/api/keys/generate", payload, headers)
        self.assertEqual(code, 200, body)
        result = json.loads(body)
        self.assertTrue(result["encrypted"])
        self.assertTrue(result["public_key"].startswith("ssh-ed25519 "))
        self.assertNotIn(b"PRIVATE KEY", body)
        self.assertNotIn(b"test phrase", body)
        self.assertEqual(self.request("POST", "/api/keys/generate", payload, headers)[0], 400)

    def test_repos_and_backups_api_endpoints(self):
        headers = {"Content-Type": "application/json", "X-Operator-Token": self.server.token}
        code, body, _ = self.request("GET", "/api/repos")
        self.assertEqual(code, 200)
        self.assertIsInstance(json.loads(body), list)
        code, body, _ = self.request("GET", "/api/backups")
        self.assertEqual(code, 200)
        self.assertIsInstance(json.loads(body), list)
        # Invalid scan request requires token
        self.assertEqual(self.request("POST", "/api/repos/scan", "{}", {})[0], 403)
        code, body, _ = self.request("POST", "/api/repos/scan", "{}", headers)
        self.assertEqual(code, 200)


if __name__ == "__main__":
    unittest.main()
