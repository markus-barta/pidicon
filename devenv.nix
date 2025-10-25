{ pkgs, lib, config, inputs, ... }:

{
  # https://devenv.sh/languages/
  languages.javascript.enable = true;
  languages.javascript.npm.enable = true;
  languages.javascript.package = pkgs.nodejs_24;

  # Packages: Cursor + GitHub CLI
  packages = [
    pkgs.code-cursor  # Cursor AI editor + CLI agent
    pkgs.gh           # GitHub CLI (gh)
  ];

  # Allow unfree (for Cursor—nest under nixpkgs.config)
  nixpkgs.config.allowUnfree = true;

  env.PIDICON_STATE_DIR = "$HOME/.pidicon";

  enterShell = ''
    mkdir -p "$HOME/.pidicon"
    # Optional: Auth gh on first entry (or run `gh auth login` manually)
    # gh auth status || gh auth login --git-protocol https
  '';

  # See full reference at https://devenv.sh/reference/options/
}

