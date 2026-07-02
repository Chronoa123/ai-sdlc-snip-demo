# snip-cli

Zero-dependency Node CLI for the Snip URL shortener. Requires Node 18+.

## Install

```sh
npm install -g .   # installs the 'snip' command globally
# or, without installing:
node cli.js <command>
```

## Commands

```sh
snip add <url>      # Shorten a URL — prints the short link
snip ls             # List all links (aligned table)
snip open <code>    # Open a short link in the default OS browser
snip help           # Usage
```

## Configuration

| Variable   | Default                 | Purpose          |
|------------|-------------------------|------------------|
| `SNIP_API` | `http://localhost:3000` | Backend base URL |

## Examples

```sh
$ snip add https://example.com/very/long/path
http://localhost:3000/aB3xY9

$ snip ls
CODE    HITS  URL
------  ----  ---------------------------
aB3xY9     3  https://example.com/very/long/path

$ snip open aB3xY9
Opening: https://example.com/very/long/path
```

## Wrappers

| File        | Use for            |
|-------------|--------------------|
| `snip`      | Unix / macOS shell |
| `snip.cmd`  | Windows CMD        |
| `snip.ps1`  | PowerShell         |
