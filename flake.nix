{
  description = "Pidicon development environment (Devenv + Flakes)";

  inputs = {
    nixpkgs.url = "nixpkgs/nixpkgs-unstable";
    devenv.url = "github:cachix/devenv";
  };

  nixConfig.allow-dirty = true;

  outputs = { self, nixpkgs, devenv, ... }@inputs:
    let
      system = "x86_64-darwin";
      pkgs = import nixpkgs {
        inherit system;
        config = {
          allowUnfree = true;
          allowUnfreePredicate = pkg: let
            name = builtins.parseDrvName (builtins.getName pkg);
          in name.name == "cursor" || name.name == "code-cursor";
        };
      };
    in
      devenv.mkShell {
        inherit inputs pkgs;
        modules = [
          ./devenv.nix
        ];
      };
}
