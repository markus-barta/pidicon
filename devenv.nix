{ pkgs, lib, config, inputs, ... }:

{
  # https://devenv.sh/languages/
   languages.javascript.enable = true;
   languages.javascript.npm.enable = true;
   languages.javascript.package = pkgs.nodejs_24;

  env.PIDICON_STATE_DIR = "$HOME/.pidicon";

  enterShell = ''
    mkdir -p "$HOME/.pidicon"
  '';


  # See full reference at https://devenv.sh/reference/options/
}
