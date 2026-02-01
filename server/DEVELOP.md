# Development

## Auto-reload on file changes (cargo watch)

### 1. Install the binary (once)

```bash
cargo install cargo-watch
```

This puts `cargo-watch` in `~/.cargo/bin`. Ensure that directory is in your `PATH`.

### 2. Run from the server directory

```bash
cd /path/to/blogApp/server
cargo watch -x run
```

### 3. If changes don’t trigger a restart

Use explicit watch paths (recommended on macOS):

```bash
cargo watch -w src -w Cargo.toml -x run
```

Or call the binary directly (if `cargo watch` says “no such command”):

```bash
cargo-watch -w src -w Cargo.toml -x run
```

### 4. Optional

- Ignore `.http` files so editing requests doesn’t restart the server:
  ```bash
  cargo watch -w src -w Cargo.toml -x run --ignore '*.http'
  ```
- Run tests after each run: `cargo watch -w src -w Cargo.toml -x run -x test`
