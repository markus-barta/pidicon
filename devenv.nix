{ pkgs, lib, config, inputs, ... }:

{
  languages.javascript.enable = true;
  languages.javascript.npm.enable = true;
  languages.javascript.package = pkgs.nodejs_24;

  packages = [
    pkgs.code-cursor
    pkgs.gh
  ];

  env.PIDICON_STATE_DIR = "$HOME/.pidicon";

  enterShell = ''
    mkdir -p "$HOME/.pidicon"
  '';
}
