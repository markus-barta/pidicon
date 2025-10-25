{ pkgs, lib, config, inputs, ... }:

{
  # https://devenv.sh/languages/
   languages.javascript.enable = true;
   languages.javascript.npm.enable = true;
   languages.javascript.package = pkgs.nodejs_24;

  # Packages: Add Cursor for CLI + editor support
  packages = [
    pkgs.code-cursor  # Cursor AI editor + CLI agent (from nixpkgs-unstable)
  ];

  env.PIDICON_STATE_DIR = "$HOME/.pidicon";

  enterShell = ''
    mkdir -p "$HOME/.pidicon"
  '';


  # See full reference at https://devenv.sh/reference/options/
}
