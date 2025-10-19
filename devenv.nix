{ pkgs, lib, config, inputs, ... }:

{
  # https://devenv.sh/languages/
   languages.javascript.enable = true;
   languages.javascript.npm.enable = true;
   languages.javascript.package = pkgs.nodejs_24;


  # See full reference at https://devenv.sh/reference/options/
}
